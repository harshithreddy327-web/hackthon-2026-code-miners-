import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../App.jsx';
import { 
  ShieldAlert, Lock, Users, FileSpreadsheet,
  BarChart3, Pin, CheckCircle2, AlertTriangle, RefreshCw,
  Activity, Zap, Eye, TrendingUp
} from 'lucide-react';

// Format a relative timestamp
const relativeTime = (ts) => {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return new Date(ts).toLocaleTimeString();
};

export default function AdminMCP() {
  const { user } = useAuth();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState(null);
  const [isLive, setIsLive] = useState(true);
  const [activeTab, setActiveTab] = useState('feed'); // 'feed' | 'vault' | 'logs'
  
  // Pin form state
  const [pinWriterId, setPinWriterId] = useState('');
  const [pinRank, setPinRank] = useState(1);
  const [pinSuccess, setPinSuccess] = useState('');
  const intervalRef = useRef(null);

  const fetchMCPData = async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/mcp-dashboard', {
        headers: { 'x-user-email': user.email }
      });

      if (!res.ok) throw new Error('Access Denied. Admin credentials invalid.');

      const mcpData = await res.json();
      setData(mcpData);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchMCPData();
  }, [user]);

  // Live polling every 15 seconds
  useEffect(() => {
    if (isLive) {
      intervalRef.current = setInterval(() => {
        fetchMCPData(true); // silent refresh
      }, 15000);
    }
    return () => clearInterval(intervalRef.current);
  }, [isLive]);

  const handlePinSubmit = async (e, pinAction) => {
    e.preventDefault();
    setPinSuccess('');
    if (pinAction && !pinWriterId) return;

    try {
      const res = await fetch('/api/admin/leaderboard-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': user.email
        },
        body: JSON.stringify({ writer_id: pinWriterId, pin: pinAction, rank: pinRank })
      });

      if (res.ok) {
        setPinSuccess(pinAction ? `✓ Writer pinned to Rank #${pinRank} successfully!` : '✓ Writer unpinned from marketplace.');
        setPinWriterId('');
        fetchMCPData(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '1rem' }}>
        <div style={{ animation: 'spin 1s linear infinite' }}>
          <Lock size={36} style={{ color: 'var(--accent-rose)' }} />
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Decrypting Master Control Panel access...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <ShieldAlert size={56} style={{ color: 'var(--accent-rose)', marginBottom: '1rem' }} />
        <h2 style={{ color: 'var(--accent-rose)', fontSize: '1.5rem' }}>{error}</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: '10px' }}>Only authorized administrators have access to the MCP.</p>
      </div>
    );
  }

  const { users, orders, metrics, privacyLogs } = data;
  const writers = users.filter(u => u.role === 'writer');

  const statusColorClass = { completed: 'var(--accent-emerald)', pending: 'var(--accent-amber)', accepted: 'var(--secondary)', disputed: 'var(--accent-rose)' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* MCP Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <Lock size={22} style={{ color: 'var(--accent-rose)' }} />
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Master Control Panel</h2>
            <span style={{
              fontSize: '0.65rem',
              fontWeight: 700,
              background: 'rgba(239, 68, 68, 0.1)',
              color: 'var(--accent-rose)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '9999px',
              padding: '2px 8px',
              letterSpacing: '0.08em'
            }}>ADMIN ONLY</span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            System-wide relational log monitoring, live transaction feed, and compliance auditing.
          </p>
          {lastRefresh && (
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Last synced: {lastRefresh.toLocaleTimeString()} &bull;{' '}
              <span style={{ color: isLive ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
                {isLive ? '⬤ LIVE' : '⬤ PAUSED'}
              </span>
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setIsLive(v => !v)}
            className="btn-secondary"
            style={{ 
              padding: '8px 14px', 
              fontSize: '0.82rem',
              color: isLive ? 'var(--accent-emerald)' : 'var(--text-muted)',
              borderColor: isLive ? 'var(--accent-emerald)' : 'var(--border-glass)'
            }}
          >
            <Activity size={14} /> {isLive ? 'Live Auto-Refresh' : 'Resume Live'}
          </button>
          <button 
            onClick={() => fetchMCPData()} 
            className="btn-secondary" 
            style={{ padding: '8px 14px', fontSize: '0.82rem' }}
          >
            <RefreshCw size={14} /> Refresh Now
          </button>
        </div>
      </div>

      {/* METRIC OVERVIEW */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '1.25rem'
      }}>
        <div className="glass-panel" style={{ padding: '1.5rem', borderTop: '3px solid var(--primary)' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>System Accounts</p>
          <p style={{ fontSize: '2rem', fontWeight: 800, marginTop: '8px' }}>{metrics.totalUsers}</p>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            🎓 {metrics.totalRequesters} Students · ✍️ {metrics.totalWriters} Writers
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', borderTop: '3px solid var(--secondary)' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Contracts</p>
          <p style={{ fontSize: '2rem', fontWeight: 800, marginTop: '8px' }}>{metrics.totalOrders}</p>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            ✓ {metrics.completedOrders} Done · ⚠ {metrics.disputedOrders} Disputed
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', borderTop: '3px solid var(--accent-emerald)' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Transaction Volume</p>
          <p style={{ fontSize: '2rem', fontWeight: 800, marginTop: '8px', color: 'var(--accent-emerald)' }}>₹{metrics.totalVolume}</p>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>Gross platform value</p>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', borderTop: '3px solid var(--accent-amber)' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pending Escrows</p>
          <p style={{ fontSize: '2rem', fontWeight: 800, marginTop: '8px', color: 'var(--accent-amber)' }}>₹{metrics.payoutsPending}</p>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>Cleared completed value</p>
        </div>
      </div>

      {/* MAIN CONTENT GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          {/* Tabs for data views */}
          <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0' }}>
            {[
              { id: 'feed', label: '📊 Live Transaction Feed', icon: <Zap size={14} /> },
              { id: 'vault', label: '🔒 User Data Vault', icon: <Users size={14} /> },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
                  color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-muted)',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: activeTab === tab.id ? 700 : 500,
                  fontFamily: 'var(--font-main)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'color 0.2s',
                  marginBottom: '-1px'
                }}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* LIVE TRANSACTION FEED */}
          {activeTab === 'feed' && (
            <div className="glass-panel animate-fade-in" style={{ padding: '2rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileSpreadsheet size={18} style={{ color: 'var(--secondary)' }} />
                Global Transactions — All {orders.length} Orders
              </h3>

              {orders.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>No transactions yet.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '8px 6px', fontWeight: 600 }}>ID</th>
                        <th style={{ padding: '8px 6px', fontWeight: 600 }}>Topic</th>
                        <th style={{ padding: '8px 6px', fontWeight: 600 }}>Student → Writer</th>
                        <th style={{ padding: '8px 6px', fontWeight: 600 }}>Pages</th>
                        <th style={{ padding: '8px 6px', fontWeight: 600 }}>Gross</th>
                        <th style={{ padding: '8px 6px', fontWeight: 600 }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((o, i) => (
                        <tr 
                          key={o.id} 
                          className="animate-fade-in"
                          style={{ 
                            borderBottom: '1px solid hsla(230, 30%, 20%, 0.3)',
                            animationDelay: `${i * 0.03}s`,
                          }}
                        >
                          <td style={{ padding: '12px 6px', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                            {o.id.slice(0, 8)}...
                          </td>
                          <td style={{ padding: '12px 6px', fontWeight: 500 }}>{o.topic}</td>
                          <td style={{ padding: '12px 6px', fontSize: '0.8rem' }}>
                            <span style={{ color: 'var(--primary)' }}>{o.requester_name || 'N/A'}</span>
                            <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>→</span>
                            <span style={{ color: 'var(--secondary)' }}>{o.writer_name || 'N/A'}</span>
                          </td>
                          <td style={{ padding: '12px 6px' }}>{o.pages}p</td>
                          <td style={{ padding: '12px 6px', fontWeight: 700, color: 'var(--accent-emerald)' }}>₹{o.total_price?.toFixed(2)}</td>
                          <td style={{ padding: '12px 6px' }}>
                            <span className={`badge badge-${o.status}`} style={{ fontSize: '0.6rem', padding: '2px 6px' }}>
                              {o.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* USER DATA VAULT */}
          {activeTab === 'vault' && (
            <div className="glass-panel animate-fade-in" style={{ padding: '2rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} style={{ color: 'var(--primary)' }} />
                Secure User Data Vault
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--accent-rose)', marginBottom: '1.5rem' }}>
                ⚠ Sensitive PII — Admin-eyes only. All access is logged.
              </p>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '8px 6px' }}>Name</th>
                      <th style={{ padding: '8px 6px' }}>Email</th>
                      <th style={{ padding: '8px 6px' }}>Role</th>
                      <th style={{ padding: '8px 6px' }}>Phone</th>
                      <th style={{ padding: '8px 6px' }}>PIN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u, i) => (
                      <tr 
                        key={u.id} 
                        className="animate-fade-in"
                        style={{ 
                          borderBottom: '1px solid hsla(230, 30%, 20%, 0.3)',
                          animationDelay: `${i * 0.03}s`
                        }}
                      >
                        <td style={{ padding: '12px 6px', fontWeight: 600 }}>{u.full_name || 'N/A'}</td>
                        <td style={{ padding: '12px 6px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{u.email}</td>
                        <td style={{ padding: '12px 6px' }}>
                          <span style={{ 
                            fontSize: '0.7rem', 
                            fontWeight: 700, 
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: u.role === 'admin' ? 'rgba(239, 68, 68, 0.1)' : u.role === 'writer' ? 'rgba(6, 182, 212, 0.1)' : 'rgba(255,255,255,0.05)',
                            color: u.role === 'admin' ? 'var(--accent-rose)' : u.role === 'writer' ? 'var(--secondary)' : 'var(--text-primary)'
                          }}>
                            {u.role?.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '12px 6px', fontWeight: 500, color: 'var(--text-primary)' }}>{u.phone_number || '—'}</td>
                        <td style={{ padding: '12px 6px', color: 'var(--text-muted)' }}>📍 {u.pin_code || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Leaderboard Customizer + Privacy Logs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Leaderboard Customizer */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Pin size={18} style={{ color: 'var(--accent-amber)' }} />
              Marketplace Leaderboard Customizer
            </h3>

            {pinSuccess && (
              <div className="animate-fade-in" style={{ padding: '10px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-emerald)', border: '1px solid var(--accent-emerald)', borderRadius: '4px', fontSize: '0.8rem', marginBottom: '1rem' }}>
                {pinSuccess}
              </div>
            )}

            <form style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.85rem' }}>Select Writer to Feature</label>
                <select 
                  value={pinWriterId}
                  onChange={(e) => setPinWriterId(e.target.value)}
                  className="form-select"
                >
                  <option value="">-- Select Writer --</option>
                  {writers.map(w => (
                    <option key={w.id} value={w.id}>{w.full_name} ({w.email})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.85rem' }}>Spotlight Rank Priority</label>
                <select 
                  value={pinRank}
                  onChange={(e) => setPinRank(parseInt(e.target.value))}
                  className="form-select"
                >
                  <option value="1">⭐⭐⭐ Rank 1 — Top Spotlight</option>
                  <option value="2">⭐⭐ Rank 2 — Featured</option>
                  <option value="3">⭐ Rank 3 — Boosted</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button 
                  onClick={(e) => handlePinSubmit(e, false)}
                  className="btn-secondary" 
                  disabled={!pinWriterId}
                  style={{ color: 'var(--accent-rose)', borderColor: 'rgba(239, 68, 68, 0.25)', fontSize: '0.85rem', padding: '10px' }}
                >
                  Unpin Writer
                </button>
                <button 
                  onClick={(e) => handlePinSubmit(e, true)}
                  className="btn-primary" 
                  disabled={!pinWriterId}
                  style={{ backgroundColor: 'var(--accent-amber)', fontSize: '0.85rem' }}
                >
                  ⭐ Pin Spotlight
                </button>
              </div>
            </form>

            {/* Current Leaderboard Pins Summary */}
            {writers.some(w => users.find(u => u.id === w.id)) && (
              <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-glass)' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>ACTIVE WRITER ROSTER ({writers.length} writers)</p>
                {writers.slice(0, 5).map(w => (
                  <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid hsla(230, 30%, 20%, 0.3)', fontSize: '0.8rem' }}>
                    <span style={{ fontWeight: 500 }}>{w.full_name}</span>
                    <span style={{ color: 'var(--accent-emerald)' }}>₹{w.rate_per_page?.toFixed(2)}/pg</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Privacy Audit Logs */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Eye size={18} style={{ color: 'var(--accent-rose)' }} />
              Security Audit Trail
              <span style={{ marginLeft: 'auto', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', background: 'rgba(0,0,0,0.2)', padding: '2px 8px', borderRadius: '9999px' }}>
                {privacyLogs.length} events
              </span>
            </h3>

            <div style={{
              maxHeight: '380px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              {privacyLogs.map((log, i) => (
                <div key={log.id} className="animate-fade-in" style={{
                  padding: '10px 14px',
                  backgroundColor: 'rgba(0,0,0,0.2)',
                  borderRadius: '6px',
                  borderLeft: `3px solid ${
                    log.action.includes('UNAUTHORIZED') ? 'var(--accent-rose)' :
                    log.action.includes('ADMIN') ? 'var(--accent-amber)' :
                    log.action.includes('REGISTER') ? 'var(--secondary)' :
                    'var(--border-glass)'
                  }`,
                  fontSize: '0.72rem',
                  animationDelay: `${i * 0.02}s`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '6px' }}>
                    <span style={{ 
                      fontWeight: 700, 
                      color: log.action.includes('UNAUTHORIZED') ? 'var(--accent-rose)' : 
                        log.action.includes('ADMIN') ? 'var(--accent-amber)' : 'var(--text-primary)',
                      fontFamily: 'monospace',
                      letterSpacing: '0.03em'
                    }}>
                      {log.action}
                    </span>
                    <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {relativeTime(log.timestamp)}
                    </span>
                  </div>
                  <p style={{ marginTop: '4px', color: 'var(--text-muted)', lineHeight: 1.4 }}>{log.details}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
