import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PenTool, Lock, Eye, EyeOff, CheckCircle, ArrowRight } from 'lucide-react';

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

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const strength = getStrength(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!token) {
      setError('Invalid reset token. Please request a new link.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPw) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password })
      });
      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(data.error || 'Password reset failed.');
      } else {
        setSuccess(data.message || 'Password reset successfully!');
        setTimeout(() => {
          navigate('/login');
        }, 2500);
      }
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Something went wrong.');
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '2rem', position: 'relative',
    }}>
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
        <h2 style={{ textAlign: 'center', fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1.5rem' }}>
          Reset Password
        </h2>

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.10)', border: '1px solid var(--accent-rose)', color: 'var(--accent-rose)',
            borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: '0.82rem', textAlign: 'left', marginBottom: '1rem',
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{
            background: 'rgba(52,211,153,0.10)', border: '1px solid var(--accent-emerald)', color: 'var(--accent-emerald)',
            borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: '0.82rem', textAlign: 'left', marginBottom: '1rem',
          }}>
            {success} Redirecting to login...
          </div>
        )}

        {!token ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            <p>No valid password reset token was found in the URL query parameters.</p>
            <p style={{ marginTop: '10px' }}>
              Please request a new reset link from the login page.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="btn-secondary"
              style={{ marginTop: '1.5rem', width: '100%' }}
            >
              Go to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-glass)',
                borderRadius: 'var(--radius-sm)', padding: '0 14px',
              }}>
                <Lock size={16} style={{ color: 'var(--text-muted)' }} />
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="New Password (min 8 chars)"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{
                    flex: 1, background: 'transparent', border: 'none', outline: 'none',
                    color: 'var(--text-primary)', padding: '13px 0', fontSize: '0.95rem',
                  }}
                  required
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex' }}>
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

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

            <div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-glass)',
                borderRadius: 'var(--radius-sm)', padding: '0 14px',
              }}>
                <Lock size={16} style={{ color: 'var(--text-muted)' }} />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Confirm New Password"
                  value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)}
                  style={{
                    flex: 1, background: 'transparent', border: 'none', outline: 'none',
                    color: 'var(--text-primary)', padding: '13px 0', fontSize: '0.95rem',
                  }}
                  required
                />
                <button type="button" onClick={() => setShowConfirm(v => !v)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex' }}>
                  {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {confirmPw && password && (
                <p style={{ fontSize: '0.72rem', marginTop: '6px', color: password === confirmPw ? 'var(--accent-emerald)' : 'var(--accent-rose)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {password === confirmPw ? <><CheckCircle size={11} /> Passwords match</> : <>❌ Passwords don't match</>}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading || !!success}
              style={{ width: '100%', padding: '13px', fontSize: '0.95rem', marginTop: '10px' }}
            >
              {loading ? 'Resetting…' : <><ArrowRight size={16} /> Reset Password</>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
