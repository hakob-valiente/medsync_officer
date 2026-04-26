import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { ShieldCheck, ArrowRight, KeyRound, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const usernameRef = useRef<HTMLInputElement>(null);

  // Focus username input on mount
  useEffect(() => {
    usernameRef.current?.focus();
  }, []);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError('Please enter your username and password');
      return;
    }
    setError('');
    setLoading(true);

    const result = await login(username, password);

    setLoading(false);

    if (result.success) {
      setSuccess('Login successful! Redirecting...');
      setTimeout(() => navigate('/dashboard'), 1500);
    } else {
      setError(result.error || 'Failed to login');
    }
  };

  return (
    <div className="login-page">
      {/* Animated background elements */}
      <div className="login-bg-pattern">
        <div className="login-bg-orb login-bg-orb--1" />
        <div className="login-bg-orb login-bg-orb--2" />
        <div className="login-bg-orb login-bg-orb--3" />
      </div>

      <div className="login-container">
        {/* Left panel — Branding */}
        <div className="login-brand-panel">
          <div className="login-brand-content">
            <div className="login-brand-logo">
              <img src="/logo.png" alt="PLV MedSync" className="login-brand-logo-img" />
            </div>
            <h1 className="login-brand-title">PLV MedSync</h1>
            <p className="login-brand-subtitle">Clinic Officer Portal</p>
            <div className="login-brand-divider" />
            <p className="login-brand-desc">
              Secure access to manage appointments, patient records, inventory, and clinic operations.
            </p>
            <div className="login-brand-features">
              <div className="login-brand-feature">
                <ShieldCheck size={16} />
                <span>Authorized Officers Only</span>
              </div>
              <div className="login-brand-feature">
                <KeyRound size={16} />
                <span>Secure Authentication</span>
              </div>
            </div>
          </div>

          {/* Decorative pattern */}
          <div className="login-brand-pattern" />
        </div>

        {/* Right panel — Login form */}
        <div className="login-form-panel">
          <div className="login-form-wrapper">

            <div className="login-form-content fade-in">
              <div className="login-form-header">
                <h2 className="login-form-title">Welcome Officer</h2>
                <p className="login-form-desc">Enter your credentials to login</p>
              </div>

              <div className="login-input-group" style={{ marginBottom: '1rem' }}>
                <label className="login-label" htmlFor="login-username">Username</label>
                <div className="login-input-wrapper">
                  <ShieldCheck size={18} className="login-input-icon" />
                  <input
                    ref={usernameRef}
                    id="login-username"
                    type="text"
                    className="login-input"
                    placeholder="Enter your student number / officer ID"
                    value={username}
                    onChange={e => { setUsername(e.target.value); setError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    disabled={loading}
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="login-input-group">
                <label className="login-label" htmlFor="login-password">Password</label>
                <div className="login-input-wrapper">
                  <KeyRound size={18} className="login-input-icon" />
                  <input
                    id="login-password"
                    type="password"
                    className="login-input"
                    placeholder="Enter your password"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    disabled={loading}
                    autoComplete="current-password"
                  />
                </div>
              </div>

              {error && (
                <div className="login-error fade-in" style={{ marginTop: '1rem' }}>
                  <AlertCircle size={14} />
                  <span>{error}</span>
                </div>
              )}
              
              {success && (
                <div className="login-success fade-in" style={{ marginTop: '1rem' }}>
                  <CheckCircle2 size={14} />
                  <span>{success}</span>
                </div>
              )}

              <button
                className="login-btn login-btn--primary"
                onClick={handleLogin}
                disabled={loading || !username.trim() || !password.trim()}
                style={{ marginTop: '1.5rem' }}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="login-spinner" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>

            <p className="login-footer-text">
              PLV MedSync Officer Portal © {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

