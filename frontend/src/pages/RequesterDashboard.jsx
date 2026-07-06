import React, { useState, useEffect } from 'react';
import { useAuth } from '../App.jsx';
import Lightbox from '../components/Lightbox.jsx';
import OrderChatModal from '../components/OrderChatModal.jsx';
import { 
  Search, Sliders, Calendar, FileText, Send, User, MapPin, 
  Star, DollarSign, Phone, Eye, CheckCircle2, AlertTriangle, MessageSquare, Upload
} from 'lucide-react';

export default function RequesterDashboard() {
  const { user, profile, setUser, setProfile } = useAuth();
  
  // States
  const [writers, setWriters] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loadingWriters, setLoadingWriters] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [activeChatOrderId, setActiveChatOrderId] = useState(null);
  
  // Profile edit states
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [phone, setPhone] = useState(profile?.phone_number || '');
  const [pin, setPin] = useState(profile?.pin_code || '');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Sync profile details
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone_number || '');
      setPin(profile.pin_code || '');
    }
    if (user) {
      setUsername(user.username || '');
    }
  }, [profile, user]);

  // Lightbox State
  const [lightboxImage, setLightboxImage] = useState(null);
  const [lightboxTitle, setLightboxTitle] = useState('');
  
  // Hiring Dialog State
  const [selectedWriter, setSelectedWriter] = useState(null);
  
  // Form States
  const [topic, setTopic] = useState('');
  const [pages, setPages] = useState(1);
  const [deadline, setDeadline] = useState('');
  const [textAssets, setTextAssets] = useState('');
  const [documentFile, setDocumentFile] = useState(null);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Review Dialog State
  const [reviewOrder, setReviewOrder] = useState(null);
  const [rating, setRating] = useState(5);
  const [proofFile, setProofFile] = useState(null);
  const [reviewError, setReviewError] = useState('');

  // Update profile handler
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileSuccess('');
    setProfileError('');

    if (!fullName.trim() || !username.trim() || !phone || !pin) {
      setProfileError('All fields are required.');
      return;
    }

    setSavingProfile(true);
    const formData = new FormData();
    formData.append('full_name', fullName);
    formData.append('username', username);
    formData.append('phone_number', phone);
    formData.append('pin_code', pin);

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
      setProfileSuccess('Profile details updated successfully!');
    } catch (err) {
      setProfileError(err.message || 'Error updating profile. Please try again.');
    } finally {
      setSavingProfile(false);
    }
  };

  // Fetch initial data
  const fetchData = async () => {
    setLoadingWriters(true);
    setLoadingOrders(true);
    try {
      // 1. Fetch Marketplace Writers
      const writersRes = await fetch(`/api/writers/marketplace?pin_code=${profile?.pin_code || ''}`, {
        headers: {
          'x-user-id': user.id
        }
      });
      const writersData = await writersRes.json();
      setWriters(writersData);
      setLoadingWriters(false);

      // 2. Fetch My Orders
      const ordersRes = await fetch(`/api/orders/my-orders?user_id=${user.id}&role=requester`);
      const ordersData = await ordersRes.json();
      setOrders(ordersData);
      setLoadingOrders(false);
    } catch (err) {
      console.error(err);
      setLoadingWriters(false);
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Order Submission
  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!selectedWriter) {
      setFormError('Please select a writer from the marketplace first.');
      return;
    }
    if (!topic || !deadline || !pages || pages <= 0) {
      setFormError('Please fill in all order requirements.');
      return;
    }

    const formData = new FormData();
    formData.append('requester_id', user.id);
    formData.append('writer_id', selectedWriter.id);
    formData.append('pages', pages);
    formData.append('deadline', deadline);
    formData.append('topic', topic);
    formData.append('text_assets', textAssets);
    if (documentFile) {
      formData.append('document', documentFile);
    }

    try {
      const res = await fetch('/api/orders/create', {
        method: 'POST',
        body: formData
      });
      
      if (!res.ok) throw new Error('Failed to create order');
      
      setFormSuccess('Order placed successfully! The writer has been notified.');
      setTopic('');
      setPages(1);
      setDeadline('');
      setTextAssets('');
      setDocumentFile(null);
      setSelectedWriter(null);
      
      // Refresh Orders
      fetchData();
    } catch (err) {
      setFormError(err.message);
    }
  };

  // Status Updates
  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      const res = await fetch('/api/orders/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, status: newStatus, user_id: user.id })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Submit Review
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setReviewError('');

    if (!proofFile) {
      setReviewError('Proof of finished handwriting upload is mandatory.');
      return;
    }

    const formData = new FormData();
    formData.append('order_id', reviewOrder.id);
    formData.append('rating', rating);
    formData.append('user_id', user.id);
    formData.append('proof', proofFile);

    try {
      const res = await fetch('/api/orders/review', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error('Failed to submit review');

      setReviewOrder(null);
      setProofFile(null);
      setRating(5);
      
      // Trigger a confetti reward effect
      import('canvas-confetti').then(confetti => {
        confetti.default({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      });

      fetchData();
    } catch (err) {
      setReviewError(err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Overview/Welcome */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Welcome back, {profile?.full_name}!</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Find nearby writers, order custom handwritten documents, and track your active tasks.
          </p>
        </div>
        <div className="glass-panel" style={{ padding: '10px 20px', display: 'flex', gap: '15px' }}>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Location PIN</p>
            <p style={{ fontWeight: 600, color: 'var(--secondary)', fontFamily: 'monospace', fontSize: '0.9rem' }}>📍 {profile?.pin_code}</p>
          </div>
          <div style={{ borderLeft: '1px solid var(--border-glass)' }}></div>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Role</p>
            <p style={{ fontWeight: 600, color: 'var(--primary)' }}>Student (Requester)</p>
          </div>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.4fr 1fr',
        gap: '2rem',
        alignItems: 'start'
      }}>
        
        {/* LEFT COLUMN: Marketplace & Orders */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Section: Writer Marketplace */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Search size={20} style={{ color: 'var(--secondary)' }} />
              Writer Marketplace (Proximity Sorted)
            </h3>
            
            {loadingWriters ? (
              <p style={{ color: 'var(--text-muted)' }}>Loading writers...</p>
            ) : writers.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No writers registered yet.</p>
            ) : (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}>
                {writers.map(writer => (
                  <div key={writer.id} className="glass-panel glass-panel-hover" style={{
                    padding: '1.25rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1rem',
                  }}>
                    {/* Left: Info */}
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: 'var(--primary-glow)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--primary)',
                        fontSize: '1.2rem',
                        fontWeight: 700
                      }}>
                        {writer.full_name[0]}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h4 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{writer.full_name}</h4>
                          {writer.pinned_rank !== null && (
                            <span className="badge" style={{ backgroundColor: 'hsla(40, 95%, 55%, 0.1)', color: 'var(--accent-amber)', fontSize: '0.65rem' }}>
                              ⭐ PINNED #{writer.pinned_rank}
                            </span>
                          )}
                          {writer.isLocal && (
                            <span className="badge" style={{ backgroundColor: 'hsla(145, 80%, 50%, 0.1)', color: 'var(--accent-emerald)', fontSize: '0.65rem' }}>
                              Local Match
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '4px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <MapPin size={12} /> {writer.pin_code}
                            <span style={{ color: writer.proximityScore >= 15 ? 'var(--accent-emerald)' : writer.proximityScore >= 10 ? 'var(--secondary)' : writer.proximityScore > 0 ? 'var(--accent-amber)' : 'var(--text-muted)', fontSize: '0.72rem' }}>
                              ({writer.proximityScore >= 15 ? 'Area + Category' : writer.proximityScore >= 10 ? 'Same Area' : writer.proximityScore > 0 ? 'Near Area' : 'Remote'})
                            </span>
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Star size={12} style={{ color: 'var(--accent-amber)', fill: 'var(--accent-amber)' }} />
                            {writer.rating?.toFixed(1) || '5.0'} ({writer.completedCount} done)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Handwriting thumbnail, Price & Action */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                      {writer.handwriting_url && (
                        <div 
                          style={{
                            textAlign: 'center',
                            cursor: 'pointer',
                            position: 'relative'
                          }}
                          onClick={() => {
                            setLightboxImage(writer.handwriting_url);
                            setLightboxTitle(`${writer.full_name}'s Handwriting Sample`);
                          }}
                          title="View Handwriting Sample"
                        >
                          <div style={{
                            width: '56px',
                            height: '40px',
                            borderRadius: '4px',
                            overflow: 'hidden',
                            border: '1px solid var(--border-glass)',
                            position: 'relative',
                            backgroundColor: '#222'
                          }}>
                            <img src={writer.handwriting_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="handwriting" />
                            <div style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              background: 'rgba(0,0,0,0.4)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <Eye size={12} style={{ color: '#fff' }} />
                            </div>
                          </div>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>Style</span>
                        </div>
                      )}

                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--secondary)' }}>
                          ₹{writer.rate_per_page?.toFixed(2)}
                        </p>
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>per page</p>
                      </div>

                      <button
                        onClick={() => setSelectedWriter(writer)}
                        className="btn-primary"
                        style={{
                          padding: '8px 16px',
                          fontSize: '0.85rem',
                          backgroundColor: selectedWriter?.id === writer.id ? 'var(--accent-emerald)' : 'var(--primary)'
                        }}
                      >
                        {selectedWriter?.id === writer.id ? 'Selected' : 'Hire Me'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section: My Orders */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={20} style={{ color: 'var(--primary)' }} />
              My Orders & Transactions
            </h3>

            {loadingOrders ? (
              <p style={{ color: 'var(--text-muted)' }}>Loading orders...</p>
            ) : orders.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>You haven't placed any orders yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {orders.map(order => (
                  <div key={order.id} className="glass-panel" style={{
                    padding: '1.5rem',
                    borderLeft: `4px solid ${
                      order.status === 'completed' ? 'var(--accent-emerald)' :
                      order.status === 'accepted' ? 'var(--secondary)' :
                      order.status === 'disputed' ? 'var(--accent-rose)' :
                      'var(--accent-amber)'
                    }`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span className={`badge badge-${order.status}`}>{order.status}</span>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '8px' }}>{order.topic}</h4>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Order ID: {order.id} | Placed: {new Date(order.created_at).toLocaleDateString()}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>₹{order.total_price?.toFixed(2)}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{order.pages} pages</p>
                      </div>
                    </div>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1.2fr',
                      gap: '15px',
                      backgroundColor: 'rgba(0,0,0,0.2)',
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-sm)',
                      marginTop: '1.25rem',
                      fontSize: '0.85rem'
                    }}>
                      <div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Hired Writer</p>
                        <p style={{ fontWeight: 600 }}>{order.counterparty_name}</p>
                        {/* PRIVACY RULE: Show the phone number of the specific hired writer */}
                        <p style={{ color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px', fontWeight: 500 }}>
                          <Phone size={12} /> {order.counterparty_phone}
                        </p>
                      </div>
                      <div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Deadline</p>
                        <p style={{ fontWeight: 600 }}>📅 {new Date(order.deadline).toLocaleString()}</p>
                      </div>
                    </div>

                    {order.text_assets && (
                      <div style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '4px' }}>Text Content Supplied:</p>
                        <div style={{
                          maxHeight: '60px',
                          overflowY: 'auto',
                          background: 'rgba(0,0,0,0.1)',
                          padding: '8px',
                          borderRadius: '4px',
                          whiteSpace: 'pre-wrap',
                          fontFamily: 'monospace',
                          fontSize: '0.8rem',
                          color: 'var(--text-muted)'
                        }}>
                          {order.text_assets}
                        </div>
                      </div>
                    )}

                    {/* Order Action Buttons */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      gap: '10px',
                      marginTop: '1.25rem',
                      borderTop: '1px solid var(--border-glass)',
                      paddingTop: '1rem'
                    }}>
                      {order.status === 'pending' && (
                        <button 
                          onClick={() => handleUpdateStatus(order.id, 'disputed')}
                          className="btn-secondary" 
                          style={{ padding: '6px 12px', fontSize: '0.8rem', color: 'var(--accent-rose)' }}
                        >
                          <AlertTriangle size={14} /> Dispute
                        </button>
                      )}

                      {order.status === 'accepted' && (
                        <>
                          <button 
                            onClick={() => setActiveChatOrderId(order.id)}
                            className="btn-secondary" 
                            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                          >
                            💬 Chat with Writer
                          </button>
                          
                          <button 
                            onClick={() => handleUpdateStatus(order.id, 'disputed')}
                            className="btn-secondary" 
                            style={{ padding: '6px 12px', fontSize: '0.8rem', color: 'var(--accent-rose)' }}
                          >
                            <AlertTriangle size={14} /> Dispute
                          </button>
                          
                          <button 
                            onClick={() => setReviewOrder(order)}
                            className="btn-primary" 
                            style={{ padding: '6px 12px', fontSize: '0.8rem', backgroundColor: 'var(--accent-emerald)' }}
                          >
                            <CheckCircle2 size={14} /> Review & Approve
                          </button>
                        </>
                      )}

                      {order.status === 'disputed' && (
                        <p style={{ fontSize: '0.8rem', color: 'var(--accent-rose)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <AlertTriangle size={14} /> Disputed. Admin review pending.
                        </p>
                      )}

                      {order.status === 'completed' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                          {order.given_rating && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-amber)', fontSize: '0.85rem' }}>
                              Rating: {Array.from({ length: order.given_rating }).map((_, i) => (
                                <Star key={i} size={12} fill="var(--accent-amber)" style={{ color: 'var(--accent-amber)' }} />
                              ))}
                            </div>
                          )}
                          <span style={{ fontSize: '0.8rem', color: 'var(--accent-emerald)', fontWeight: 600 }}>Approved</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Placing New Orders */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div className="glass-panel" style={{ padding: '2.5rem', position: 'sticky', top: '7rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Send size={20} style={{ color: 'var(--primary)' }} />
              Submit Assignment Request
            </h3>

            {formError && (
              <div style={{ padding: '10px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-rose)', border: '1px solid var(--accent-rose)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', marginBottom: '1rem' }}>
                {formError}
              </div>
            )}

            {formSuccess && (
              <div style={{ padding: '10px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-emerald)', border: '1px solid var(--accent-emerald)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', marginBottom: '1rem' }}>
                {formSuccess}
              </div>
            )}

            {selectedWriter ? (
              <div className="glass-panel" style={{ padding: '12px 16px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Selected Writer</p>
                  <p style={{ fontWeight: 700, fontSize: '0.95rem' }}>✍️ {selectedWriter.full_name}</p>
                </div>
                <button 
                  onClick={() => setSelectedWriter(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--accent-rose)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}
                >
                  Change
                </button>
              </div>
            ) : (
              <div style={{ padding: '20px', border: '2px dashed var(--border-glass)', borderRadius: 'var(--radius-sm)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                👈 Click "Hire Me" next to any writer in the marketplace to start.
              </div>
            )}

            <form onSubmit={handlePlaceOrder} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Topic / Subject</label>
                <input 
                  type="text" 
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Physics Assignment 3"
                  className="form-input"
                  required
                  disabled={!selectedWriter}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">Page Count</label>
                  <input 
                    type="number" 
                    min="1"
                    max="100"
                    value={pages}
                    onChange={(e) => setPages(parseInt(e.target.value) || 1)}
                    className="form-input"
                    required
                    disabled={!selectedWriter}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Deadline</label>
                  <input 
                    type="datetime-local" 
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="form-input"
                    required
                    disabled={!selectedWriter}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Digital Notes / Text Content (Optional)</label>
                <textarea 
                  value={textAssets}
                  onChange={(e) => setTextAssets(e.target.value)}
                  placeholder="Paste the digital notes that the writer should write by hand..."
                  className="form-textarea"
                  rows={4}
                  disabled={!selectedWriter}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Reference Document Upload (Optional)</label>
                <div style={{
                  border: '1px dashed var(--border-glass)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px',
                  backgroundColor: 'hsla(230, 30%, 8%, 0.4)',
                  position: 'relative',
                  textAlign: 'center',
                  cursor: 'pointer'
                }}>
                  <input 
                    type="file" 
                    onChange={(e) => setDocumentFile(e.target.files[0])}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                    disabled={!selectedWriter}
                  />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {documentFile ? `✓ ${documentFile.name}` : 'Upload PDF/Doc instructions'}
                  </span>
                </div>
              </div>

              {selectedWriter && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '10px 0',
                  borderTop: '1px solid var(--border-glass)',
                  fontSize: '0.9rem'
                }}>
                  <span style={{ color: 'var(--text-muted)' }}>Estimated Price:</span>
                  <span style={{ fontWeight: 800, color: 'var(--secondary)' }}>
                    ₹{(pages * selectedWriter.rate_per_page).toFixed(2)}
                  </span>
                </div>
              )}

              <button 
                type="submit" 
                className="btn-primary" 
                style={{ width: '100%' }}
                disabled={!selectedWriter}
              >
                Confirm & Pay
              </button>
            </form>
          </div>

          {/* Profile & Settings Panel */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={18} style={{ color: 'var(--primary)' }} />
              Profile & Settings
            </h3>

            {profileSuccess && (
              <div style={{ padding: '10px 14px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-emerald)', border: '1px solid var(--accent-emerald)', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '1rem' }}>
                ✓ {profileSuccess}
              </div>
            )}

            {profileError && (
              <div style={{ padding: '10px 14px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-rose)', border: '1px solid var(--accent-rose)', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '1rem' }}>
                ⚠ {profileError}
              </div>
            )}

            <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.78rem' }}>Full Name</label>
                <input 
                  type="text" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="form-input"
                  style={{ padding: '9px 12px', fontSize: '0.88rem' }}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.78rem' }}>Username</label>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="form-input"
                  style={{ padding: '9px 12px', fontSize: '0.88rem' }}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.78rem' }}>Phone Number</label>
                <input 
                  type="tel" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="form-input"
                  style={{ padding: '9px 12px', fontSize: '0.88rem' }}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.78rem' }}>Location PIN Code</label>
                <input 
                  type="text" 
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="form-input"
                  style={{ padding: '9px 12px', fontSize: '0.88rem' }}
                  required
                  placeholder="e.g. 00000-aa-00"
                  maxLength={20}
                  pattern="[a-zA-Z0-9]{2,6}-[a-zA-Z]{1,4}-[0-9]{1,4}"
                  title="Format: area-code-sequence (e.g. 00000-aa-00)"
                />
              </div>

              <button 
                type="submit" 
                className="btn-secondary" 
                style={{ width: '100%', padding: '10px' }}
                disabled={savingProfile}
              >
                {savingProfile ? 'Saving...' : 'Update Settings'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Lightbox for Handwriting Thumbnail */}
      <Lightbox 
        src={lightboxImage} 
        title={lightboxTitle} 
        onClose={() => setLightboxImage(null)} 
      />

      {/* Review Modal Dialog */}
      {reviewOrder && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(5, 6, 12, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="glass-panel animate-fade-in" style={{
            width: '90%',
            maxWidth: '500px',
            padding: '2.5rem',
            boxShadow: 'var(--shadow-neon)',
            position: 'relative'
          }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '1.5rem' }}>Review & Approve Handwriting</h3>
            
            {reviewError && (
              <div style={{ padding: '10px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-rose)', border: '1px solid var(--accent-rose)', borderRadius: '4px', fontSize: '0.8rem', marginBottom: '1rem' }}>
                {reviewError}
              </div>
            )}

            <form onSubmit={handleSubmitReview} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Star Rating (1 - 5)</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star 
                      key={star} 
                      size={28} 
                      onClick={() => setRating(star)}
                      style={{ 
                        color: 'var(--accent-amber)', 
                        fill: star <= rating ? 'var(--accent-amber)' : 'none',
                        cursor: 'pointer' 
                      }} 
                    />
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Upload Completed Work Proof Image (Mandatory)</label>
                <div style={{
                  border: '2px dashed var(--border-glass)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '1.5rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  position: 'relative',
                  backgroundColor: 'hsla(230, 30%, 8%, 0.4)',
                }}>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => setProofFile(e.target.files[0])}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                    required
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <Upload size={24} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {proofFile ? `✓ File: ${proofFile.name}` : 'Upload photo of finished handwritten page'}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1rem' }}>
                <button type="button" onClick={() => setReviewOrder(null)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary" style={{ backgroundColor: 'var(--accent-emerald)' }}>Approve & Pay Out</button>
              </div>
            </form>
          </div>
        </div>
      )}

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
