import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import config from '../config';

function Join() {
  const { quizCode } = useParams();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const quizInfoRef = useRef(null); // Track quiz info to ensure it's available when quiz-starting arrives

  const [userId, setUserId] = useState(() => localStorage.getItem('userId'));
  const [username, setUsername] = useState(() => localStorage.getItem('username') || '');
  const [connected, setConnected] = useState(false);
  const [ws, setWs] = useState(null);
  const [status, setStatus] = useState('idle');
  const [participants, setParticipants] = useState([]);
  const [quizInfo, setQuizInfo] = useState(null);
  const [maxParticipants, setMaxParticipants] = useState(50); // Default max

  useEffect(() => {
    // Fetch quiz details to get maxParticipants
    const fetchQuizDetails = async () => {
      try {
        const response = await fetch(`${config.API_BASE_URL}/quizzes/code/${quizCode}`);
        if (response.ok) {
          const data = await response.json();
          console.log('[JOIN] Fetched quiz details:', data);
          // Set maxParticipants from the quiz config if available
          if (data.maxParticipants) {
            setMaxParticipants(data.maxParticipants);
          }
        }
      } catch (err) {
        console.error('[JOIN] Error fetching quiz details:', err);
        // Keep the default of 50
      }
    };
    
    if (quizCode) {
      fetchQuizDetails();
    }
  }, [quizCode]);

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
    // Show the joining user immediately so mobile sees 1/2 instead of 0/2
    setParticipants([{ id: userId, username: finalName, joinedAt: new Date() }]);

    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = config.WS_HOST || window.location.hostname;
    const port = config.WS_PORT || 3002;
    
    // Log current config for debugging
    console.log('WebSocket Config:', { proto, host, port, PAGE_HOSTNAME: window.location.hostname });
    
    const wsUrl = `${proto}://${host}:${port}?quizCode=${encodeURIComponent(quizCode)}&userId=${encodeURIComponent(userId)}&username=${encodeURIComponent(finalName)}&isHost=false`;

    console.log('🔌 Attempting WebSocket connection to:', wsUrl);

    try {
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log('✅ WebSocket connected as participant');
        setConnected(true);
        setStatus('connected');
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 Message received:', data);
          
          switch(data.type) {
            case 'quiz-full':
              // Quiz has reached max participants
              console.error('Quiz is full:', data.message);
              setStatus('full');
              setConnected(false);
              socket.close();
              break;
              
            case 'welcome':
              // Server confirmed connection - ensure we're marked as connected
              console.log('Welcome message received');
              setConnected(true);
              setStatus('connected');
              break;
              
            case 'quiz-info':
              // Receive quiz info from host
              console.log('[PARTICIPANT] Received quiz-info:', data.quiz);
              quizInfoRef.current = data.quiz; // Store in ref for immediate access in quiz-starting
              setQuizInfo(data.quiz);
              break;
              
            case 'participant-joined':
              // Another participant joined
              setParticipants(prev => {
                if (prev.some(p => p.id === data.userId)) return prev;
                return [...prev, {
                  id: data.userId,
                  username: data.username,
                  joinedAt: new Date()
                }];
              });
              break;
              
            case 'participants-update':
              // Initial participants list from host
              const listFromServer = data.participants.map(p => ({
                id: p.userId,
                username: p.username,
                joinedAt: new Date(p.joinedAt) || new Date()
              }));
              // Ensure current user is counted even if server doesn't echo them back
              if (!listFromServer.some(p => p.id === userId)) {
                listFromServer.unshift({
                  id: userId,
                  username: finalName,
                  joinedAt: new Date()
                });
              }
              setParticipants(listFromServer);
              break;
              
            case 'quiz-starting':
              // Save quiz info to localStorage before navigating so participant has correct time per question
              if (quizInfoRef.current) {
                console.log('[PARTICIPANT] Saving quizInfo to localStorage before navigating:', quizInfoRef.current);
                localStorage.setItem('currentQuiz', JSON.stringify(quizInfoRef.current));
              } else {
                console.warn('[PARTICIPANT] quizInfo not available when quiz-starting received');
              }
              // Navigate to quiz as participant
              navigate(`/quiz/${quizCode}`);
              break;
              
            default:
              console.log('Unknown message type:', data.type);
              break;
          }
        } catch (err) {
          console.error('Error parsing ws message', err);
        }
      };

      socket.onerror = (err) => {
        console.error('❌ WebSocket error:', err);
        console.error('ReadyState:', socket.readyState);
        setStatus('error');
      };

      socket.onclose = (event) => {
        console.log('WebSocket connection closed', { code: event.code, reason: event.reason });
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
                
                {status === 'connecting' && <p style={{ marginTop: 12, textAlign: 'center', color: 'var(--muted)' }}>Connecting to quiz...</p>}
                {status === 'full' && <p style={{ marginTop: 12, textAlign: 'center', color: '#e74c3c', fontWeight: '600' }}>❌ Quiz is full! Maximum participants reached.</p>}
                {status === 'error' && <p style={{ marginTop: 12, textAlign: 'center', color: '#e74c3c' }}>❌ Connection failed. Try again.</p>}
              </div>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ color: 'var(--text)', marginBottom: '1rem' }}>Waiting Room</h2>
                <p style={{ marginBottom: '1.5rem', color: 'var(--muted)' }}>Waiting for host to start the quiz...</p>
                
                {quizInfo && (
                  <div style={{ 
                    backgroundColor: 'var(--card-bg)', 
                    padding: '1rem', 
                    borderRadius: '8px', 
                    marginBottom: '1.5rem',
                    textAlign: 'left'
                  }}>
                    <p><strong>Subject:</strong> {quizInfo.subject}</p>
                    <p><strong>Difficulty:</strong> {quizInfo.difficulty === '0' ? 'Easy' : quizInfo.difficulty === '1' ? 'Medium' : 'Hard'}</p>
                    <p><strong>Questions:</strong> {quizInfo.numQuestions}</p>
                  </div>
                )}
                
                <h3 style={{ color: 'var(--text)', marginBottom: '0.75rem' }}>
                  Players Joined: {participants.length} / {quizInfo?.maxParticipants || maxParticipants}
                </h3>
                
                <div style={{
                  backgroundColor: 'var(--card-bg)',
                  borderRadius: '8px',
                  padding: '1rem',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  marginBottom: '1rem',
                  minHeight: '100px',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  {participants.length > 0 ? (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {participants.map(participant => (
                        <li key={participant.id} style={{
                          padding: '0.5rem',
                          borderBottom: '1px solid var(--border-color)',
                          color: 'var(--text)',
                          fontSize: '0.95rem'
                        }}>
                          👤 {participant.username}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ color: 'var(--muted)', margin: 'auto' }}>You are the first to join!</p>
                  )}
                </div>
                
                <button style={styles.secondaryBtn} onClick={handleLeave}>Leave</button>
              </div>
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
