import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './AdminLogin.css';

const API_BASE = '';

const AdminLogin = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
        credentials: 'include',
      });

      const data = await res.json();

      if (data.success) {
        localStorage.removeItem('adminToken'); // Clean up old token if exists
        navigate('/admin/dashboard');
      } else {
        setError(data.message || 'Invalid password. Please try again.');
      }
    } catch (err) {
      console.error('Login failed:', err);
      setError('Unable to connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <div className="admin-login-logo">
          <div className="admin-login-logo-icon">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <h1>Admin Portal</h1>
          <p className="admin-login-subtitle">House of PurviSurbhi</p>
        </div>

        <form className="admin-login-form" onSubmit={handleSubmit}>
          <div className="admin-login-field">
            <label htmlFor="admin-password">Password</label>
            <input
              id="admin-password"
              type="password"
              placeholder="Enter admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
              disabled={loading}
            />
          </div>

          {error && (
            <div className="admin-login-error" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="admin-login-submit"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="admin-login-back">
          <Link to="/">← Back to Store</Link>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
