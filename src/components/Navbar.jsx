import { Link, useLocation } from 'react-router-dom';
import { FiMenu, FiX } from 'react-icons/fi';
import { useState } from 'react';
import '../styles/navbar.css';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { isAdmin, logout, user } = useAuth();

  const titleCase = (n) => {
    if (!n) return n;
    return n.split(' ').map(part => part ? part.charAt(0).toUpperCase() + part.slice(1) : '').join(' ');
  };

  const displayName = (() => {
    const n = user?.name;
    if (!n) return user?.email || '';
    return titleCase(n);
  })();

  const toggleMenu = () => setIsOpen(!isOpen);

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          <span className="brand-icon">🧑‍💻</span>
          CBT System
        </Link>

        <div className={`nav-menu ${isOpen ? 'active' : ''}`}>
          <Link 
            to="/" 
            className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
            onClick={() => setIsOpen(false)}
          >
            Home
          </Link>
          <Link 
            to="/quizzes" 
            className={`nav-link ${location.pathname === '/quizzes' ? 'active' : ''}`}
            onClick={() => setIsOpen(false)}
          >
            Quizzes
          </Link>

          {isAdmin ? (
            <>
              {displayName && <span className="nav-user">Signed in: {displayName}</span>}
              <Link 
                to="/admin" 
                className={`nav-link admin-link ${location.pathname === '/admin' ? 'active' : ''}`}
                onClick={() => setIsOpen(false)}
              >
                Admin Panel
              </Link>
              <Link 
                to="/admin/create-quiz" 
                className={`nav-link admin-link ${location.pathname === '/admin/create-quiz' ? 'active' : ''}`}
                onClick={() => setIsOpen(false)}
              >
                Create Quiz
              </Link>
              <button className="toggle-admin-btn" onClick={() => { logout(); window.location.reload(); }}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/admin/login" className={`nav-link ${location.pathname === '/admin/login' ? 'active' : ''}`} onClick={() => setIsOpen(false)}>Admin Login</Link>
              <Link to="/admin/register" className={`nav-link ${location.pathname === '/admin/register' ? 'active' : ''}`} onClick={() => setIsOpen(false)}>Create Account</Link>
            </>
          )}
        </div>

        <button className="hamburger" onClick={toggleMenu}>
          {isOpen ? <FiX size={24} /> : <FiMenu size={24} />}
        </button>
      </div>
    </nav>
  );
}
