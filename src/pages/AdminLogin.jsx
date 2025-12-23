import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/admin-auth.css';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    const res = await login({ email, password });
    if (res.success) {
      navigate('/admin');
    } else {
      setError(res.error || 'Login failed');
    }
  };

  return (
      <div className="admin-auth-container-bg">
    <div className="admin-auth-container">
      <h2>Admin Login</h2>
      <form onSubmit={submit} className="admin-auth-form">
        <div className="input-field">
          <input type="text" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@domain.com" />
           <label>Email</label>
        </div>
        <div  className="input-field">
          <div className="pw-field">
            <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="" />
                <label>Password</label>
            <button type="button" className="password-toggle" onClick={() => setShowPassword(s => !s)}>{showPassword ? 'Hide' : 'Show'}</button>
          </div>
        </div>

        {error && <div className="error">{error}</div>}

        <div className="admin-auth-actions">
          <button type="submit" className="btn-primary">Login</button>
          <a href="/admin/forgot" className="small-link" style={{ marginLeft: 12 }}>Forgot password?</a>
        </div>
      </form>
    </div>
    </div>
  );
}
