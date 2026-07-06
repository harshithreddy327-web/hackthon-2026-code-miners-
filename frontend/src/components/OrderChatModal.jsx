import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X } from 'lucide-react';

export default function OrderChatModal({ orderId, currentUserId, onClose }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/messages?order_id=${orderId}`);
      const data = await res.json();
      if (res.ok) {
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000); // Poll every 3 seconds
    return () => clearInterval(interval);
  }, [orderId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const txt = newMessage;
    setNewMessage('');

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          sender_id: currentUserId,
          message_text: txt
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to send message.');
      } else {
        setError('');
        setMessages(prev => [...prev, data.message]);
      }
    } catch (err) {
      setError('Connection error. Failed to send message.');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
    }}>
      {/* Click outside to close */}
      <div 
        onClick={onClose} 
        style={{ position: 'absolute', inset: 0, zIndex: 999 }} 
      />

      <div className="glass-panel animate-scale-in" style={{
        width: '100%',
        maxWidth: '480px',
        height: '580px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid var(--border-glass)',
        boxShadow: 'var(--shadow-neon)',
        position: 'relative',
        zIndex: 1000
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 20px',
          borderBottom: '1px solid var(--border-glass)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'hsla(230, 40%, 10%, 0.8)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquare size={18} style={{ color: 'var(--secondary)' }} />
            <h4 style={{ fontWeight: 700, margin: 0 }}>Assignment Discussion</h4>
          </div>
          <button 
            onClick={onClose} 
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              display: 'flex',
              padding: '4px',
              transition: 'color 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <X size={18} />
          </button>
        </div>

        {/* Messages list */}
        <div style={{
          flex: 1,
          padding: '20px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          background: 'rgba(0,0,0,0.15)'
        }}>
          {loading && messages.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.88rem' }}>
              Loading messages...
            </p>
          ) : messages.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '4rem 1.5rem',
              color: 'var(--text-muted)',
              fontSize: '0.88rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px'
            }}>
              <MessageSquare size={32} style={{ color: 'var(--border-glass)' }} />
              <span>No messages yet. Send a message to start coordinating!</span>
            </div>
          ) : (
            messages.map(msg => {
              const isMe = msg.sender_id === currentUserId;
              const roleColors = {
                admin: 'var(--accent-rose)',
                writer: 'var(--secondary)',
                requester: 'var(--primary)',
              };
              const roleLabel = msg.role === 'writer' ? 'Writer' : msg.role === 'admin' ? 'Admin' : 'Student';
              
              return (
                <div 
                  key={msg.id} 
                  style={{
                    alignSelf: isMe ? 'flex-end' : 'flex-start',
                    maxWidth: '78%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isMe ? 'flex-end' : 'flex-start'
                  }}
                >
                  <span style={{ 
                    fontSize: '0.68rem', 
                    color: isMe ? 'var(--text-muted)' : roleColors[msg.role] || 'var(--text-muted)', 
                    marginBottom: '3px', 
                    fontWeight: 600 
                  }}>
                    {isMe ? 'You' : msg.full_name || 'Partner'} ({roleLabel})
                  </span>
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: '12px',
                    borderTopRightRadius: isMe ? '2px' : '12px',
                    borderTopLeftRadius: isMe ? '12px' : '2px',
                    background: isMe
                      ? 'linear-gradient(135deg, var(--primary), var(--primary-glow))'
                      : 'rgba(255,255,255,0.06)',
                    border: isMe ? 'none' : '1px solid var(--border-glass)',
                    color: 'var(--text-primary)',
                    fontSize: '0.88rem',
                    lineHeight: 1.4,
                    wordBreak: 'break-word',
                    boxShadow: isMe ? '0 2px 10px rgba(139,92,246,0.15)' : 'none'
                  }}>
                    {msg.message_text}
                  </div>
                  <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)',
            color: 'var(--accent-rose)',
            padding: '8px 20px',
            fontSize: '0.8rem',
            borderTop: '1px solid rgba(239,68,68,0.15)'
          }}>
            {error}
          </div>
        )}

        {/* Message Input form */}
        <form 
          onSubmit={handleSendMessage} 
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--border-glass)',
            background: 'hsla(230, 40%, 8%, 0.9)',
            display: 'flex',
            gap: '10px',
            alignItems: 'center'
          }}
        >
          <input
            type="text"
            placeholder="Type your message..."
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--border-glass)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 14px',
              color: 'var(--text-primary)',
              fontSize: '0.88rem',
              outline: 'none',
              transition: 'border-color 0.2s'
            }}
            onFocus={e => e.currentTarget.style.borderColor = 'var(--primary)'}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--border-glass)'}
          />
          <button 
            type="submit" 
            className="btn-primary" 
            style={{
              padding: '10px 16px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              boxShadow: 'none'
            }}
          >
            <Send size={14} />
          </button>
        </form>
      </div>
    </div>
  );
}
