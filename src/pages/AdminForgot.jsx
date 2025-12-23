import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import '../styles/admin-auth.css';

export default function AdminForgot() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorType, setErrorType] = useState(null);
  const [code, setCode] = useState('');
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    console.log('[Forgot] submit triggered for', email);
    setMsg(null);
    setError(null);
    setLoading(true);
    try {
      const res = await api.post('/admin/forgot-password', { email });
      setMsg(res.data.message || 'Password reset code sent');
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const verify = async (e) => {
    e?.preventDefault?.();
    setMsg(null);
    setError(null);
    if (!code) return setError('Enter verification code');
    const codeNormalized = (code || '').trim().toUpperCase();
    setLoading(true);
    try {
      await api.post('/admin/verify-reset-code', { email, code: codeNormalized });
      // navigate to reset page with token and email (use normalized token)
      navigate(`/admin/reset?token=${encodeURIComponent(codeNormalized)}&email=${encodeURIComponent(email)}`);
    } catch (err) {
      const resp = err.response?.data;
      setError(resp?.error || err.message);
      setErrorType(resp?.type || null);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setMsg(null);
    setLoading(true);
    try {
      const res = await api.post('/admin/resend-reset-code', { email });
      setMsg(res.data.message || 'Reset code resent');
      setErrorType(null);
      setSent(true);
      if (res.data.code) console.log('[Forgot] dev reset code:', res.data.code);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-auth-container-bg">
    <div className="admin-auth-container">
      <h2>Forgot Password</h2>

      {/* Show send form only when not yet sent */}
      {!sent && (
        <form className="admin-auth-form" onSubmit={submit}>
          <div className="input-field">
          <input type="text" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@domain.com" />
          <label>Email</label>
          </div>
          <div className="admin-auth-actions">
            <button className="btn-primary" type="submit" disabled={loading}>{loading ? 'Sending...' : 'Send code'}</button>
          </div>
          {msg && <div className="error" style={{ background: '#ecfccb', borderColor: '#bbf7d0', color:'#166534' }}>{msg}</div>}
          {error && <div className="error">{error}</div>}
        </form>
      )}

      {/* Show verification form only after code was sent */}
      {sent && (
        <form className="admin-auth-form" onSubmit={verify} style={{ marginTop: 12 }}>
          <label>Verification code</label>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter code from email" />
          <div className="admin-auth-actions">
            <button className="btn-primary" type="submit" disabled={loading}>{loading ? 'Verifying...' : 'Verify code'}</button>
          </div>
          {msg && <div className="error" style={{ background: '#ecfccb', borderColor: '#bbf7d0', color:'#166534' }}>{msg}</div>}
          {error && <div className="error">{error}</div>}
          {/* Allow user to resend code from the verify form (also shown when invalid/expired) */}
          <div style={{ marginTop: 8 }}>
            <button type="button" className="btn-secondary" onClick={handleResend} disabled={loading}>Resend code</button>
          </div>
          <div style={{ marginTop: 8 }}>
            <button type="button" className="btn-secondary" onClick={() => { setSent(false); setCode(''); setError(null); setMsg(null); }} disabled={loading}>Back</button>
          </div>
        </form>
      )}
    </div>
    </div>
  );
}
