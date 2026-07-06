import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../App.jsx';
import { PenTool, LogOut, LayoutDashboard, Pen, ChevronDown, User, Shield } from 'lucide-react';

export default function Navbar() {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getDashboardLink = () => {
    if (!user) return '/login';
    if (user.role === 'admin') return '/admin-mcp';
    if (user.role === 'writer') return '/writer-dashboard';
    return '/requester-dashboard';
  };

  const isActive = (path) => location.pathname === path;

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
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 200,
      padding: '0 1rem',
    }}>
      <nav style={{
        background: 'hsla(230, 40%, 8%, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid var(--border-glass)',
        borderRadius: 'var(--radius-md)',
        margin: '0.75rem auto',
        maxWidth: '1280px',
        padding: '0.7rem 1.75rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1.5rem',
        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
      }}>
        
        {/* Logo */}
        <Link to={getDashboardLink()} style={{
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexShrink: 0,
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, var(--primary), hsl(275, 85%, 60%))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 12px var(--primary-glow)'
          }}>
            <PenTool size={16} color="#fff" />
          </div>
          <span style={{
            fontSize: '1.3rem',
            fontWeight: 800,
            background: 'linear-gradient(90deg, var(--text-primary), var(--secondary))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            NeuroScribe
          </span>
        </Link>

        {/* Nav Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
          <Link 
            to={getDashboardLink()} 
            style={{
              color: isActive(getDashboardLink()) ? 'var(--text-primary)' : 'var(--text-muted)',
              textDecoration: 'none',
              fontSize: '0.88rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              background: isActive(getDashboardLink()) ? 'hsla(255, 85%, 65%, 0.12)' : 'transparent',
              transition: 'all 0.2s',
            }}
          >
            <LayoutDashboard size={15} />
            Dashboard
          </Link>

          <Link 
            to="/converter" 
            style={{
              color: isActive('/converter') ? 'var(--text-primary)' : 'var(--text-muted)',
              textDecoration: 'none',
              fontSize: '0.88rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              background: isActive('/converter') ? 'hsla(192, 95%, 48%, 0.12)' : 'transparent',
              transition: 'all 0.2s',
            }}
          >
            <Pen size={15} />
            Handwriting Tool
          </Link>
        </div>

        {/* User Menu */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowUserMenu(v => !v)}
            style={{
              background: 'hsla(230, 35%, 18%, 0.8)',
              border: `1px solid ${roleColors[user?.role] || 'var(--border-glass)'}`,
              borderRadius: 'var(--radius-sm)',
              padding: '6px 12px 6px 8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-main)',
            }}
          >
            {/* Avatar */}
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${roleColors[user?.role] || 'var(--primary)'}, hsla(230, 40%, 40%, 0.5))`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#fff',
              flexShrink: 0,
            }}>
              {profile?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || '?'}
            </div>
            <div style={{ textAlign: 'left' }}>
              <p style={{ fontSize: '0.82rem', fontWeight: 700, lineHeight: 1.2 }}>
                {profile?.full_name?.split(' ')[0] || 'User'}
              </p>
              <p style={{ fontSize: '0.65rem', color: roleColors[user?.role] || 'var(--text-muted)', fontWeight: 600 }}>
                {roleLabels[user?.role] || user?.role?.toUpperCase()}
              </p>
            </div>
            <ChevronDown size={14} style={{ 
              color: 'var(--text-muted)', 
              transform: showUserMenu ? 'rotate(180deg)' : 'none', 
              transition: 'transform 0.2s' 
            }} />
          </button>

          {/* Dropdown Menu */}
          {showUserMenu && (
            <>
              {/* Click outside to close */}
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 299, cursor: 'default' }}
                onClick={() => setShowUserMenu(false)}
              />
              <div
                className="glass-panel animate-scale-in"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  minWidth: '200px',
                  padding: '6px',
                  zIndex: 300,
                  boxShadow: 'var(--shadow-neon)',
                }}
              >
                {/* User Info */}
                <div style={{ 
                  padding: '10px 12px', 
                  borderBottom: '1px solid var(--border-glass)',
                  marginBottom: '4px'
                }}>
                  <p style={{ fontSize: '0.85rem', fontWeight: 700 }}>{profile?.full_name || 'Admin'}</p>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>{user?.email}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
                    <span style={{ 
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      background: `${roleColors[user?.role]}20`,
                      color: roleColors[user?.role],
                      border: `1px solid ${roleColors[user?.role]}40`
                    }}>
                      {roleLabels[user?.role] || user?.role?.toUpperCase()}
                    </span>
                    {profile?.pin_code && (
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                        📍 {profile.pin_code}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <button
                  onClick={() => { handleLogout(); setShowUserMenu(false); }}
                  style={{
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent-rose)',
                    fontFamily: 'var(--font-main)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    padding: '8px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'background 0.2s',
                  }}
                  onMouseOver={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'}
                  onMouseOut={e => e.currentTarget.style.background = 'none'}
                >
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
