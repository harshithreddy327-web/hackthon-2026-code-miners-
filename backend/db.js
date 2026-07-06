import sqlite3 from 'sqlite3';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, 'database.sqlite');

// Ensure uploads folder exists
const uploadsDir = join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Create mock images if they don't exist
const createPlaceholderImage = (fileName, text) => {
    const filePath = join(uploadsDir, fileName);
    if (!fs.existsSync(filePath)) {
        // Just write a small mock text file or dummy image
        fs.writeFileSync(filePath, `Placeholder for ${text} image asset.`);
    }
};

createPlaceholderImage('mock_handwriting_1.png', 'Amit Sharma Handwriting Sample');
createPlaceholderImage('mock_handwriting_2.png', 'Sneha Patel Handwriting Sample');
createPlaceholderImage('mock_handwriting_3.png', 'Rajesh Kumar Handwriting Sample');
createPlaceholderImage('mock_handwriting_4.png', 'Priya Nair Handwriting Sample');
createPlaceholderImage('mock_proof_1.png', 'Physics Lab Report Proof');
createPlaceholderImage('mock_proof_2.png', 'Computer Science Notes Proof');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to SQLite database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

// Convert db runs/queries to promises
export const query = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

export const run = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve({ id: this.lastID, changes: this.changes });
        });
    });
};

export const get = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

export const initDb = async () => {
    // Enable foreign keys
    await run('PRAGMA foreign_keys = ON');

    // Migrations for existing databases
    try { await run('ALTER TABLE users ADD COLUMN password_hash TEXT'); } catch (_) {}
    try { await run('ALTER TABLE users ADD COLUMN google_auth INTEGER DEFAULT 0'); } catch (_) {}
    try { await run('ALTER TABLE users ADD COLUMN username TEXT'); } catch (_) {}
    try { await run('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)'); } catch (_) {}

    // Migration to support multiple accounts with the same Gmail (no unique constraint on email)
    try {
        const tableInfo = await query("PRAGMA table_info(users)");
        const hasIsOwner = tableInfo.some(col => col.name === 'is_owner');
        if (!hasIsOwner) {
            console.log('Running database migration: removing UNIQUE email constraint and adding is_owner...');
            await run('PRAGMA foreign_keys = OFF');
            await run('ALTER TABLE users RENAME TO users_old');
            await run(`
                CREATE TABLE users (
                    id TEXT PRIMARY KEY,
                    email TEXT NOT NULL,
                    username TEXT UNIQUE,
                    role TEXT CHECK(role IN ('requester', 'writer', 'admin')) NOT NULL,
                    password_hash TEXT,
                    google_auth INTEGER DEFAULT 0,
                    is_owner INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);
            await run(`
                INSERT INTO users (id, email, username, role, password_hash, google_auth, is_owner, created_at)
                SELECT id, email, username, role, password_hash, google_auth, 1, created_at FROM users_old
            `);
            await run('DROP TABLE users_old');
            await run('PRAGMA foreign_keys = ON');
            console.log('Database migration completed successfully.');
        }
    } catch (err) {
        console.error('Migration failed, but continuing:', err);
    }

    // Create Tables
    await run(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT NOT NULL,
            username TEXT UNIQUE,
            role TEXT CHECK(role IN ('requester', 'writer', 'admin')) NOT NULL,
            password_hash TEXT,
            google_auth INTEGER DEFAULT 0,
            is_owner INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await run(`
        CREATE TABLE IF NOT EXISTS profiles (
            user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            full_name TEXT NOT NULL,
            phone_number TEXT NOT NULL,
            pin_code TEXT NOT NULL,
            handwriting_url TEXT,
            rate_per_page REAL DEFAULT 0.0
        )
    `);

    await run(`
        CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY,
            requester_id TEXT REFERENCES users(id),
            writer_id TEXT REFERENCES users(id),
            pages INTEGER NOT NULL,
            deadline TEXT NOT NULL,
            status TEXT CHECK(status IN ('pending', 'accepted', 'completed', 'disputed')) DEFAULT 'pending',
            total_price REAL NOT NULL,
            topic TEXT NOT NULL,
            text_assets TEXT,
            document_url TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await run(`
        CREATE TABLE IF NOT EXISTS reviews (
            id TEXT PRIMARY KEY,
            order_id TEXT UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
            rating INTEGER CHECK(rating BETWEEN 1 AND 5) NOT NULL,
            proof_pic_url TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await run(`
        CREATE TABLE IF NOT EXISTS leaderboard_pins (
            writer_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            pinned_rank INTEGER NOT NULL UNIQUE
        )
    `);

    await run(`
        CREATE TABLE IF NOT EXISTS privacy_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            action TEXT NOT NULL,
            user_id TEXT,
            details TEXT NOT NULL
        )
    `);

    await run(`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
            token TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            expires_at DATETIME NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await run(`
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
            sender_id TEXT NOT NULL REFERENCES users(id),
            message_text TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Seed Data if Users table is empty
    const usersCount = await get('SELECT COUNT(*) as count FROM users');
    if (usersCount.count === 0) {
        console.log('Seeding database with mock data...');

        // 1. Admin
        await run('INSERT INTO users (id, email, username, role, password_hash, is_owner) VALUES (?, ?, ?, ?, ?, 1)', ['admin-1', 'harshithreddy327@gmail.com', 'admin', 'admin', '$2b$12$e0UGrrEByh9kZ8W.R21f3erwK46GvD6/gq7t1iHlB20v7hB/10Rmu']);
        await run('INSERT INTO profiles (user_id, full_name, phone_number, pin_code) VALUES (?, ?, ?, ?)', ['admin-1', 'Harshith Reddy', '+91 98765 43210', '00000-aa-00']);

        // 2. Writers  (PIN format: [area-code]-[category]-[sequence])
        await run('INSERT INTO users (id, email, username, role, password_hash, is_owner) VALUES (?, ?, ?, ?, ?, 1)', ['writer-1', 'writer1@gmail.com', 'amit_sharma', 'writer', '$2b$12$e0UGrrEByh9kZ8W.R21f3erwK46GvD6/gq7t1iHlB20v7hB/10Rmu']);
        await run('INSERT INTO profiles (user_id, full_name, phone_number, pin_code, handwriting_url, rate_per_page) VALUES (?, ?, ?, ?, ?, ?)', 
            ['writer-1', 'Amit Sharma', '+91 99999 11111', '00000-aa-00', '/uploads/mock_handwriting_1.png', 5.5]);

        await run('INSERT INTO users (id, email, username, role, password_hash, is_owner) VALUES (?, ?, ?, ?, ?, 1)', ['writer-2', 'writer2@gmail.com', 'sneha_patel', 'writer', '$2b$12$e0UGrrEByh9kZ8W.R21f3erwK46GvD6/gq7t1iHlB20v7hB/10Rmu']);
        await run('INSERT INTO profiles (user_id, full_name, phone_number, pin_code, handwriting_url, rate_per_page) VALUES (?, ?, ?, ?, ?, ?)', 
            ['writer-2', 'Sneha Patel', '+91 88888 22222', '25054-cs-032', '/uploads/mock_handwriting_2.png', 4.0]);

        await run('INSERT INTO users (id, email, username, role, password_hash, is_owner) VALUES (?, ?, ?, ?, ?, 1)', ['writer-3', 'writer3@gmail.com', 'rajesh_kumar', 'writer', '$2b$12$e0UGrrEByh9kZ8W.R21f3erwK46GvD6/gq7t1iHlB20v7hB/10Rmu']);
        await run('INSERT INTO profiles (user_id, full_name, phone_number, pin_code, handwriting_url, rate_per_page) VALUES (?, ?, ?, ?, ?, ?)', 
            ['writer-3', 'Rajesh Kumar', '+91 77777 33333', '36201-ec-008', '/uploads/mock_handwriting_3.png', 6.0]);

        await run('INSERT INTO users (id, email, username, role, password_hash, is_owner) VALUES (?, ?, ?, ?, ?, 1)', ['writer-4', 'writer4@gmail.com', 'priya_nair', 'writer', '$2b$12$e0UGrrEByh9kZ8W.R21f3erwK46GvD6/gq7t1iHlB20v7hB/10Rmu']);
        await run('INSERT INTO profiles (user_id, full_name, phone_number, pin_code, handwriting_url, rate_per_page) VALUES (?, ?, ?, ?, ?, ?)', 
            ['writer-4', 'Priya Nair', '+91 66666 44444', '25054-ai-041', '/uploads/mock_handwriting_4.png', 3.5]);

        // 3. Students (Requesters)
        await run('INSERT INTO users (id, email, username, role, password_hash, is_owner) VALUES (?, ?, ?, ?, ?, 1)', ['student-1', 'student1@gmail.com', 'karan_johar', 'requester', '$2b$12$e0UGrrEByh9kZ8W.R21f3erwK46GvD6/gq7t1iHlB20v7hB/10Rmu']);
        await run('INSERT INTO profiles (user_id, full_name, phone_number, pin_code) VALUES (?, ?, ?, ?)', 
            ['student-1', 'Karan Johar', '+91 90000 55555', '25054-ai-017']);

        await run('INSERT INTO users (id, email, username, role, password_hash, is_owner) VALUES (?, ?, ?, ?, ?, 1)', ['student-2', 'student2@gmail.com', 'riya_sen', 'requester', '$2b$12$e0UGrrEByh9kZ8W.R21f3erwK46GvD6/gq7t1iHlB20v7hB/10Rmu']);
        await run('INSERT INTO profiles (user_id, full_name, phone_number, pin_code) VALUES (?, ?, ?, ?)', 
            ['student-2', 'Riya Sen', '+91 80000 66666', '25054-cs-032']);

        // 4. Leaderboard Pins
        await run('INSERT INTO leaderboard_pins (writer_id, pinned_rank) VALUES (?, ?)', ['writer-1', 1]);
        await run('INSERT INTO leaderboard_pins (writer_id, pinned_rank) VALUES (?, ?)', ['writer-3', 2]);

        // 5. Orders
        // Order 1 (Completed)
        await run(`
            INSERT INTO orders (id, requester_id, writer_id, pages, deadline, status, total_price, topic, text_assets)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, ['order-1', 'student-1', 'writer-1', 10, '2026-07-10T12:00:00Z', 'completed', 55.0, 'Physics Lab Report', 'Ohm\'s Law experiment notes...']);
        
        // Order 2 (Accepted)
        await run(`
            INSERT INTO orders (id, requester_id, writer_id, pages, deadline, status, total_price, topic, text_assets)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, ['order-2', 'student-2', 'writer-2', 5, '2026-07-15T18:00:00Z', 'accepted', 20.0, 'French Revolution Essay', 'Write a detailed account of the storming of the Bastille...']);

        // Order 3 (Completed)
        await run(`
            INSERT INTO orders (id, requester_id, writer_id, pages, deadline, status, total_price, topic, text_assets)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, ['order-3', 'student-1', 'writer-3', 12, '2026-07-08T09:00:00Z', 'completed', 72.0, 'SQL Database Queries', 'Structured Query Language lecture transcription...']);

        // Order 4 (Disputed)
        await run(`
            INSERT INTO orders (id, requester_id, writer_id, pages, deadline, status, total_price, topic, text_assets)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, ['order-4', 'student-2', 'writer-4', 8, '2026-07-04T15:00:00Z', 'disputed', 28.0, 'Organic Chemistry Reactions', 'Alkanes, Alkenes, Alkynes functional groups study notes...']);

        // 6. Reviews
        await run('INSERT INTO reviews (id, order_id, rating, proof_pic_url) VALUES (?, ?, ?, ?)', 
            ['review-1', 'order-1', 5, '/uploads/mock_proof_1.png']);
        await run('INSERT INTO reviews (id, order_id, rating, proof_pic_url) VALUES (?, ?, ?, ?)', 
            ['review-2', 'order-3', 4, '/uploads/mock_proof_2.png']);

        // 7. Privacy logs
        await run('INSERT INTO privacy_logs (action, user_id, details) VALUES (?, ?, ?)',
            ['DB_INITIALIZATION', 'admin-1', 'Database initial seed completed successfully.']);
        await run('INSERT INTO privacy_logs (action, user_id, details) VALUES (?, ?, ?)',
            ['ACCESS_USER_DATA', 'admin-1', 'Admin loaded full secure user data vault during system start.']);
            
        console.log('Seed completed successfully!');
    }
};

export default db;
