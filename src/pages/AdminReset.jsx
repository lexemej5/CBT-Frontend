import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import '../styles/admin-auth.css';

export default function AdminReset() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [strength, setStrength] = useState('');

  useEffect(() => {
    if (!token || !email) {
      setError('Invalid reset link');
    }
  }, [token, email]);

  const computeStrength = (pw) => {
    if (!pw) return '';
    if (pw.length < 8) return 'Too short';
    let score = 0;
    if (/[a-z]/.test(pw)) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return 'Weak';
    if (score === 2) return 'Medium';
    return 'Strong';
  };

  const submit = async (e) => {
    e.preventDefault();
    setMsg(null);
    setError(null);
    const pw = String(password || '');
    const str = computeStrength(pw);
    setStrength(str);
    if (str === 'Too short') return setError('Password must be at least 8 characters');
    if (str === 'Weak') return setError('Password too weak. Include uppercase, numbers, or symbols');
    if (password !== confirm) return setError('Passwords do not match');
    setLoading(true);
    try {
      const res = await api.post('/admin/reset-password', { email, token, password });
      setMsg(res.data.message || 'Password reset successful');
      setTimeout(() => navigate('/admin/login'), 1500);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
      <div className="admin-auth-container-bg">
    <div className="admin-auth-container">
      <h2>Reset Password</h2>
      <form className="admin-auth-form" onSubmit={submit}>
        <div className="input-field">
        <div className="pw-field">
          <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => { setPassword(e.target.value); setStrength(computeStrength(e.target.value)); }} placeholder="" />
        <label>New Password</label>
          <button type="button" className="password-toggle" onClick={() => setShowPassword(s => !s)}>{showPassword ? 'Hide' : 'Show'}</button>
        </div>
        </div>
        {strength && <div style={{ marginTop: 6, marginBottom: 6 }}>Strength: <strong>{strength}</strong></div>}
        <div className="input-field">
        <div className="pw-field">
          <input type={showConfirm ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="" />
        <label>Confirm Password</label>
          <button type="button" className="password-toggle" onClick={() => setShowConfirm(s => !s)}>{showConfirm ? 'Hide' : 'Show'}</button>
        </div>
        </div>
        <div className="admin-auth-actions">
          <button className="btn-primary" type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save new password'}</button>
        </div>
        {error && <div className="error">{error}</div>}
        {msg && <div className="error" style={{ background: '#ecfccb', borderColor: '#bbf7d0', color:'#166534' }}>{msg}</div>}
      </form>
    </div>
    </div>
  );
}
