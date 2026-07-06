import React, { useState, useEffect } from 'react';
import { useAuth } from '../App.jsx';
import Lightbox from '../components/Lightbox.jsx';
import OrderChatModal from '../components/OrderChatModal.jsx';
import { 
  DollarSign, FileText, User, Phone, MapPin, 
  CheckCircle2, AlertTriangle, Award, Upload, RefreshCw, Briefcase, TrendingUp
} from 'lucide-react';

export default function WriterDashboard() {
  const { user, profile, setUser, setProfile } = useAuth();

  // States
  const [jobs, setJobs] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [lightboxTitle, setLightboxTitle] = useState('');
  const [activeChatOrderId, setActiveChatOrderId] = useState(null);
  
  // Profile edit states
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [rate, setRate] = useState(profile?.rate_per_page || 0.0);
  const [phone, setPhone] = useState(profile?.phone_number || '');
  const [pin, setPin] = useState(profile?.pin_code || '');
  const [editSuccess, setEditSuccess] = useState('');
  const [editError, setEditError] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);

  // Sync profile details if they load/change
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setRate(profile.rate_per_page || 0.0);
      setPhone(profile.phone_number || '');
      setPin(profile.pin_code || '');
    }
    if (user) {
      setUsername(user.username || '');
    }
  }, [profile, user]);

  // Fetch writer tasks & available jobs
  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch my tasks (hired assignments)
      const tasksRes = await fetch(`/api/orders/my-orders?user_id=${user.id}&role=writer`);
      const tasksData = await tasksRes.json();
      setMyTasks(Array.isArray(tasksData) ? tasksData : []);

      // Available jobs = pending orders assigned to this writer
      const available = (Array.isArray(tasksData) ? tasksData : []).filter(t => t.status === 'pending');
      setJobs(available);
      
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Update profile — using the dedicated /api/profiles/update endpoint
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setEditSuccess('');
    setEditError('');

    if (!fullName.trim() || !username.trim() || !rate || parseFloat(rate) <= 0 || !phone || !pin) {
      setEditError('All fields are required and rate must be greater than $0.');
      return;
    }

    setSavingProfile(true);
    const formData = new FormData();
    formData.append('full_name', fullName);
    formData.append('username', username);
    formData.append('phone_number', phone);
    formData.append('pin_code', pin);
    formData.append('rate_per_page', rate);
    if (uploadFile) {
      formData.append('handwriting', uploadFile);
    }

    try {
      const res = await fetch('/api/profiles/update', {
        method: 'POST',
        headers: {
          'x-user-id': user.id
        },
        body: formData
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Update failed');
      }
      
      const data = await res.json();
      setProfile(data.profile);
      if (data.user) {
        setUser(data.user);
      }
      setEditSuccess('Profile details updated successfully! Your listing is now live.');
      setUploadFile(null);
    } catch (err) {
      setEditError(err.message || 'Error updating profile. Please try again.');
    } finally {
      setSavingProfile(false);
    }
  };

  // Accept a Job
  const handleAcceptJob = async (orderId) => {
    try {
      const res = await fetch('/api/orders/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, status: 'accepted', user_id: user.id })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Submit completed work
  const handleMarkCompleted = async (orderId) => {
    try {
      const res = await fetch('/api/orders/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, status: 'completed', user_id: user.id })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Metrics calculation
  const completedTasks = myTasks.filter(t => t.status === 'completed');
  const activeTasks = myTasks.filter(t => t.status === 'accepted');
  const disputedTasks = myTasks.filter(t => t.status === 'disputed');

  const totalPagesWritten = completedTasks.reduce((sum, t) => sum + t.pages, 0);
  const totalEarnings = completedTasks.reduce((sum, t) => sum + t.total_price, 0);
  const pendingPayouts = activeTasks.reduce((sum, t) => sum + t.total_price, 0);

  const statusColor = {
    pending: 'var(--accent-amber)',
    accepted: 'var(--secondary)',
    completed: 'var(--accent-emerald)',
    disputed: 'var(--accent-rose)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Welcome & Metadata */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>
            ✍️ Writer Workspace
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '4px' }}>
            Welcome back, <strong style={{ color: 'var(--secondary)' }}>{profile?.full_name}</strong> — manage your orders, rates, and writing profile.
          </p>
        </div>
        <button 
          onClick={fetchData} 
          className="btn-secondary" 
          style={{ padding: '8px 16px', display: 'flex', gap: '6px', alignItems: 'center' }}
        >
          <RefreshCw size={14} /> Refresh Workspace
        </button>
      </div>

      {/* METRIC TRACKERS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '1.5rem'
      }}>
        <div className="glass-panel" style={{ padding: '1.5rem 2rem', borderTop: '3px solid var(--secondary)' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Pages Written</p>
          <p style={{ fontSize: '2rem', fontWeight: 800, marginTop: '8px', color: 'var(--text-primary)' }}>{totalPagesWritten}</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>total pages completed</p>
        </div>
        
        <div className="glass-panel" style={{ padding: '1.5rem 2rem', borderTop: '3px solid var(--accent-emerald)', boxShadow: 'var(--shadow-emerald)' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Cleared Earnings</p>
          <p style={{ fontSize: '2rem', fontWeight: 800, marginTop: '8px', color: 'var(--accent-emerald)' }}>₹{totalEarnings.toFixed(2)}</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>{completedTasks.length} completed jobs</p>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem 2rem', borderTop: '3px solid var(--accent-amber)' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Pending Payouts</p>
          <p style={{ fontSize: '2rem', fontWeight: 800, marginTop: '8px', color: 'var(--accent-amber)' }}>₹{pendingPayouts.toFixed(2)}</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>{activeTasks.length} active jobs</p>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem 2rem', borderTop: '3px solid var(--accent-rose)' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Disputed</p>
          <p style={{ fontSize: '2rem', fontWeight: 800, marginTop: '8px', color: 'var(--accent-rose)' }}>
            ₹{disputedTasks.reduce((sum, t) => sum + t.total_price, 0).toFixed(2)}
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>{disputedTasks.length} under review</p>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.4fr 1fr',
        gap: '2rem',
        alignItems: 'start'
      }}>
        
        {/* LEFT COLUMN: Open Job Offers & Hired Tasks */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Job Board: Pending incoming requests assigned to this writer */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Briefcase size={20} style={{ color: 'var(--secondary)' }} />
              Incoming Job Board
              {jobs.length > 0 && (
                <span style={{
                  background: 'var(--accent-amber)',
                  color: '#000',
                  borderRadius: '9999px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '2px 8px'
                }}>
                  {jobs.length} new
                </span>
              )}
            </h3>

            {loading ? (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', color: 'var(--text-muted)', padding: '1rem 0' }}>
                <RefreshCw size={16} className="spin" /> Loading jobs...
              </div>
            ) : jobs.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '2rem',
                border: '1px dashed var(--border-glass)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-muted)'
              }}>
                <Award size={32} style={{ marginBottom: '8px', opacity: 0.4 }} />
                <p style={{ fontSize: '0.9rem' }}>No pending job requests right now.</p>
                <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>Keep your handwriting sample updated and price competitive!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {jobs.map(job => (
                  <div key={job.id} className="glass-panel glass-panel-hover" style={{
                    padding: '1.25rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1rem',
                    borderLeft: '3px solid var(--accent-amber)'
                  }}>
                    <div>
                      <span className="badge badge-pending">PENDING OFFER</span>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginTop: '8px' }}>{job.topic}</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                        <MapPin size={12} /> Student PIN: {job.counterparty_pin}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        📅 Deadline: {new Date(job.deadline).toLocaleString()}
                      </p>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexShrink: 0 }}>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>₹{job.total_price?.toFixed(2)}</p>
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{job.pages} pages</p>
                      </div>
                      
                      <button 
                        onClick={() => handleAcceptJob(job.id)}
                        className="btn-primary" 
                        style={{ padding: '8px 18px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                      >
                        Accept Offer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Tasks & Completed Jobs */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={20} style={{ color: 'var(--primary)' }} />
              Active Assignment Pipeline
            </h3>

            {loading ? (
              <p style={{ color: 'var(--text-muted)' }}>Loading pipeline...</p>
            ) : myTasks.filter(t => t.status !== 'pending').length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '2rem',
                border: '1px dashed var(--border-glass)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-muted)'
              }}>
                <FileText size={32} style={{ marginBottom: '8px', opacity: 0.4 }} />
                <p style={{ fontSize: '0.9rem' }}>No active assignments in progress.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {myTasks.filter(t => t.status !== 'pending').map(task => (
                  <div key={task.id} className="glass-panel animate-fade-in" style={{
                    padding: '1.5rem',
                    borderLeft: `4px solid ${statusColor[task.status] || 'var(--border-glass)'}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span className={`badge badge-${task.status}`}>{task.status.toUpperCase()}</span>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '8px' }}>{task.topic}</h4>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Order: {task.id} &bull; {task.pages} pages</p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--secondary)' }}>₹{task.total_price?.toFixed(2)}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>₹{profile?.rate_per_page}/pg</p>
                      </div>
                    </div>

                    <div style={{
                      backgroundColor: 'rgba(0,0,0,0.2)',
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-sm)',
                      marginTop: '1rem',
                      fontSize: '0.85rem',
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '10px'
                    }}>
                      <div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Student Client</p>
                        <p style={{ fontWeight: 600 }}>{task.counterparty_name}</p>
                        <p style={{ color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px', fontWeight: 500 }}>
                          <Phone size={12} /> {task.counterparty_phone}
                        </p>
                      </div>
                      <div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Target Timeline</p>
                        <p style={{ fontWeight: 600 }}>📅 {new Date(task.deadline).toLocaleString()}</p>
                      </div>
                    </div>

                    {task.text_assets && (
                      <div style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '4px' }}>Text Content to Copy by Hand:</p>
                        <div style={{
                          maxHeight: '100px',
                          overflowY: 'auto',
                          background: 'rgba(0,0,0,0.15)',
                          padding: '10px',
                          borderRadius: '4px',
                          whiteSpace: 'pre-wrap',
                          fontFamily: 'monospace',
                          fontSize: '0.8rem',
                          color: 'var(--text-muted)',
                          borderLeft: '2px solid var(--border-glass)'
                        }}>
                          {task.text_assets}
                        </div>
                      </div>
                    )}

                    <div style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      gap: '10px',
                      marginTop: '1.25rem',
                      borderTop: '1px solid var(--border-glass)',
                      paddingTop: '1rem'
                    }}>
                      {task.status === 'accepted' && (
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button 
                            onClick={() => setActiveChatOrderId(task.id)}
                            className="btn-secondary" 
                            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                          >
                            💬 Chat with Student
                          </button>
                          <button 
                            onClick={() => handleMarkCompleted(task.id)}
                            className="btn-primary" 
                            style={{ padding: '8px 16px', fontSize: '0.85rem', backgroundColor: 'var(--accent-emerald)' }}
                          >
                            <CheckCircle2 size={14} /> Submit Work for Payout
                          </button>
                        </div>
                      )}

                      {task.status === 'completed' && (
                        <p style={{ fontSize: '0.8rem', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={14} /> Submitted — Awaiting Student Review & Payment Release
                        </p>
                      )}

                      {task.status === 'disputed' && (
                        <p style={{ fontSize: '0.8rem', color: 'var(--accent-rose)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <AlertTriangle size={14} /> Disputed — Admin is arbitrating this order.
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Profile Setup & Rates */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div className="glass-panel" style={{ padding: '2.5rem', position: 'sticky', top: '7rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={20} style={{ color: 'var(--primary)' }} />
              Writer Profile & Settings
            </h3>

            {editSuccess && (
              <div className="animate-fade-in" style={{ padding: '10px 14px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-emerald)', border: '1px solid var(--accent-emerald)', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '1rem' }}>
                ✓ {editSuccess}
              </div>
            )}

            {editError && (
              <div className="animate-fade-in" style={{ padding: '10px 14px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-rose)', border: '1px solid var(--accent-rose)', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '1rem' }}>
                ⚠ {editError}
              </div>
            )}

            <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input 
                  type="text" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="form-input"
                  required
                  placeholder="Your Full Name"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Username</label>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="form-input"
                  required
                  placeholder="choose_username"
                />
              </div>

              <div className="form-group">
                <label className="form-label">My Rate Per Page (₹)</label>
                <input 
                  type="number" 
                  step="0.5" 
                  min="0.5"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  className="form-input"
                  required
                  placeholder="e.g. 5.50"
                />
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Competitive rate → More hire requests
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">Contact Phone Number</label>
                <input 
                  type="tel" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="form-input"
                  required
                  placeholder="+91 99999 99999"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Location PIN Code</label>
                <input 
                  type="text" 
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="form-input"
                  required
                  placeholder="e.g. 00000-aa-00"
                  maxLength={20}
                  pattern="[a-zA-Z0-9]{2,6}-[a-zA-Z]{1,4}-[0-9]{1,4}"
                  title="Format: area-category-sequence (e.g. 00000-aa-00)"
                />
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Format: <code style={{ fontFamily: 'monospace', color: 'var(--secondary)' }}>00000-aa-00</code> · proximity matching — local writers rank higher
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">Update Handwriting Sample Photo</label>
                <div style={{
                  border: uploadFile ? '1px solid var(--accent-emerald)' : '1px dashed var(--border-glass)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px',
                  backgroundColor: 'hsla(230, 30%, 8%, 0.4)',
                  position: 'relative',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s'
                }}>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => setUploadFile(e.target.files[0])}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '0.8rem', color: uploadFile ? 'var(--accent-emerald)' : 'var(--text-muted)', display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'center' }}>
                    <Upload size={14} /> {uploadFile ? `✓ ${uploadFile.name}` : 'Upload new handwriting image (JPEG/PNG)'}
                  </span>
                </div>
              </div>

              {profile?.handwriting_url && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Current sample:</span>
                  <button 
                    type="button" 
                    onClick={() => {
                      setLightboxImage(profile.handwriting_url);
                      setLightboxTitle('My Registered Handwriting Sample');
                    }}
                    className="btn-secondary" 
                    style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                  >
                    👁 View
                  </button>
                </div>
              )}

              <button 
                type="submit" 
                className="btn-primary" 
                style={{ width: '100%', marginTop: '0.5rem' }}
                disabled={savingProfile}
              >
                {savingProfile ? '⏳ Saving...' : '✓ Save Profile Changes'}
              </button>
            </form>

            {/* Current Stats */}
            <div style={{
              marginTop: '1.5rem',
              paddingTop: '1.5rem',
              borderTop: '1px solid var(--border-glass)',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px'
            }}>
              <div style={{ textAlign: 'center', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
                <p style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--secondary)' }}>{completedTasks.length}</p>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Jobs Completed</p>
              </div>
              <div style={{ textAlign: 'center', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
                <p style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)' }}>₹{profile?.rate_per_page?.toFixed(2)}</p>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Current Rate/Page</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Lightbox 
        src={lightboxImage} 
        title={lightboxTitle || profile?.full_name} 
        onClose={() => { setLightboxImage(null); setLightboxTitle(''); }} 
      />

      {activeChatOrderId && (
        <OrderChatModal 
          orderId={activeChatOrderId}
          currentUserId={user.id}
          onClose={() => setActiveChatOrderId(null)}
        />
      )}

    </div>
  );
}
