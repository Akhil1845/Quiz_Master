import { useState, useEffect, useRef } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';

function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState({ username: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('user') || 'null');
    if (u) {
      setUser(u);
    }
  }, []);

  const handleSave = () => {
    // Persist to backend if user has an id
    const stored = JSON.parse(localStorage.getItem('user') || 'null');
    if (stored && stored.id) {
      fetch(`${API_BASE_URL}/users/${stored.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.username, email: user.email }),
      }).then(r => r.json()).then(res => {
        if (res && res.success) {
          localStorage.setItem('user', JSON.stringify(res.user));
          setUser(res.user);
          alert('Profile saved');
        } else {
          // fallback to local
          localStorage.setItem('user', JSON.stringify(user));
          alert('Profile saved locally (server did not respond)');
        }
      }).catch(err => {
        localStorage.setItem('user', JSON.stringify(user));
        alert('Profile saved locally (server error)');
      });
    } else {
      localStorage.setItem('user', JSON.stringify(user));
      alert('Profile saved locally');
    }
  };

  const handleChangePassword = () => {
    const stored = JSON.parse(localStorage.getItem('user') || 'null');
    if (stored && stored.id) {
      fetch(`${API_BASE_URL}/users/${stored.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: user.password }),
      }).then(r => r.json()).then(res => {
        if (res && res.success) {
          localStorage.setItem('user', JSON.stringify(res.user));
          setUser(res.user);
          alert('Password updated');
        } else {
          localStorage.setItem('user', JSON.stringify(user));
          alert('Password updated locally');
        }
      }).catch(err => {
        localStorage.setItem('user', JSON.stringify(user));
        alert('Password updated locally (server error)');
      });
    } else {
      localStorage.setItem('user', JSON.stringify(user));
      alert('Password updated locally');
    }
  };

  return (
    <div style={styles.wrapper}>
      <main style={styles.main}>
        <div style={styles.container}>
          <div style={styles.card}>
            <h2>Profile</h2>
            <div style={styles.profileForm}>
              <label style={styles.label}>Username</label>
              <input value={user.username} onChange={e => setUser({ ...user, username: e.target.value })} style={styles.input} />
              <label style={styles.label}>Email</label>
              <input value={user.email} onChange={e => setUser({ ...user, email: e.target.value })} style={styles.input} />
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button onClick={handleSave} style={styles.button}>Save</button>
                <button onClick={() => navigate('/dashboard')} style={styles.secondary}>Back</button>
              </div>
            </div>

            <hr style={{ margin: '1rem 0' }} />

            <h3>Change Password</h3>
            <div style={styles.inputGroup}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="New password"
                value={user.password}
                onChange={e => setUser({ ...user, password: e.target.value })}
                style={styles.input}
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword(s => !s)}
                style={styles.eyeIcon}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            <div style={{ marginTop: 8 }}>
              <button onClick={handleChangePassword} style={styles.button}>Update Password</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

const styles = {
  wrapper: {
    minHeight: '100vh',
    width: '100vw',
    background: 'var(--bg)',
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    position: 'relative',
    overflow: 'hidden',
    padding: '2rem 1rem',
  },
  main: {
    position: 'relative',
    zIndex: 2,
    maxWidth: '1200px',
    margin: '0 auto',
  },
  container: {
    marginTop: '1rem',
    maxWidth: '100%',
    padding: '0 1rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: '1rem',
  },
  card: { background: 'var(--card-bg)', padding: 20, borderRadius: 12, marginBottom: 16, boxShadow: 'var(--shadow)', width: '100%', maxWidth: 600, boxSizing: 'border-box' },
  profileForm: { display: 'flex', flexDirection: 'column', gap: 12 },
  label: { fontSize: 14, color: 'var(--text)', marginTop: 8, display: 'block' },
  inputGroup: { position: 'relative', maxWidth: '100%' },
  input: { width: '100%', maxWidth: '100%', padding: '8px 40px 8px 10px', borderRadius: 8, border: '1px solid var(--border-color)', marginTop: 6, background: 'transparent', color: 'var(--text)', boxSizing: 'border-box' },
  button: { background: 'var(--accent)', color: 'var(--button-text)', border: 'none', padding: '8px 12px', borderRadius: 8, cursor: 'pointer' },
  secondary: { background: 'var(--card-bg)', border: 'none', padding: '8px 12px', borderRadius: 8, cursor: 'pointer', color: 'var(--text)' },
  eyeIcon: { position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 6, fontSize: 16 },
};

export default Profile;
