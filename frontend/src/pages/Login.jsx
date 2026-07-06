import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App.jsx';
import { PenTool, Mail, Lock, Eye, EyeOff, ArrowRight, CheckCircle, XCircle, Copy, ExternalLink, User } from 'lucide-react';

// ─── Password Strength Utility ─────────────────────────────────────
function getStrength(pw) {
  if (!pw) return { score: 0, label: '', color: 'transparent' };
  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const map = [
    { label: 'Too short', color: 'var(--accent-rose)' },
    { label: 'Weak',      color: 'var(--accent-rose)' },
    { label: 'Fair',      color: 'var(--accent-amber)' },
    { label: 'Good',      color: 'var(--secondary)' },
    { label: 'Strong',    color: 'var(--accent-emerald)' },
    { label: 'Very Strong', color: 'var(--accent-emerald)' },
  ];
  return { score, ...map[Math.min(score, 5)] };
}

// ─── Inline Input Component ─────────────────────────────────────────
function AuthInput({ icon: Icon, type, placeholder, value, onChange, rightSlot, autoComplete }) {
  return (
    <div className="auth-input-container">
      <Icon size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="auth-input-field"
      />
      {rightSlot}
    </div>
  );
}

// ─── Gmail badge ─────────────────────────────────────────────────────
function GmailBadge({ email }) {
  const isGmail = email.toLowerCase().trim().endsWith('@gmail.com');
  if (!email.includes('@')) return null;
  return isGmail
    ? <span style={{ fontSize: '0.72rem', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '3px' }}><CheckCircle size={11} /> Gmail verified</span>
    : <span style={{ fontSize: '0.72rem', color: 'var(--accent-rose)', display: 'flex', alignItems: 'center', gap: '3px' }}><XCircle size={11} /> Gmail only</span>;
}

// ─── Error / Info Banner ──────────────────────────────────────────────
function Banner({ msg, type = 'error' }) {
  if (!msg) return null;
  const colors = {
    error: { bg: 'rgba(239,68,68,0.10)', border: 'var(--accent-rose)', color: 'var(--accent-rose)' },
    success: { bg: 'rgba(52,211,153,0.10)', border: 'var(--accent-emerald)', color: 'var(--accent-emerald)' },
    info: { bg: 'rgba(99,102,241,0.10)', border: 'var(--primary)', color: 'var(--primary)' },
  };
  const c = colors[type] || colors.error;
  return (
    <div style={{
      background: c.bg, border: `1px solid ${c.border}`, color: c.color,
      borderRadius: 'var(--radius-sm)', padding: '10px 14px',
      fontSize: '0.82rem', textAlign: 'left', marginBottom: '1rem',
      animation: 'fadeInScale 0.2s ease',
    }}>
      {msg}
    </div>
  );
}

export default function Login() {
  const { signup, signin, switchAccount, loading } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState('signin');   // 'signin' | 'signup' | 'forgot'
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  // Forgot password specific states
  const [resetEmail, setResetEmail] = useState('');
  const [resetLink, setResetLink] = useState('');
  const [copied, setCopied] = useState(false);

  // Multi-profile selector states
  const [showAccountSelector, setShowAccountSelector] = useState(false);
  const [primaryUser, setPrimaryUser] = useState(null);
  const [accounts, setAccounts] = useState([]);

  const strength = getStrength(password);

  const redirect = (user) => {
    if (user.role === 'admin')     navigate('/admin-mcp');
    else if (user.role === 'writer') navigate('/writer-dashboard');
    else navigate('/requester-dashboard');
  };

  const handleSignIn = async (e) => {
    e?.preventDefault();
    setError(''); setInfo('');
    if (!email || !password) return setError('Please fill in all fields.');
    
    let identifier = email.trim().toLowerCase();
    
    // Auto-append .com if they typed @gmail
    if (identifier.endsWith('@gmail')) {
      identifier += '.com';
    }

    const isEmail = identifier.includes('@');
    if (isEmail && !identifier.endsWith('@gmail.com')) {
      return setError('Only Gmail accounts (@gmail.com) are allowed.');
    }

    const result = await signin(identifier, password);
    if (result.success) {
      if (result.isNew) {
        navigate('/register', { state: { email: result.email, userId: result.user?.id } });
      } else if (result.subAccounts && result.subAccounts.length > 0) {
        setPrimaryUser(result.user);
        setAccounts([
          { id: result.user.id, email: result.user.email, username: result.user.username, role: result.user.role, full_name: result.profile?.full_name },
          ...result.subAccounts
        ]);
        setShowAccountSelector(true);
      } else {
        redirect(result.user);
      }
    } else {
      setError(result.error || 'Sign in failed. Please try again.');
    }
  };

  const handleSignUp = async (e) => {
    e?.preventDefault();
    setError(''); setInfo('');

    const normalizedEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim().toLowerCase();

    if (!email || !username || !password || !confirmPw) return setError('Please fill in all fields.');
    if (!normalizedEmail.endsWith('@gmail.com')) return setError('Only Gmail accounts (@gmail.com) are allowed.');
    if (cleanUsername.length < 3) return setError('Username must be at least 3 characters.');
    if (!/^[a-z0-9_]+$/.test(cleanUsername)) return setError('Username must only contain letters, numbers, and underscores.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirmPw) return setError('Passwords do not match.');

    const result = await signup(normalizedEmail, password, cleanUsername);
    if (result.success) {
      if (result.isNew) navigate('/register', { state: { email: result.email, userId: result.user?.id } });
      else redirect(result.user);
    } else {
      setError(result.error || 'Sign up failed. Please try again.');
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setResetLink('');

    if (!resetEmail) return setError('Please enter your email.');
    if (!resetEmail.toLowerCase().trim().endsWith('@gmail.com')) {
      return setError('Only Gmail accounts are supported.');
    }

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail.trim().toLowerCase() })
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to request password reset.');
      } else {
        setInfo(data.message);
        if (data.resetUrl) {
          setResetLink(data.resetUrl);
        }
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    }
  };

  const handleCopyLink = () => {
    if (resetLink) {
      navigator.clipboard.writeText(resetLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSelectAccount = async (account) => {
    setError('');
    if (account.id === primaryUser.id) {
      redirect(primaryUser);
    } else {
      const result = await switchAccount(account.id);
      if (result.success) {
        redirect(result.user);
      } else {
        setError(result.error || 'Failed to switch to selected account.');
      }
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '2rem', position: 'relative',
    }}>
      {/* Ambient glows */}
      <div style={{
        position: 'fixed', top: '15%', left: '10%', width: '400px', height: '400px',
        background: 'radial-gradient(circle, hsla(255,85%,65%,0.12) 0%, transparent 70%)',
        pointerEvents: 'none', borderRadius: '50%',
      }} />
      <div style={{
        position: 'fixed', bottom: '10%', right: '10%', width: '350px', height: '350px',
        background: 'radial-gradient(circle, hsla(192,95%,48%,0.10) 0%, transparent 70%)',
        pointerEvents: 'none', borderRadius: '50%',
      }} />

      <div className="glass-panel animate-fade-in" style={{
        width: '100%', maxWidth: '460px',
        padding: '2.5rem 2.5rem 2rem',
        boxShadow: 'var(--shadow-neon)',
        border: '1px solid var(--border-glass)',
      }}>
        {/* Branding */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginBottom: '0.6rem' }}>
          <PenTool size={34} style={{ color: 'var(--primary)' }} />
          <h1 style={{
            fontSize: '2rem', fontWeight: 800, margin: 0,
            background: 'linear-gradient(90deg, var(--text-primary), var(--secondary))',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>NeuroScribe</h1>
        </div>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '2rem', lineHeight: 1.5 }}>
          Premium Handwriting Marketplace
        </p>

        {showAccountSelector ? (
          /* ════════════ PROFILE SELECTOR ════════════ */
          <div className="animate-scale-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Select Account
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '6px', lineHeight: 1.4 }}>
                Choose the profile you wish to access:
              </p>
            </div>

            <Banner msg={error} type="error" />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {accounts.map(acc => {
                const isPrimary = acc.id === primaryUser.id;
                const roleColors = {
                  admin: 'var(--accent-rose)',
                  writer: 'var(--secondary)',
                  requester: 'var(--primary)',
                };
                const roleLabels = {
                  admin: '🔐 Admin',
                  writer: '✍️ Writer',
                  requester: '🎓 Student',
                };
                
                return (
                  <button
                    key={acc.id}
                    onClick={() => handleSelectAccount(acc)}
                    style={{
                      width: '100%',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--border-glass)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '14px 18px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.25s ease',
                      textAlign: 'left',
                    }}
                    className="profile-selector-btn"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        background: `linear-gradient(135deg, ${roleColors[acc.role] || 'var(--primary)'}, hsla(230, 40%, 40%, 0.5))`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        color: '#fff',
                        boxShadow: `0 0 10px ${roleColors[acc.role]}30`,
                      }}>
                        {acc.full_name?.[0] || acc.username?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                          {acc.full_name || acc.username}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          @{acc.username} {isPrimary && <span style={{ color: 'var(--accent-amber)', fontWeight: 600 }}>• Owner</span>}
                        </div>
                      </div>
                    </div>
                    
                    <span style={{ 
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      background: `${roleColors[acc.role]}20`,
                      color: roleColors[acc.role],
                      border: `1px solid ${roleColors[acc.role]}40`
                    }}>
                      {roleLabels[acc.role] || acc.role}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => {
                setShowAccountSelector(false);
                setPrimaryUser(null);
                setAccounts([]);
                setError('');
              }}
              className="btn-secondary"
              style={{ width: '100%', padding: '12px', marginTop: '8px' }}
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <>
            {/* Tab Switcher */}
            {tab !== 'forgot' && (
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr',
                background: 'rgba(0,0,0,0.25)', borderRadius: 'var(--radius-sm)',
                padding: '4px', marginBottom: '1.75rem',
                border: '1px solid var(--border-glass)',
                position: 'relative',
              }}>
                {/* Sliding indicator pill */}
                <div style={{
                  position: 'absolute',
                  top: '4px',
                  bottom: '4px',
                  left: tab === 'signin' ? '4px' : 'calc(50% + 2px)',
                  width: 'calc(50% - 6px)',
                  background: 'linear-gradient(135deg, var(--primary), var(--primary-glow))',
                  borderRadius: '6px',
                  transition: 'all 0.35s cubic-bezier(0.25, 0.8, 0.25, 1)',
                  boxShadow: '0 2px 12px rgba(139,92,246,0.4)',
                  zIndex: 0,
                }} />

                {['signin', 'signup'].map(t => (
                  <button
                    key={t}
                    onClick={() => { setTab(t); setError(''); setInfo(''); }}
                    style={{
                      padding: '9px', border: 'none', cursor: 'pointer', borderRadius: '8px',
                      fontFamily: 'inherit', fontSize: '0.88rem', fontWeight: 600,
                      transition: 'color 0.25s ease',
                      background: 'transparent',
                      color: tab === t ? '#fff' : 'var(--text-muted)',
                      zIndex: 1,
                      position: 'relative',
                    }}
                  >
                    {t === 'signin' ? '🔑 Sign In' : '✨ Sign Up'}
                  </button>
                ))}
              </div>
            )}

            {/* Banners */}
            <Banner msg={error} type="error" />
            <Banner msg={info} type={tab === 'forgot' && resetLink ? 'success' : 'info'} />

            {/* ════════════ SIGN IN ════════════ */}
            {tab === 'signin' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <AuthInput
                      icon={Mail}
                      type="text"
                      placeholder="Gmail or Username"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      autoComplete="username"
                    />
                    <div style={{ marginTop: '4px', minHeight: '16px' }}>
                      <GmailBadge email={email} />
                    </div>
                  </div>

                  <AuthInput
                    icon={Lock}
                    type={showPw ? 'text' : 'password'}
                    placeholder="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="current-password"
                    rightSlot={
                      <button type="button" onClick={() => setShowPw(v => !v)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex' }}>
                        {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    }
                  />

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-4px' }}>
                    <button
                      type="button"
                      onClick={() => { setTab('forgot'); setError(''); setInfo(''); setResetLink(''); }}
                      style={{ background: 'none', border: 'none', color: 'var(--secondary)', fontSize: '0.78rem', cursor: 'pointer', padding: 0 }}
                    >
                      Forgot Password?
                    </button>
                  </div>

                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={loading}
                    style={{ width: '100%', padding: '13px', fontSize: '0.95rem', marginTop: '4px' }}
                  >
                    {loading ? 'Signing in…' : <><ArrowRight size={16} /> Sign In</>}
                  </button>
                </form>
              </div>
            )}

            {/* ════════════ SIGN UP ════════════ */}
            {tab === 'signup' && (
              <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <AuthInput
                    icon={Mail}
                    type="email"
                    placeholder="Gmail (yourname@gmail.com)"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                  <div style={{ marginTop: '4px', minHeight: '16px' }}>
                    <GmailBadge email={email} />
                  </div>
                </div>

                <AuthInput
                  icon={User}
                  type="text"
                  placeholder="Choose username (letters/numbers/underscores)"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  autoComplete="username"
                />

                <div>
                  <AuthInput
                    icon={Lock}
                    type={showPw ? 'text' : 'password'}
                    placeholder="Create password (min 8 chars)"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="new-password"
                    rightSlot={
                      <button type="button" onClick={() => setShowPw(v => !v)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex' }}>
                        {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    }
                  />
                  {/* Password strength bar */}
                  {password && (
                    <div style={{ marginTop: '6px' }}>
                      <div style={{ display: 'flex', gap: '4px', height: '4px', borderRadius: '4px', overflow: 'hidden' }}>
                        {[1,2,3,4,5].map(i => (
                          <div key={i} style={{
                            flex: 1, borderRadius: '4px',
                            background: i <= strength.score ? strength.color : 'rgba(255,255,255,0.08)',
                            transition: 'background 0.3s',
                          }} />
                        ))}
                      </div>
                      <p style={{ fontSize: '0.72rem', color: strength.color, marginTop: '3px' }}>
                        {strength.label}
                      </p>
                    </div>
                  )}
                </div>

                <AuthInput
                  icon={Lock}
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Confirm password"
                  value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)}
                  autoComplete="new-password"
                  rightSlot={
                    <button type="button" onClick={() => setShowConfirm(v => !v)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex' }}>
                      {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  }
                />
                {confirmPw && password && (
                  <p style={{ fontSize: '0.72rem', marginTop: '-6px', color: password === confirmPw ? 'var(--accent-emerald)' : 'var(--accent-rose)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {password === confirmPw ? <><CheckCircle size={11} /> Passwords match</> : <><XCircle size={11} /> Passwords don't match</>}
                  </p>
                )}

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
                  style={{ width: '100%', padding: '13px', fontSize: '0.95rem', marginTop: '4px' }}
                >
                  {loading ? 'Creating account…' : <><CheckCircle size={16} /> Create Account</>}
                </button>
              </form>
            )}

            {/* ════════════ FORGOT PASSWORD ════════════ */}
            {tab === 'forgot' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                  Reset Password
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.4, margin: 0 }}>
                  Enter your registered Gmail address below. We'll generate a secure password reset link for you.
                </p>

                <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <AuthInput
                      icon={Mail}
                      type="email"
                      placeholder="yourname@gmail.com"
                      value={resetEmail}
                      onChange={e => setResetEmail(e.target.value)}
                    />
                    <div style={{ marginTop: '4px', minHeight: '16px' }}>
                      <GmailBadge email={resetEmail} />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={loading}
                    style={{ width: '100%', padding: '13px', fontSize: '0.95rem' }}
                  >
                    {loading ? 'Generating link…' : 'Generate Reset Link'}
                  </button>
                </form>

                {resetLink && (
                  <div style={{
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '12px',
                    marginTop: '6px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--secondary)' }}>
                      Your password reset link:
                    </span>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      borderRadius: '4px',
                      padding: '6px 10px',
                      justifyContent: 'space-between',
                      gap: '8px'
                    }}>
                      <code style={{
                        fontFamily: 'monospace',
                        fontSize: '0.75rem',
                        color: 'var(--text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {resetLink}
                      </code>
                      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                        <button
                          onClick={handleCopyLink}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: copied ? 'var(--accent-emerald)' : 'var(--text-muted)',
                            padding: '4px', display: 'flex'
                          }}
                          title="Copy link"
                        >
                          <Copy size={14} />
                        </button>
                        <a
                          href={resetLink}
                          style={{
                            color: 'var(--text-muted)', display: 'flex', padding: '4px'
                          }}
                          title="Open link"
                        >
                          <ExternalLink size={14} />
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => { setTab('signin'); setError(''); setInfo(''); setResetLink(''); }}
                  className="btn-secondary"
                  style={{ width: '100%', padding: '10px' }}
                >
                  Back to Sign In
                </button>
              </div>
            )}

            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '2rem', lineHeight: 1.5 }}>
              Sign up accepts <strong style={{ color: 'var(--secondary)' }}>@gmail.com</strong> accounts only.<br />
              You can sign in with your email or username.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
