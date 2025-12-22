import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [isAdmin, setIsAdmin] = useState(localStorage.getItem('isAdmin') === 'true');
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If apiKey exists in localStorage, try to fetch /api/admin/me
    const apiKey = localStorage.getItem('apiKey');
    if (!apiKey) return;
    (async () => {
      try {
        // ensure axios instance includes apiKey for subsequent requests
        api.defaults.headers.common['x-api-key'] = apiKey;
        const res = await api.get('/admin/me');
        setUser(res.data);
        setIsAdmin(res.data.role === 'admin');
        localStorage.setItem('isAdmin', res.data.role === 'admin' ? 'true' : 'false');
      } catch (err) {
        console.error('Failed to validate apiKey', err);
        localStorage.removeItem('apiKey');
        localStorage.removeItem('user');
        setUser(null);
        setIsAdmin(false);
      }
    })();
  }, []);

  const register = async ({ name, email, password }) => {
    setLoading(true);
    try {
      const res = await api.post('/admin/register', { name, email, password });
      const apiKey = res.data.apiKey;
        api.defaults.headers.common['x-api-key'] = apiKey;
      localStorage.setItem('apiKey', apiKey);
      // fetch user info
      const me = await api.get('/admin/me', { headers: { 'x-api-key': apiKey } });
      setUser(me.data);
      localStorage.setItem('user', JSON.stringify(me.data));
      setIsAdmin(me.data.role === 'admin');
      localStorage.setItem('isAdmin', me.data.role === 'admin' ? 'true' : 'false');
      return { success: true };
    } catch (err) {
      console.error('register error', err);
      return { success: false, error: err.response?.data?.error || err.message };
    } finally {
      setLoading(false);
    }
  };

  const login = async ({ email, password }) => {
    setLoading(true);
    try {
      const res = await api.post('/admin/login', { email, password });
      const { apiKey, name, isPaid, payment } = res.data;
      api.defaults.headers.common['x-api-key'] = apiKey;
      localStorage.setItem('apiKey', apiKey);
      const me = await api.get('/admin/me', { headers: { 'x-api-key': apiKey } });
      setUser(me.data);
      localStorage.setItem('user', JSON.stringify(me.data));
      setIsAdmin(me.data.role === 'admin');
      localStorage.setItem('isAdmin', me.data.role === 'admin' ? 'true' : 'false');
      return { success: true };
    } catch (err) {
      console.error('login error:', err);
      let errorMsg = 'Login failed';
      
      if (err.response?.data?.error) {
        errorMsg = err.response.data.error;
      } else if (err.message === 'Network Error') {
        errorMsg = 'Network error - is the server running?';
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setIsAdmin(false);
    setUser(null);
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('apiKey');
    localStorage.removeItem('user');
      delete api.defaults.headers.common['x-api-key'];
  };

  return (
    <AuthContext.Provider value={{ isAdmin, setIsAdmin, user, setUser, loading, setLoading, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
