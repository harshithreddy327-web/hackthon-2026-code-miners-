import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import Login from './pages/Login.jsx';
import RoleSelection from './pages/RoleSelection.jsx';
import RequesterDashboard from './pages/RequesterDashboard.jsx';
import WriterDashboard from './pages/WriterDashboard.jsx';
import HandwritingConverter from './pages/HandwritingConverter.jsx';
import AdminMCP from './pages/AdminMCP.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import Navbar from './components/Navbar.jsx';

export const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('neuroscribe_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem('neuroscribe_profile');
    return saved ? JSON.parse(saved) : null;
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      localStorage.setItem('neuroscribe_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('neuroscribe_user');
    }
  }, [user]);

  useEffect(() => {
    if (profile) {
      localStorage.setItem('neuroscribe_profile', JSON.stringify(profile));
    } else {
      localStorage.removeItem('neuroscribe_profile');
    }
  }, [profile]);

  const login = async (email) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/google-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      
      if (data.exists) {
        setUser(data.user);
        setProfile(data.profile);
        setLoading(false);
        return { success: true, user: data.user };
      } else {
        setLoading(false);
        return { success: false, isNew: true, email };
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
      return { success: false, error: err.message };
    }
  };

  // Google OAuth Login Verification
  const oauthLogin = async (credential) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/google-oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential })
      });
      const data = await res.json();
      if (!res.ok) {
        setLoading(false);
        return { success: false, error: data.error };
      }
      setUser(data.user);
      setProfile(data.profile);
      setLoading(false);
      return { success: true, user: data.user };
    } catch (err) {
      setLoading(false);
      return { success: false, error: err.message };
    }
  };

  // Gmail + Password Sign Up
  const signup = async (email, password, username) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, username })
      });
      const data = await res.json();
      if (!res.ok) {
        setLoading(false);
        return { success: false, error: data.error };
      }
      if (data.isNew) {
        // User created but no profile yet — store partial user for RoleSelection
        setUser(data.user);
        setLoading(false);
        return { success: true, isNew: true, email: data.email, user: data.user };
      }
      // Admin auto-created with full profile
      setUser(data.user);
      setProfile(data.profile);
      setLoading(false);
      return { success: true, user: data.user };
    } catch (err) {
      setLoading(false);
      return { success: false, error: err.message };
    }
  };

  // Gmail + Password Sign In
  const signin = async (email, password) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        setLoading(false);
        return { success: false, error: data.error };
      }
      if (data.isNew) {
        setUser(data.user);
        setLoading(false);
        return { success: true, isNew: true, email: data.email, user: data.user };
      }
      setUser(data.user);
      setProfile(data.profile);
      setLoading(false);
      return { success: true, user: data.user };
    } catch (err) {
      setLoading(false);
      return { success: false, error: err.message };
    }
  };

  // Switch Account Directly
  const switchAccount = async (targetUserId) => {
    if (!user) return { success: false, error: 'Not authenticated.' };
    setLoading(true);
    try {
      const res = await fetch('/api/auth/switch-to', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({ userId: targetUserId })
      });
      const data = await res.json();
      if (!res.ok) {
        setLoading(false);
        return { success: false, error: data.error };
      }
      setUser(data.user);
      setProfile(data.profile);
      setLoading(false);
      return { success: true, user: data.user };
    } catch (err) {
      setLoading(false);
      return { success: false, error: err.message };
    }
  };

  const register = async (formData) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register-profile', {
        method: 'POST',
        body: formData // Form data handles file uploads
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Registration failed');
      }

      const data = await res.json();
      setUser(data.user);
      setProfile(data.profile);
      setLoading(false);
      return { success: true, user: data.user };
    } catch (err) {
      console.error(err);
      setLoading(false);
      return { success: false, error: err.message };
    }
  };

  const logout = () => {
    setUser(null);
    setProfile(null);
    localStorage.removeItem('neuroscribe_user');
    localStorage.removeItem('neuroscribe_profile');
  };

  // Route protectors
  const ProtectedRoute = ({ children, allowedRoles }) => {
    if (!user) {
      return <Navigate to="/login" replace />;
    }
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      if (user.role === 'admin') return <Navigate to="/admin-mcp" replace />;
      if (user.role === 'requester') return <Navigate to="/requester-dashboard" replace />;
      if (user.role === 'writer') return <Navigate to="/writer-dashboard" replace />;
      return <Navigate to="/login" replace />;
    }
    return (
      <>
        <Navbar />
        <main className="animate-fade-in" style={{ 
          padding: '1.5rem 1.5rem 3rem', 
          maxWidth: '1280px', 
          margin: '0 auto',
          minHeight: 'calc(100vh - 80px)'
        }}>
          {children}
        </main>
      </>
    );
  };

  return (
    <AuthContext.Provider value={{ user, profile, login, oauthLogin, signup, signin, switchAccount, register, logout, loading, setUser, setProfile }}>
      <div className="falling-container">
        <div className="falling-leaf"></div>
        <div className="falling-leaf"></div>
        <div className="falling-leaf"></div>
        <div className="falling-leaf"></div>
        <div className="falling-leaf"></div>
        <div className="falling-leaf"></div>
      </div>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<RoleSelection />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          <Route path="/requester-dashboard" element={
            <ProtectedRoute allowedRoles={['requester']}>
              <RequesterDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/writer-dashboard" element={
            <ProtectedRoute allowedRoles={['writer']}>
              <WriterDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/converter" element={
            <ProtectedRoute allowedRoles={['requester', 'writer', 'admin']}>
              <HandwritingConverter />
            </ProtectedRoute>
          } />
          
          <Route path="/admin-mcp" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminMCP />
            </ProtectedRoute>
          } />
          
          <Route path="*" element={<Navigate to={user ? (user.role === 'admin' ? '/admin-mcp' : user.role === 'writer' ? '/writer-dashboard' : '/requester-dashboard') : '/login'} replace />} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}
