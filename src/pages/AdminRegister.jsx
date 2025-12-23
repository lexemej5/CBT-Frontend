import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import '../styles/admin-auth.css';

export default function AdminRegister() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [passwordError, setPasswordError] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [registered, setRegistered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [resending, setResending] = useState(false);
  const [errorType, setErrorType] = useState(null); // 'invalid' or 'expired'
  const { register } = useAuth();
  const navigate = useNavigate();

  const isPasswordStrong = (pwd) => {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    return pwd.length >= 8 && /[A-Z]/.test(pwd) && /[a-z]/.test(pwd) && /[0-9]/.test(pwd);
  };

  const handlePasswordChange = (e) => {
    const pwd = e.target.value;
    setPassword(pwd);
    
    if (pwd.length === 0) {
      setPasswordError(null);
    } else if (pwd.length < 8) {
      setPasswordError('Password must be at least 8 characters');
    } else if (!/[A-Z]/.test(pwd)) {
      setPasswordError('Password must contain at least 1 uppercase letter');
    } else if (!/[a-z]/.test(pwd)) {
      setPasswordError('Password must contain at least 1 lowercase letter');
    } else if (!/[0-9]/.test(pwd)) {
      setPasswordError('Password must contain at least 1 number');
    } else {
      setPasswordError(null);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setMsg(null);
    
    if (!isPasswordStrong(password)) {
      setPasswordError('Password does not meet requirements');
      return;
    }
    
    setLoading(true);
    try {
      const res = await api.post('/admin/register', { name, email, password });
      if (res.data) {
        setMsg('Verification code sent to your email. Please check and enter it below.');
        setRegistered(true);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const verifyEmail = async (e) => {
    e.preventDefault();
    setError(null);
    setMsg(null);
    setErrorType(null);
    
    if (!verificationCode) {
      setError('Please enter the verification code');
      return;
    }
    
    setLoading(true);
    try {
      // Verify the email code - backend creates user after verification
      const verifyRes = await api.post('/admin/verify-email-code', { email, code: verificationCode });
      const apiKey = verifyRes.data.apiKey;
      
      // Store API key in localStorage for authentication
      localStorage.setItem('apiKey', apiKey);
      
      // Navigate to admin dashboard - user is now verified and created in database
      navigate('/admin');
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Invalid or expired verification code';
      const errType = err.response?.data?.type;
      setError(errorMsg);
      setErrorType(errType); // 'invalid' or 'expired'
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setResending(true);
    setError(null);
    setMsg(null);
    setErrorType(null);
    
    try {
      const res = await api.post('/admin/resend-verification-code', { email });
      setMsg('New verification code sent to your email');
      setVerificationCode('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="admin-auth-container-bg">
    <div className="admin-auth-container">
      <h2>Create Admin Account</h2>
      {!registered ? (
        <form onSubmit={submit} className="admin-auth-form">
          <div className="input-field">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
             <label>Name</label>
          </div>
          <div className="input-field">
            <input type="text" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@domain.com" />
             <label>Email</label>
            {error && (error.includes('email') || error.includes('registered')) && <div className="error">{error}</div>}
          </div>
          <div className="input-field">
            <div className="pw-field">
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={handlePasswordChange} placeholder="Choose a password" />
               <label>Password</label>
              <button type="button" className="password-toggle" onClick={() => setShowPassword(s => !s)}>{showPassword ? 'Hide' : 'Show'}</button>
            </div>
            {passwordError && <div className="error">{passwordError}</div>}
          </div>

          <div className="admin-auth-actions">
            <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Creating...' : 'Create Account'}</button>
            <button type="button" className="btn-secondary" onClick={() => navigate('/admin/login')}>Already have an account</button>
          </div>
        </form>
      ) : (
        <form onSubmit={verifyEmail} className="admin-auth-form">
          {msg && <div className="error" style={{ background: '#ecfccb', borderColor: '#bbf7d0', color:'#166534' }}>{msg}</div>}
          <label>Verification Code</label>
          <input 
            type="text" 
            value={verificationCode} 
            onChange={(e) => setVerificationCode(e.target.value)} 
            placeholder="Enter code from email"
            maxLength="6"
          />
          {error && (
            <div>
              <div className="error">{error}</div>
              {(errorType === 'expired' || error.includes('expired')) && (
                <button 
                  type="button" 
                  className="btn-resend" 
                  onClick={handleResendCode}
                  disabled={resending}
                  style={{ marginTop: '10px', width: '100%' }}
                >
                  {resending ? 'Resending...' : 'Resend Code'}
                </button>
              )}
              {(errorType === 'invalid' || (error.includes('Invalid') && !error.includes('expired'))) && (
                <button 
                  type="button" 
                  className="btn-resend" 
                  onClick={handleResendCode}
                  disabled={resending}
                  style={{ marginTop: '10px', width: '100%' }}
                >
                  {resending ? 'Resending...' : 'Resend Code'}
                </button>
              )}
            </div>
          )}
          <div className="admin-auth-actions">
            <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Verifying...' : 'Verify Email'}</button>
            <button type="button" className="btn-secondary" onClick={() => { setRegistered(false); setVerificationCode(''); setError(null); setErrorType(null); }}>Back</button>
          </div>
        </form>
      )}
    </div>
    </div>
  );
}
