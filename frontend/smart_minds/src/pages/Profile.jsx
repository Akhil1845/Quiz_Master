import { useState, useEffect, useRef } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';

function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState({ username: '', email: '', avatar: '', password: '' });
  const [activities, setActivities] = useState([]);
  const fileRef = useRef(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('user') || 'null');
    if (u) setUser(u);
    const acts = JSON.parse(localStorage.getItem('quizActivity') || '[]');
    setActivities(acts.reverse());
  }, []);

  const handleAvatarChange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const data = await f.arrayBuffer();
    const b64 = btoa(String.fromCharCode(...new Uint8Array(data)));
    const mime = f.type || 'image/png';
    const dataUrl = `data:${mime};base64,${b64}`;
    setUser(prev => ({ ...prev, avatar: dataUrl }));
  };

  const handleSave = () => {
    // Persist to backend if user has an id
    const stored = JSON.parse(localStorage.getItem('user') || 'null');
    if (stored && stored.id) {
      fetch(`${API_BASE_URL}/users/${stored.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.username, email: user.email, avatar: user.avatar }),
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

  const handleActivityClick = (act) => {
    // Show simple options
    const action = window.prompt(`Activity: ${act.title}\nType 'details' to view, 'remove' to delete`);
    if (action === 'remove') {
      const updated = activities.filter(a => a.id !== act.id);
      setActivities(updated);
      localStorage.setItem('quizActivity', JSON.stringify(updated.reverse()));
    } else if (action === 'details') {
      alert(JSON.stringify(act, null, 2));
    }
  };

  return (
    <div style={styles.wrapper}>
      <main style={styles.main}>
        <div style={styles.container}>
          <div style={styles.card}>
        <h2>Profile</h2>
        <div style={styles.profileRow}>
          <div style={styles.avatarCol}>
            {user.avatar ? <img src={user.avatar} alt="avatar" style={styles.avatar} /> : <div style={styles.avatarPlaceholder}>No Image</div>}
            <input type="file" accept="image/*" ref={fileRef} style={{ display: 'none' }} onChange={handleAvatarChange} />
            <button onClick={() => fileRef.current.click()} style={styles.button}>Upload Photo</button>
          </div>
          <div style={styles.infoCol}>
            <label style={styles.label}>Username</label>
            <input value={user.username} onChange={e => setUser({ ...user, username: e.target.value })} style={styles.input} />
            <label style={styles.label}>Email</label>
            <input value={user.email} onChange={e => setUser({ ...user, email: e.target.value })} style={styles.input} />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={handleSave} style={styles.button}>Save</button>
              <button onClick={() => navigate('/dashboard')} style={styles.secondary}>Back</button>
            </div>
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

          <div style={styles.card}>
        <h3>Recent Activity</h3>
        {activities.length === 0 ? (
          <p>No recent quizzes attempted</p>
        ) : (
          <ul style={styles.activityList}>
            {activities.map(act => (
              <li key={act.id} style={styles.activityItem} onClick={() => handleActivityClick(act)}>
                <div style={{ fontWeight: 600, color: 'var(--text)' }}>{act.title}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{new Date(act.at).toLocaleString()}</div>
              </li>
            ))}
          </ul>
        )}
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
  card: { background: 'var(--card-bg)', padding: 20, borderRadius: 12, marginBottom: 16, boxShadow: 'var(--shadow)', width: '100%', maxWidth: 900 },
  profileRow: { display: 'flex', gap: 20, alignItems: 'center' },
  avatarCol: { width: 160, textAlign: 'center' },
  infoCol: { flex: 1 },
  avatar: { width: 120, height: 120, borderRadius: '50%', objectFit: 'cover', display: 'block', margin: '0 auto 8px' },
  avatarPlaceholder: { width: 120, height: 120, borderRadius: '50%', background: 'var(--card-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' },
  label: { fontSize: 14, color: 'var(--text)', marginTop: 8 },
  inputGroup: { position: 'relative' },
  input: { width: '100%', padding: '8px 40px 8px 10px', borderRadius: 8, border: '1px solid var(--border-color)', marginTop: 6, background: 'transparent', color: 'var(--text)' },
  button: { background: 'var(--accent)', color: 'var(--button-text)', border: 'none', padding: '8px 12px', borderRadius: 8, cursor: 'pointer' },
  secondary: { background: 'var(--card-bg)', border: 'none', padding: '8px 12px', borderRadius: 8, cursor: 'pointer', color: 'var(--text)' },
  eyeIcon: { position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 6, fontSize: 16 },
  activityList: { listStyle: 'none', padding: 0, margin: 0 },
  activityItem: { padding: 10, borderRadius: 8, cursor: 'pointer', marginBottom: 8, background: 'rgba(255,255,255,0.02)' }
};

export default Profile;
