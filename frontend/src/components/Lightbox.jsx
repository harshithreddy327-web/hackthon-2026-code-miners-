import React from 'react';
import { X, Download } from 'lucide-react';

export default function Lightbox({ src, title, onClose }) {
  if (!src) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(5, 6, 12, 0.9)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '2rem'
    }} onClick={onClose}>
      <div style={{
        position: 'relative',
        maxWidth: '90%',
        maxHeight: '90%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem',
      }} onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button onClick={onClose} style={{
          position: 'absolute',
          top: '-2.5rem',
          right: 0,
          background: 'none',
          border: 'none',
          color: 'var(--text-primary)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontWeight: 600,
          fontSize: '0.9rem'
        }}>
          <X size={20} /> Close
        </button>

        <div className="glass-panel" style={{
          padding: '1rem',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--bg-card)',
          overflow: 'hidden',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          boxShadow: 'var(--shadow-neon)'
        }}>
          {src.endsWith('.png') || src.endsWith('.jpg') || src.endsWith('.jpeg') || src.startsWith('data:image') || src.includes('mock') ? (
            <img 
              src={src} 
              alt={title || "Handwriting sample"} 
              style={{
                maxWidth: '100%',
                maxHeight: '70vh',
                objectFit: 'contain',
                borderRadius: 'var(--radius-sm)'
              }}
            />
          ) : (
            // For mock text uploads (where we just wrote a string text to a text file)
            <div style={{
              width: '400px',
              height: '300px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: 'white',
              color: '#1a1a1a',
              fontFamily: '"Caveat", cursive',
              fontSize: '2rem',
              padding: '2rem',
              textAlign: 'center',
              border: '2px solid #ccc',
              borderRadius: '8px',
              boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
            }}>
              <p style={{ margin: 0 }}>✏️ Handwriting Sample</p>
              <hr style={{ width: '80%', margin: '1rem 0', borderColor: '#eee' }} />
              <p style={{ fontSize: '1.5rem', color: '#555' }}>
                "This is a preview representation of {title || 'the writer'}'s handwriting style."
              </p>
            </div>
          )}
        </div>

        <div style={{
          textAlign: 'center'
        }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>{title}</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>Handwriting Sample Preview</p>
        </div>
      </div>
    </div>
  );
}
