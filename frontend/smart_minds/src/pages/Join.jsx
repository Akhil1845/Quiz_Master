import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

function Join() {
  const { quizCode } = useParams();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [userId, setUserId] = useState(() => localStorage.getItem('userId'));
  const [username, setUsername] = useState(() => localStorage.getItem('username') || '');
  const [connected, setConnected] = useState(false);
  const [ws, setWs] = useState(null);
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    // Ensure there's a userId available
    if (!userId) {
      const id = `user-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('userId', id);
      setUserId(id);
    }
  }, [userId]);

  const handleJoin = () => {
    if (!userId) return;
    const finalName = username?.trim() || `Guest-${userId.substring(5, 9)}`;
    localStorage.setItem('username', finalName);
    setStatus('connecting');

    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const { WS_HOST, WS_PORT } = require('../config').default;
    const host = WS_HOST || window.location.hostname;
    const port = WS_PORT || 3002;
    const wsUrl = new URL(`${proto}://${host}:${port}`);
    wsUrl.searchParams.append('quizCode', quizCode);
    wsUrl.searchParams.append('userId', userId);
    wsUrl.searchParams.append('username', finalName);
    wsUrl.searchParams.append('isHost', 'false');

    try {
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        setConnected(true);
        setStatus('connected');
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'quiz-starting') {
            // Navigate to quiz as participant
            navigate(`/quiz/${quizCode}`);
          }
        } catch (err) {
          console.error('Error parsing ws message', err);
        }
      };

      socket.onerror = (err) => {
        console.error('WebSocket error', err);
        setStatus('error');
      };

      socket.onclose = () => {
        setConnected(false);
        if (status !== 'error') setStatus('closed');
      };

      setWs(socket);
    } catch (err) {
      console.error('Failed to create WebSocket', err);
      setStatus('error');
    }
  };

  const handleLeave = () => {
    if (ws) ws.close();
    navigate('/');
  };

  return (
    <div style={styles.wrapper}>
      <main style={styles.main}>
        <div style={styles.container}>
          <h1 style={styles.title}>Join Quiz</h1>

          <div style={styles.card}>
            <p style={{ color: 'var(--muted)' }}>Quiz Code: <strong style={{ color: 'var(--accent)' }}>{quizCode}</strong></p>

            {!connected ? (
              <div style={styles.form}>
                <label style={styles.label}>
                  Your name (optional):
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter display name"
                    style={styles.input}
                  />
                </label>

                <div style={styles.buttonGroup}>
                  <button style={styles.secondaryBtn} onClick={() => navigate('/')}>Cancel</button>
                  <button style={styles.primaryBtn} onClick={handleJoin}>Join Quiz</button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <p style={{ marginBottom: 8 }}>Waiting for host to start the quiz...</p>
                <button style={styles.secondaryBtn} onClick={handleLeave}>Leave</button>
              </div>
            )}

            {status === 'connecting' && <p style={{ marginTop: 12 }}>Connecting...</p>}
            {status === 'error' && <p style={{ marginTop: 12, color: 'red' }}>Connection failed. Try again.</p>}
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
  card: {
    backgroundColor: 'var(--card-bg)',
    borderRadius: '16px',
    padding: '2rem',
    boxShadow: 'var(--shadow)',
    textAlign: 'center',
    width: '100%',
    maxWidth: '640px',
  },
  title: {
    textAlign: 'center',
    color: 'var(--text)',
    margin: '0 0 1rem 0',
    fontSize: '1.75rem',
    fontWeight: '700',
    background: 'linear-gradient(90deg, var(--accent), #7c3aed)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    display: 'inline-block',
  },
  form: {
    width: '100%',
    boxSizing: 'border-box',
    marginTop: '1rem',
  },
  label: {
    display: 'block',
    marginBottom: '0.5rem',
    color: 'var(--muted)',
    fontWeight: '500',
    textAlign: 'left',
  },
  input: {
    width: '100%',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
    fontSize: '1rem',
    marginTop: '0.5rem',
    boxSizing: 'border-box',
    background: 'transparent',
    color: 'var(--text)'
  },
  buttonGroup: {
    display: 'flex',
    gap: '1rem',
    marginTop: '1.5rem',
    justifyContent: 'center',
  },
  primaryBtn: {
    flex: '1 1 45%',
    minWidth: '120px',
    background: 'linear-gradient(135deg, var(--accent) 0%, #7c3aed 100%)',
    color: 'var(--button-text)',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '600',
  },
  secondaryBtn: {
    flex: '1 1 45%',
    minWidth: '120px',
    backgroundColor: 'var(--card-bg)',
    color: 'var(--text)',
    border: '1px solid var(--border-color)',
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '600',
  },
};

export default Join;
