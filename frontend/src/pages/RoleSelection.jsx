import React, { useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../App.jsx';
import { BookOpen, DollarSign, Upload, User, Phone, MapPin, CheckCircle2 } from 'lucide-react';

export default function RoleSelection() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { register, loading } = useAuth();
  
  const email = state?.email;
  const userId = state?.userId;

  // If no email state was passed, redirect to login
  if (!email) {
    return <Navigate to="/login" replace />;
  }

  const [role, setRole] = useState(null); // 'requester' or 'writer'
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [ratePerPage, setRatePerPage] = useState('');
  const [handwritingFile, setHandwritingFile] = useState(null);
  const [handwritingPreview, setHandwritingPreview] = useState(null);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setHandwritingFile(file);
      setHandwritingPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!role) {
      setError('Please select a path.');
      return;
    }
    if (!fullName || !phone || !pinCode) {
      setError('Please fill in all standard details.');
      return;
    }
    if (role === 'writer') {
      if (!ratePerPage || parseFloat(ratePerPage) <= 0) {
        setError('Writers must set a valid price per page.');
        return;
      }
      if (!handwritingFile) {
        setError('Writers must upload a clear handwriting sample image.');
        return;
      }
    }

    const formData = new FormData();
    if (userId) {
      formData.append('userId', userId);
    }
    formData.append('email', email);
    formData.append('role', role);
    formData.append('full_name', fullName);
    formData.append('phone_number', phone);
    formData.append('pin_code', pinCode);
    
    if (role === 'writer') {
      formData.append('rate_per_page', ratePerPage);
      formData.append('handwriting', handwritingFile);
    }

    const result = await register(formData);
    
    if (result.success) {
      if (role === 'writer') {
        navigate('/writer-dashboard');
      } else {
        navigate('/requester-dashboard');
      }
    } else {
      setError(result.error || 'Setup failed. Please try again.');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2.5rem',
      position: 'relative'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '650px',
        padding: '3rem',
        boxShadow: 'var(--shadow-neon)',
        border: '1px solid var(--border-glass)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Complete Your Profile Setup
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '6px' }}>
            Setting up account for <b>{email}</b>
          </p>
        </div>

        {error && (
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--accent-rose)',
            color: 'var(--accent-rose)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px',
            marginBottom: '1.5rem',
            fontSize: '0.85rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* STEP 1: Select Role */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label className="form-label">Step 1: Choose your path</label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1.5rem'
            }}>
              {/* Student Option */}
              <div 
                onClick={() => setRole('requester')}
                className="glass-panel"
                style={{
                  padding: '1.5rem',
                  cursor: 'pointer',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '10px',
                  borderWidth: '2px',
                  borderColor: role === 'requester' ? 'var(--primary)' : 'var(--border-glass)',
                  backgroundColor: role === 'requester' ? 'var(--bg-card-hover)' : 'var(--bg-card)',
                  transform: role === 'requester' ? 'scale(1.02)' : 'none',
                }}
              >
                <BookOpen size={36} style={{ color: role === 'requester' ? 'var(--primary)' : 'var(--text-muted)' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>I am a Student</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>I need assignments written in neat handwriting.</p>
              </div>

              {/* Writer Option */}
              <div 
                onClick={() => setRole('writer')}
                className="glass-panel"
                style={{
                  padding: '1.5rem',
                  cursor: 'pointer',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '10px',
                  borderWidth: '2px',
                  borderColor: role === 'writer' ? 'var(--primary)' : 'var(--border-glass)',
                  backgroundColor: role === 'writer' ? 'var(--bg-card-hover)' : 'var(--bg-card)',
                  transform: role === 'writer' ? 'scale(1.02)' : 'none',
                }}
              >
                <DollarSign size={36} style={{ color: role === 'writer' ? 'var(--primary)' : 'var(--text-muted)' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>I am a Writer</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>I want to write pages by hand and earn money.</p>
              </div>
            </div>
          </div>

          {/* STEP 2: Profile Details */}
          {role && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <label className="form-label">Step 2: Profile details</label>
              
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full real name"
                    className="form-input"
                    required
                  />
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1.25rem'
              }}>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 99999 99999"
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Location PIN Code</label>
                  <input
                    type="text"
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value)}
                    placeholder="e.g. 00000-aa-00"
                    className="form-input"
                    maxLength={20}
                    pattern="[a-zA-Z0-9]{2,6}-[a-zA-Z]{1,4}-[0-9]{1,4}"
                    title="Format: area-category-sequence (e.g. 00000-aa-00)"
                    required
                  />
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Format: <code style={{ fontFamily: 'monospace', color: 'var(--secondary)' }}>00000-aa-00</code> — area · category · sequence
                  </p>
                </div>
              </div>

              {/* Writer Specific Fields */}
              {role === 'writer' && (
                <div className="animate-fade-in" style={{
                  borderTop: '1px solid var(--border-glass)',
                  paddingTop: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.25rem'
                }}>
                  <div className="form-group">
                    <label className="form-label">Price Per Page (₹)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.5"
                      value={ratePerPage}
                      onChange={(e) => setRatePerPage(e.target.value)}
                      placeholder="e.g. 4.5"
                      className="form-input"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Mandatory Handwriting Sample Upload</label>
                    <div style={{
                      border: '2px dashed var(--border-glass)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '1.5rem',
                      textAlign: 'center',
                      cursor: 'pointer',
                      position: 'relative',
                      backgroundColor: 'hsla(230, 30%, 8%, 0.4)',
                      transition: 'border-color 0.2s',
                    }}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          opacity: 0,
                          cursor: 'pointer'
                        }}
                        required
                      />
                      
                      {handwritingPreview ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                          <CheckCircle2 size={32} style={{ color: 'var(--accent-emerald)' }} />
                          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>File Uploaded!</span>
                          <img 
                            src={handwritingPreview} 
                            alt="Handwriting preview" 
                            style={{ maxWidth: '120px', maxHeight: '80px', borderRadius: '4px', marginTop: '4px', objectFit: 'contain' }} 
                          />
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                          <Upload size={32} style={{ color: 'var(--text-muted)' }} />
                          <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Upload JPEG/PNG handwriting photo</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Click or drag and drop</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="btn-primary"
                style={{
                  width: '100%',
                  padding: '14px',
                  fontSize: '1.05rem',
                  marginTop: '1rem',
                }}
                disabled={loading}
              >
                Complete Onboarding
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
