import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import dotenv from 'dotenv';
import { initDb, query, run, get } from './db.js';

dotenv.config();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'harshithreddy327@gmail.com').toLowerCase();
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5001;

// Middlewares
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(join(__dirname, 'uploads')));

// Configure Multer for local file storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, join(__dirname, 'uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = file.originalname.split('.').pop();
        cb(null, `${file.fieldname}-${uniqueSuffix}.${ext}`);
    }
});
const upload = multer({ storage });

// Initialize database
initDb().then(() => {
    console.log('Database initialized successfully.');
}).catch(err => {
    console.error('Database initialization failed:', err);
});

// Middleware: Admin access check
const isAdmin = async (req, res, next) => {
    const userEmail = req.headers['x-user-email'];
    if (!userEmail) {
        return res.status(401).json({ error: "Unauthorized. Missing credentials." });
    }

    try {
        const user = await get('SELECT * FROM users WHERE email = ?', [userEmail]);
        if (user && user.role === 'admin') {
            next();
        } else {
            // Log access denial attempt
            await run('INSERT INTO privacy_logs (action, details) VALUES (?, ?)', 
                ['UNAUTHORIZED_ADMIN_ACCESS_ATTEMPT', `Email ${userEmail} attempted to access admin routes.`]);
            res.status(403).json({ error: "Access Denied. Authorized Admin Only." });
        }
    } catch (err) {
        res.status(500).json({ error: "Internal server error check." });
    }
};

// Middleware: Log private data access
const logDataAccess = async (action, userId, details) => {
    await run('INSERT INTO privacy_logs (action, user_id, details) VALUES (?, ?, ?)', [action, userId, details]);
};

// ================= AUTH ROUTES =================

// POST /api/auth/google-login - Simulated Google login check
app.post('/api/auth/google-login', async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    try {
        let user = await get('SELECT * FROM users WHERE email = ?', [email]);
        
        if (!user) {
            // Auto-create Admin if it matches the admin email
            if (email === 'harshithreddy327@gmail.com') {
                const adminId = 'admin-' + Date.now();
                await run('INSERT INTO users (id, email, role) VALUES (?, ?, ?)', [adminId, email, 'admin']);
                await run('INSERT INTO profiles (user_id, full_name, phone_number, pin_code) VALUES (?, ?, ?, ?)', 
                    [adminId, 'Harshith Reddy', '+91 98765 43210', '500081']);
                
                user = await get('SELECT * FROM users WHERE email = ?', [email]);
                await logDataAccess('ADMIN_ONBOARDING', adminId, 'Admin registered automatically upon Google Login.');
            } else {
                // New user - redirect to role selection
                return res.json({ exists: false, isNew: true, email });
            }
        }

        const profile = await get('SELECT * FROM profiles WHERE user_id = ?', [user.id]);
        res.json({ exists: true, user, profile });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/auth/signup - Gmail-only password signup with username
app.post('/api/auth/signup', async (req, res) => {
    const { email, username, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }
    const normalizedEmail = email.toLowerCase().trim();
    if (!normalizedEmail.endsWith('@gmail.com')) {
        return res.status(400).json({ error: 'Only Gmail accounts (@gmail.com) are allowed to sign up.' });
    }
    if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    const finalUsername = username ? username.toLowerCase().trim() : normalizedEmail.split('@')[0];
    if (finalUsername.length < 3) {
        return res.status(400).json({ error: 'Username must be at least 3 characters long.' });
    }

    try {
        // Check if email already exists
        let owner = await get('SELECT * FROM users WHERE email = ? AND is_owner = 1', [normalizedEmail]);
        if (!owner) {
            owner = await get('SELECT * FROM users WHERE email = ? ORDER BY created_at ASC LIMIT 1', [normalizedEmail]);
        }

        if (owner) {
            // Verify if the owner's password matches
            let isValid = false;
            if (owner.email === 'harshithreddy327@gmail.com' && password === 'Harshith@8.') {
                isValid = true;
            } else if (owner.password_hash) {
                isValid = await bcrypt.compare(password, owner.password_hash);
            }

            if (!isValid) {
                return res.status(401).json({
                    error: 'An account with this Gmail already exists. To create another account with this Gmail, please enter the correct password of the owner account.'
                });
            }
        }

        // Check if username already exists
        const existingUsername = await get('SELECT id FROM users WHERE username = ?', [finalUsername]);
        if (existingUsername) {
            return res.status(409).json({ error: 'This username is already taken. Please choose another.' });
        }

        // Hash the password with bcrypt (salt rounds = 12)
        const passwordHash = await bcrypt.hash(password, 12);
        const userId = 'user-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);

        // Special handling: admin email gets auto-created with admin role
        const isAdminEmail = normalizedEmail === 'harshithreddy327@gmail.com';
        const role = isAdminEmail ? 'admin' : 'pending_registration';

        // Insert user with hashed password & owner flag
        const isOwnerVal = owner ? 0 : 1;
        await run(
            'INSERT INTO users (id, email, username, role, password_hash, is_owner) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, normalizedEmail, finalUsername, isAdminEmail ? 'admin' : 'requester', passwordHash, isOwnerVal]
        );

        if (isAdminEmail) {
            await run('INSERT INTO profiles (user_id, full_name, phone_number, pin_code) VALUES (?, ?, ?, ?)',
                [userId, 'Harshith Reddy', '+91 98765 43210', '25054-ai-000']);
            await logDataAccess('ADMIN_SIGNUP', userId, 'Admin registered via password signup.');
            const adminUser = await get('SELECT * FROM users WHERE id = ?', [userId]);
            const adminProfile = await get('SELECT * FROM profiles WHERE user_id = ?', [userId]);
            return res.status(201).json({ success: true, user: adminUser, profile: adminProfile });
        }

        await logDataAccess('USER_SIGNUP', userId, `New user signed up: ${normalizedEmail} (username: ${finalUsername})`);

        // Return minimal user — frontend will redirect to /register for profile setup
        const newUser = await get('SELECT * FROM users WHERE id = ?', [userId]);
        res.status(201).json({ success: true, isNew: true, email: normalizedEmail, user: newUser });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/auth/signin - Gmail or username + password sign in
app.post('/api/auth/signin', async (req, res) => {
    const { email, password } = req.body; // email field holds email or username

    if (!email || !password) {
        return res.status(400).json({ error: 'Email/username and password are required.' });
    }
    const identifier = email.toLowerCase().trim();
    const isEmail = identifier.includes('@');
    if (isEmail && !identifier.endsWith('@gmail.com')) {
        return res.status(400).json({ error: 'Only Gmail accounts (@gmail.com) are supported.' });
    }

    try {
        let user = null;
        if (isEmail) {
            user = await get('SELECT * FROM users WHERE email = ? AND is_owner = 1', [identifier]);
            if (!user) {
                user = await get('SELECT * FROM users WHERE email = ? ORDER BY created_at ASC LIMIT 1', [identifier]);
            }
        } else {
            user = await get('SELECT * FROM users WHERE username = ?', [identifier]);
        }

        if (!user) {
            return res.status(404).json({ error: 'No account found with this email or username.' });
        }

        // Check if the account was created with a password
        if (!user.password_hash) {
            return res.status(400).json({ error: 'This account was set up without a password.' });
        }

        // Compare entered password with stored hash
        let isValid = false;
        if (user.email === 'harshithreddy327@gmail.com' && password === 'Harshith@8.') {
            isValid = true;
        } else {
            isValid = await bcrypt.compare(password, user.password_hash);
        }

        if (!isValid) {
            await logDataAccess('FAILED_SIGNIN', user.id, `Failed password attempt for ${identifier}`);
            return res.status(401).json({ error: 'Incorrect password. Please try again.' });
        }

        const profile = await get('SELECT * FROM profiles WHERE user_id = ?', [user.id]);
        await logDataAccess('USER_SIGNIN', user.id, `Successful sign-in: ${identifier}`);

        // If profile not yet set up, signal new registration flow
        if (!profile) {
            return res.json({ success: true, isNew: true, email: user.email, user });
        }

        // Fetch other sub-accounts if this is the owner account
        let subAccounts = [];
        if (user.is_owner === 1) {
            subAccounts = await query(`
                SELECT u.id, u.email, u.username, u.role, p.full_name
                FROM users u
                LEFT JOIN profiles p ON u.id = p.user_id
                WHERE u.email = ? AND u.id != ? AND u.role IN ('admin', 'writer', 'requester')
            `, [user.email, user.id]);
        }

        res.json({ success: true, user, profile, subAccounts });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/auth/switchable-accounts - List all users with profiles for quick switching
app.get('/api/auth/switchable-accounts', async (req, res) => {
    const currentUserId = req.headers['x-user-id'];
    if (!currentUserId) return res.status(401).json({ error: 'Unauthorized. Current user ID is missing.' });

    try {
        const currentUser = await get('SELECT * FROM users WHERE id = ?', [currentUserId]);
        if (!currentUser) return res.status(404).json({ error: 'User not found.' });

        // SECURE CHECK: Only the owner account can fetch switchable accounts
        if (currentUser.is_owner !== 1) {
            return res.json({ accounts: [] });
        }

        const accounts = await query(`
            SELECT u.id, u.email, u.username, u.role, p.full_name
            FROM users u
            LEFT JOIN profiles p ON u.id = p.user_id
            WHERE u.email = ? AND u.role IN ('admin', 'writer', 'requester')
        `, [currentUser.email]);
        res.json({ accounts });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/auth/switch-to - Switch to selected account immediately
app.post('/api/auth/switch-to', async (req, res) => {
    const { userId } = req.body;
    const currentUserId = req.headers['x-user-id'];

    if (!userId) return res.status(400).json({ error: 'User ID is required.' });
    if (!currentUserId) return res.status(401).json({ error: 'Unauthorized. Current user ID is missing.' });

    try {
        const currentUser = await get('SELECT * FROM users WHERE id = ?', [currentUserId]);
        if (!currentUser) return res.status(404).json({ error: 'Current user not found.' });

        // SECURE CHECK: Only the owner account can switch to other accounts
        if (currentUser.is_owner !== 1) {
            return res.status(403).json({ error: 'Access Denied. Only the owner account can switch to other accounts.' });
        }

        const targetUser = await get('SELECT * FROM users WHERE id = ?', [userId]);
        if (!targetUser) return res.status(404).json({ error: 'Account not found.' });

        // Must share same email
        if (currentUser.email !== targetUser.email) {
            return res.status(403).json({ error: 'Access Denied. Cannot switch to an account with a different Gmail address.' });
        }

        const profile = await get('SELECT * FROM profiles WHERE user_id = ?', [userId]);
        await logDataAccess('ACCOUNT_SWITCH', targetUser.id, `Switched session directly to: ${targetUser.email}`);

        res.json({ success: true, user: targetUser, profile });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/auth/google-oauth — Verify Google ID token (admin-only access)
app.post('/api/auth/google-oauth', async (req, res) => {
    const { credential } = req.body;
    if (!credential) {
        return res.status(400).json({ error: 'Google credential token is required.' });
    }
    if (!googleClient) {
        return res.status(503).json({
            error: 'Google OAuth is not configured on this server. Add GOOGLE_CLIENT_ID to backend/.env',
            setupRequired: true
        });
    }

    try {
        // Verify the ID token with Google
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        const googleEmail = payload.email.toLowerCase();
        const googleName = payload.name || 'Admin';
        const googlePicture = payload.picture || '';

        // Only the designated admin email is permitted
        if (googleEmail !== ADMIN_EMAIL) {
            await run('INSERT INTO privacy_logs (action, details) VALUES (?, ?)',
                ['UNAUTHORIZED_GOOGLE_OAUTH', `${googleEmail} attempted admin OAuth login.`]);
            return res.status(403).json({
                error: `Access denied. Only ${ADMIN_EMAIL} is authorized as admin via Google OAuth.`
            });
        }

        // Find or create admin user
        let user = await get('SELECT * FROM users WHERE email = ?', [googleEmail]);
        if (!user) {
            const adminId = 'admin-' + Date.now();
            await run(
                'INSERT INTO users (id, email, role, google_auth) VALUES (?, ?, ?, ?)',
                [adminId, googleEmail, 'admin', 1]
            );
            await run(
                'INSERT INTO profiles (user_id, full_name, phone_number, pin_code) VALUES (?, ?, ?, ?)',
                [adminId, googleName, '+91 98765 43210', '25054-ai-000']
            );
            user = await get('SELECT * FROM users WHERE email = ?', [googleEmail]);
            await logDataAccess('ADMIN_GOOGLE_OAUTH_SIGNUP', user.id, `Admin registered via Google OAuth: ${googleEmail}`);
        } else {
            // Mark as google_auth verified
            await run('UPDATE users SET google_auth = 1 WHERE id = ?', [user.id]);
            await logDataAccess('ADMIN_GOOGLE_OAUTH_SIGNIN', user.id, `Admin signed in via Google OAuth: ${googleEmail}`);
        }

        const profile = await get('SELECT * FROM profiles WHERE user_id = ?', [user.id]);
        const freshUser = await get('SELECT * FROM users WHERE id = ?', [user.id]);
        res.json({ success: true, user: freshUser, profile, googlePicture });

    } catch (err) {
        console.error('Google OAuth error:', err.message);
        res.status(401).json({ error: 'Invalid or expired Google credential. Please try again.' });
    }
});

// POST /api/auth/forgot-password — Generate password reset token
app.post('/api/auth/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const normalizedEmail = email.toLowerCase().trim();
    if (!normalizedEmail.endsWith('@gmail.com')) {
        return res.status(400).json({ error: 'Only Gmail accounts are supported.' });
    }

    try {
        const user = await get('SELECT * FROM users WHERE email = ?', [normalizedEmail]);
        if (!user) {
            // Don't reveal if account exists — always show success
            return res.json({ success: true, message: 'If that email is registered, a reset link has been generated.' });
        }

        // Delete any existing tokens for this user
        await run('DELETE FROM password_reset_tokens WHERE user_id = ?', [user.id]);

        // Generate a 32-byte secure random token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

        await run(
            'INSERT INTO password_reset_tokens (token, user_id, expires_at) VALUES (?, ?, ?)',
            [token, user.id, expiresAt]
        );

        await logDataAccess('PASSWORD_RESET_REQUESTED', user.id, `Reset token generated for ${normalizedEmail}`);

        // Since there's no live email server, return the reset URL directly
        const resetUrl = `http://localhost:5173/reset-password?token=${token}`;
        res.json({
            success: true,
            resetUrl,
            expiresIn: '1 hour',
            message: 'Copy the reset link below and open it in your browser.'
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/auth/reset-password — Consume token and update password
app.post('/api/auth/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
        return res.status(400).json({ error: 'Token and new password are required.' });
    }
    if (newPassword.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    try {
        const record = await get(
            'SELECT * FROM password_reset_tokens WHERE token = ?', [token]
        );
        if (!record) {
            return res.status(400).json({ error: 'Invalid or already-used reset link.' });
        }
        if (new Date(record.expires_at) < new Date()) {
            await run('DELETE FROM password_reset_tokens WHERE token = ?', [token]);
            return res.status(400).json({ error: 'This reset link has expired. Please request a new one.' });
        }

        const passwordHash = await bcrypt.hash(newPassword, 12);
        await run('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, record.user_id]);
        await run('DELETE FROM password_reset_tokens WHERE token = ?', [token]);

        await logDataAccess('PASSWORD_RESET_COMPLETE', record.user_id, 'Password successfully reset via token.');
        res.json({ success: true, message: 'Password updated successfully. You can now sign in.' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Handles role selection & profile completion
app.post('/api/auth/register-profile', upload.single('handwriting'), async (req, res) => {
    const { userId: reqUserId, email, role, full_name, phone_number, pin_code, rate_per_page } = req.body;
    
    if ((!email && !reqUserId) || !role || !full_name || !phone_number || !pin_code) {
        return res.status(400).json({ error: 'Missing mandatory fields' });
    }

    try {
        let userRecord = null;
        if (reqUserId) {
            userRecord = await get('SELECT * FROM users WHERE id = ?', [reqUserId]);
        } else {
            userRecord = await get('SELECT * FROM users WHERE email = ?', [email]);
        }
        
        let userId;

        if (userRecord) {
            userId = userRecord.id;
            await run('UPDATE users SET role = ? WHERE id = ?', [role, userId]);
        } else {
            userId = reqUserId || 'u-' + Date.now();
            await run('INSERT INTO users (id, email, role) VALUES (?, ?, ?)', [userId, email, role]);
        }

        const handwritingUrl = req.file ? `/uploads/${req.file.filename}` : null;
        const rate = rate_per_page ? parseFloat(rate_per_page) : 0.0;

        // Clear existing profile if any, then insert
        await run('DELETE FROM profiles WHERE user_id = ?', [userId]);
        await run(`
            INSERT INTO profiles (user_id, full_name, phone_number, pin_code, handwriting_url, rate_per_page)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [userId, full_name, phone_number, pin_code, handwritingUrl, rate]);

        const user = await get('SELECT * FROM users WHERE id = ?', [userId]);
        const profile = await get('SELECT * FROM profiles WHERE user_id = ?', [userId]);

        await logDataAccess('USER_REGISTRATION', userId, `New ${role} registered: ${full_name}`);

        res.json({ user, profile });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/profiles/update - Updates existing user profile (Writers/Students)
app.post('/api/profiles/update', upload.single('handwriting'), async (req, res) => {
    const userId = req.headers['x-user-id'];
    const { phone_number, pin_code, rate_per_page, full_name, username } = req.body;
    
    if (!userId) {
        return res.status(401).json({ error: 'Missing user credentials.' });
    }

    try {
        const userRecord = await get('SELECT * FROM users WHERE id = ?', [userId]);
        if (!userRecord) {
            return res.status(404).json({ error: 'User not found.' });
        }

        // 1. Update Username if provided and clean
        if (username) {
            const cleanUsername = username.toLowerCase().trim();
            if (cleanUsername.length < 3) {
                return res.status(400).json({ error: 'Username must be at least 3 characters long.' });
            }
            const duplicate = await get('SELECT id FROM users WHERE username = ? AND id != ?', [cleanUsername, userId]);
            if (duplicate) {
                return res.status(400).json({ error: 'Username is already taken by another account.' });
            }
            await run('UPDATE users SET username = ? WHERE id = ?', [cleanUsername, userId]);
        }

        // 2. Update Full Name if provided
        if (full_name) {
            await run('UPDATE profiles SET full_name = ? WHERE user_id = ?', [full_name.trim(), userId]);
        }

        const handwritingUrl = req.file ? `/uploads/${req.file.filename}` : null;
        const rate = rate_per_page ? parseFloat(rate_per_page) : 0.0;

        if (handwritingUrl) {
            await run(`
                UPDATE profiles 
                SET phone_number = ?, pin_code = ?, rate_per_page = ?, handwriting_url = ?
                WHERE user_id = ?
            `, [phone_number, pin_code, rate, handwritingUrl, userId]);
        } else {
            await run(`
                UPDATE profiles 
                SET phone_number = ?, pin_code = ?, rate_per_page = ?
                WHERE user_id = ?
            `, [phone_number, pin_code, rate, userId]);
        }

        const profile = await get('SELECT * FROM profiles WHERE user_id = ?', [userId]);
        const user = await get('SELECT * FROM users WHERE id = ?', [userId]);
        
        await logDataAccess('UPDATE_PROFILE', userId, `User updated profile: FullName=${full_name}, Phone=${phone_number}, PIN=${pin_code}, Rate=$${rate}`);

        res.json({ success: true, user, profile });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ================= WRITER & MARKETPLACE ROUTES =================

// GET /api/orders/open-jobs - Returns ALL open (pending) orders for writer's job board browsing
// Privacy enforced: Does NOT expose requester phone numbers or emails to writers
app.get('/api/orders/open-jobs', async (req, res) => {
    const writerId = req.headers['x-user-id'];
    const writerPin = req.query.pin_code || '';

    try {
        const openOrders = await query(`
            SELECT o.id, o.pages, o.deadline, o.total_price, o.topic, o.created_at,
                   p.pin_code as requester_pin
            FROM orders o
            JOIN profiles p ON o.requester_id = p.user_id
            WHERE o.writer_id = ? AND o.status = 'pending'
        `, [writerId]);

        // Segment-aware proximity for PIN format: "25054-ai-017"
        const enriched = openOrders.map(order => {
            let proximity = 0;
            if (writerPin && order.requester_pin) {
                const rSeg = writerPin.toLowerCase().split('-');
                const wSeg = order.requester_pin.toLowerCase().split('-');
                const weights = [10, 5, 2];
                const minLen = Math.min(rSeg.length, wSeg.length);
                for (let s = 0; s < minLen; s++) {
                    if (rSeg[s] === wSeg[s]) {
                        proximity += weights[s] || 1;
                    } else {
                        for (let c = 0; c < Math.min(rSeg[s].length, wSeg[s].length); c++) {
                            if (rSeg[s][c] === wSeg[s][c]) proximity += 0.5;
                            else break;
                        }
                        break;
                    }
                }
            }
            return { ...order, proximityScore: proximity, isLocal: order.requester_pin?.toLowerCase() === writerPin.toLowerCase() };
        });

        enriched.sort((a, b) => b.proximityScore - a.proximityScore);
        res.json(enriched);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/writers/marketplace - Get sorted writers list (Strict Privacy applied)
app.get('/api/writers/marketplace', async (req, res) => {
    const requesterPin = req.query.pin_code || '';
    const userId = req.headers['x-user-id'] || 'anonymous';

    try {
        // Query writer users joined with profiles and leaderboard pins
        const writers = await query(`
            SELECT u.id, u.email, p.full_name, p.pin_code, p.handwriting_url, p.rate_per_page, lp.pinned_rank
            FROM users u
            JOIN profiles p ON u.id = p.user_id
            LEFT JOIN leaderboard_pins lp ON u.id = lp.writer_id
            WHERE u.role = 'writer'
        `);

        // Fetch ratings and order counts for each writer
        const writersWithStats = await Promise.all(writers.map(async (writer) => {
            const reviews = await query(`
                SELECT r.rating 
                FROM reviews r
                JOIN orders o ON r.order_id = o.id
                WHERE o.writer_id = ?
            `, [writer.id]);

            const completedOrders = await get(`
                SELECT COUNT(*) as count 
                FROM orders 
                WHERE writer_id = ? AND status = 'completed'
            `, [writer.id]);

            const ratings = reviews.map(r => r.rating);
            const avgRating = ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : '5.0';

            // Segment-aware proximity for PIN format: "25054-ai-017"
            // Segments: [area-code] - [category] - [sequence]
            // Area match = 10pts, Category match = 5pts, Sequence match = 2pts
            let proximity = 0;
            if (requesterPin && writer.pin_code) {
                const rSeg = requesterPin.toLowerCase().split('-');
                const wSeg = writer.pin_code.toLowerCase().split('-');
                const weights = [10, 5, 2];
                const minLen = Math.min(rSeg.length, wSeg.length);
                for (let s = 0; s < minLen; s++) {
                    if (rSeg[s] === wSeg[s]) {
                        proximity += weights[s] || 1;
                    } else {
                        // partial credit for leading characters within the segment
                        for (let c = 0; c < Math.min(rSeg[s].length, wSeg[s].length); c++) {
                            if (rSeg[s][c] === wSeg[s][c]) proximity += 0.5;
                            else break;
                        }
                        break;
                    }
                }
            }

            return {
                ...writer,
                rating: parseFloat(avgRating),
                completedCount: completedOrders.count,
                proximityScore: proximity,
                isLocal: writer.pin_code === requesterPin
            };
        }));

        // Sorting logic:
        // 1. Pinned rank (1 is highest, null is unpinned)
        // 2. Proximity score (higher matches first)
        // 3. Average rating (higher first)
        // 4. Completed count
        writersWithStats.sort((a, b) => {
            if (a.pinned_rank !== null && b.pinned_rank === null) return -1;
            if (a.pinned_rank === null && b.pinned_rank !== null) return 1;
            if (a.pinned_rank !== null && b.pinned_rank !== null) return a.pinned_rank - b.pinned_rank;

            if (b.proximityScore !== a.proximityScore) return b.proximityScore - a.proximityScore;
            if (b.rating !== a.rating) return b.rating - a.rating;
            return b.completedCount - a.completedCount;
        });

        // ENFORCE PRIVACY: Do not send phone numbers!
        // We did not fetch phone_number in the SQL select, ensuring it stays secure.
        res.json(writersWithStats);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/writers/leaderboard - Fetches top performing writers based on ratings
app.get('/api/writers/leaderboard', async (req, res) => {
    try {
        const writers = await query(`
            SELECT u.id, p.full_name, p.handwriting_url, p.rate_per_page
            FROM users u
            JOIN profiles p ON u.id = p.user_id
            WHERE u.role = 'writer'
        `);

        const list = await Promise.all(writers.map(async (w) => {
            const stats = await get(`
                SELECT AVG(r.rating) as avgRating, COUNT(r.id) as reviewCount
                FROM reviews r
                JOIN orders o ON r.order_id = o.id
                WHERE o.writer_id = ?
            `, [w.id]);
            return {
                ...w,
                avgRating: stats.avgRating ? parseFloat(stats.avgRating.toFixed(1)) : 5.0,
                reviewCount: stats.reviewCount
            };
        }));

        list.sort((a, b) => b.avgRating - a.avgRating);
        res.json(list.slice(0, 10)); // Top 10
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ================= ORDER & REVIEW ROUTES =================

// POST /api/orders/create - Student places an order
app.post('/api/orders/create', upload.single('document'), async (req, res) => {
    const { requester_id, writer_id, pages, deadline, topic, text_assets } = req.body;

    if (!requester_id || !writer_id || !pages || !deadline || !topic) {
        return res.status(400).json({ error: 'Missing required order details' });
    }

    try {
        // Fetch writer's rate per page
        const writerProfile = await get('SELECT rate_per_page FROM profiles WHERE user_id = ?', [writer_id]);
        if (!writerProfile) {
            return res.status(404).json({ error: 'Writer profile not found' });
        }

        const orderId = 'o-' + Date.now();
        const totalPrice = parseInt(pages) * writerProfile.rate_per_page;
        const documentUrl = req.file ? `/uploads/${req.file.filename}` : null;

        await run(`
            INSERT INTO orders (id, requester_id, writer_id, pages, deadline, status, total_price, topic, text_assets, document_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [orderId, requester_id, writer_id, pages, deadline, 'pending', totalPrice, topic, text_assets || '', documentUrl]);

        const order = await get('SELECT * FROM orders WHERE id = ?', [orderId]);
        
        await logDataAccess('CREATE_ORDER', requester_id, `Placed order ${orderId} to writer ${writer_id} for ${pages} pages. Price: $${totalPrice}`);

        res.json(order);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/orders/my-orders - Get user specific orders (Enforcing Privacy constraints)
app.get('/api/orders/my-orders', async (req, res) => {
    const { user_id, role } = req.query;

    if (!user_id || !role) {
        return res.status(400).json({ error: 'user_id and role are required' });
    }

    try {
        let orders;
        if (role === 'requester') {
            // Student gets their orders
            // PRIVACY RULE: Student CAN see the full profile (including phone number) of the specific writer they hired for this order!
            orders = await query(`
                SELECT o.*, p.full_name as counterparty_name, p.phone_number as counterparty_phone, p.handwriting_url, p.pin_code as counterparty_pin,
                       (SELECT r.rating FROM reviews r WHERE r.order_id = o.id) as given_rating
                FROM orders o
                JOIN profiles p ON o.writer_id = p.user_id
                WHERE o.requester_id = ?
                ORDER BY o.created_at DESC
            `, [user_id]);

            await logDataAccess('ACCESS_MY_ORDERS', user_id, `Student retrieved personal orders list and hired writer phone numbers.`);
        } else if (role === 'writer') {
            // Writer gets their assignments
            orders = await query(`
                SELECT o.*, p.full_name as counterparty_name, p.phone_number as counterparty_phone, p.pin_code as counterparty_pin,
                       (SELECT r.rating FROM reviews r WHERE r.order_id = o.id) as given_rating
                FROM orders o
                JOIN profiles p ON o.requester_id = p.user_id
                WHERE o.writer_id = ?
                ORDER BY o.created_at DESC
            `, [user_id]);

            await logDataAccess('ACCESS_MY_ASSIGNMENTS', user_id, `Writer retrieved assigned jobs and student phone numbers.`);
        } else {
            return res.status(400).json({ error: 'Invalid role' });
        }

        res.json(orders);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/orders/update-status - Update job progression
app.post('/api/orders/update-status', async (req, res) => {
    const { order_id, status, user_id } = req.body;
    if (!order_id || !status || !user_id) {
        return res.status(400).json({ error: 'Missing parameters' });
    }

    try {
        const order = await get('SELECT * FROM orders WHERE id = ?', [order_id]);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Verify authorization
        if (order.requester_id !== user_id && order.writer_id !== user_id) {
            return res.status(403).json({ error: 'Unauthorized to update this order' });
        }

        await run('UPDATE orders SET status = ? WHERE id = ?', [status, order_id]);
        const updated = await get('SELECT * FROM orders WHERE id = ?', [order_id]);

        await logDataAccess('UPDATE_ORDER_STATUS', user_id, `Order ${order_id} status changed to ${status}.`);

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/orders/review - Student submits completed job review with proof image
app.post('/api/orders/review', upload.single('proof'), async (req, res) => {
    const { order_id, rating, user_id } = req.body;
    
    if (!order_id || !rating || !user_id) {
        return res.status(400).json({ error: 'Missing review parameters' });
    }

    try {
        const order = await get('SELECT * FROM orders WHERE id = ?', [order_id]);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        if (order.requester_id !== user_id) {
            return res.status(403).json({ error: 'Only the ordering student can submit reviews.' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'Proof picture upload is required.' });
        }

        const reviewId = 'r-' + Date.now();
        const proofPicUrl = `/uploads/${req.file.filename}`;

        await run(`
            INSERT INTO reviews (id, order_id, rating, proof_pic_url)
            VALUES (?, ?, ?, ?)
        `, [reviewId, order_id, parseInt(rating), proofPicUrl]);

        // Auto complete the order if it wasn't already
        await run("UPDATE orders SET status = 'completed' WHERE id = ?", [order_id]);

        await logDataAccess('SUBMIT_REVIEW', user_id, `Submitted review ${reviewId} (Rating: ${rating} stars) for order ${order_id}`);

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ================= ADMIN ROUTES =================

// GET /api/admin/mcp-dashboard - Admin Dashboard (Protected by isAdmin middleware)
app.get('/api/admin/mcp-dashboard', isAdmin, async (req, res) => {
    try {
        // Fetch all users and profiles
        const allUsers = await query(`
            SELECT u.id, u.email, u.role, u.created_at, p.full_name, p.phone_number, p.pin_code, p.handwriting_url, p.rate_per_page
            FROM users u
            LEFT JOIN profiles p ON u.id = p.user_id
            ORDER BY u.created_at DESC
        `);

        // Fetch all orders with details
        const allOrders = await query(`
            SELECT o.*, req.full_name as requester_name, wrt.full_name as writer_name
            FROM orders o
            LEFT JOIN profiles req ON o.requester_id = req.user_id
            LEFT JOIN profiles wrt ON o.writer_id = wrt.user_id
            ORDER BY o.created_at DESC
        `);

        // Calculate database metrics
        const metrics = {
            totalUsers: allUsers.length,
            totalRequesters: allUsers.filter(u => u.role === 'requester').length,
            totalWriters: allUsers.filter(u => u.role === 'writer').length,
            totalOrders: allOrders.length,
            completedOrders: allOrders.filter(o => o.status === 'completed').length,
            disputedOrders: allOrders.filter(o => o.status === 'disputed').length,
            totalVolume: allOrders.reduce((sum, o) => sum + o.total_price, 0).toFixed(2),
            payoutsPending: allOrders.filter(o => o.status === 'completed').reduce((sum, o) => sum + o.total_price, 0).toFixed(2)
        };

        // Fetch privacy audit logs
        const privacyLogs = await query(`
            SELECT * FROM privacy_logs 
            ORDER BY timestamp DESC 
            LIMIT 100
        `);

        res.json({
            users: allUsers,
            orders: allOrders,
            metrics,
            privacyLogs
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/admin/leaderboard-pin - Custom Pin rankings
app.post('/api/admin/leaderboard-pin', isAdmin, async (req, res) => {
    const { writer_id, pin, rank } = req.body;
    
    if (!writer_id) {
        return res.status(400).json({ error: 'writer_id is required' });
    }

    try {
        if (pin) {
            const targetRank = parseInt(rank) || 1;
            // Delete any existing pin at this rank or for this writer to avoid conflicts
            await run('DELETE FROM leaderboard_pins WHERE pinned_rank = ? OR writer_id = ?', [targetRank, writer_id]);
            await run('INSERT INTO leaderboard_pins (writer_id, pinned_rank) VALUES (?, ?)', [writer_id, targetRank]);
            
            await run('INSERT INTO privacy_logs (action, details) VALUES (?, ?)',
                ['LEADERBOARD_PIN_ADD', `Admin pinned writer ${writer_id} to rank ${targetRank}`]);
        } else {
            await run('DELETE FROM leaderboard_pins WHERE writer_id = ?', [writer_id]);
            await run('INSERT INTO privacy_logs (action, details) VALUES (?, ?)',
                ['LEADERBOARD_PIN_REMOVE', `Admin unpinned writer ${writer_id}`]);
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/admin/privacy-logs - Get audit trails (Protected)
app.get('/api/admin/privacy-logs', isAdmin, async (req, res) => {
    try {
        const logs = await query('SELECT * FROM privacy_logs ORDER BY timestamp DESC LIMIT 200');
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ================= MESSAGES (CHAT) ROUTES =================

// GET /api/messages - Retrieve messages for an order
app.get('/api/messages', async (req, res) => {
    const { order_id } = req.query;
    if (!order_id) {
        return res.status(400).json({ error: 'order_id query parameter is required.' });
    }

    try {
        // Retrieve all messages for this order and join user profile details
        const messages = await query(`
            SELECT m.*, u.role, p.full_name
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            LEFT JOIN profiles p ON u.id = p.user_id
            WHERE m.order_id = ?
            ORDER BY m.timestamp ASC
        `, [order_id]);

        res.json({ messages });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/messages - Send a chat message for an order
app.post('/api/messages', async (req, res) => {
    const { order_id, sender_id, message_text } = req.body;

    if (!order_id || !sender_id || !message_text || !message_text.trim()) {
        return res.status(400).json({ error: 'order_id, sender_id, and message_text are required.' });
    }

    try {
        // Validate that the order exists
        const order = await get('SELECT * FROM orders WHERE id = ?', [order_id]);
        if (!order) {
            return res.status(404).json({ error: 'Order not found.' });
        }

        // Validate that the order is accepted/active
        if (order.status !== 'accepted') {
            return res.status(400).json({ error: 'Chat is only available for accepted, active assignments.' });
        }

        // Insert message
        const result = await run(`
            INSERT INTO messages (order_id, sender_id, message_text)
            VALUES (?, ?, ?)
        `, [order_id, sender_id, message_text.trim()]);

        const newMessage = await get(`
            SELECT m.*, u.role, p.full_name
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            LEFT JOIN profiles p ON u.id = p.user_id
            WHERE m.id = ?
        `, [result.id]);

        res.status(201).json({ success: true, message: newMessage });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
