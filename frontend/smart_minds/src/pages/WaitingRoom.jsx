import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

function WaitingRoom() {
  const location = useLocation();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [ws, setWs] = useState(null);
  const [connectionError, setConnectionError] = useState(false);

  useEffect(() => {
    // Get quiz data from location state or localStorage
    const quizFromState = location.state?.quiz;
    const currentQuiz = quizFromState || JSON.parse(localStorage.getItem('currentQuiz') || 'null');
    
    if (!currentQuiz) {
      navigate('/dashboard');
      return;
    }
    
    setQuiz(currentQuiz);
    localStorage.setItem('currentQuiz', JSON.stringify(currentQuiz));
    
    // Get or create a user ID if it doesn't exist
    let userId = localStorage.getItem('userId');
    if (!userId) {
      userId = `user-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('userId', userId);
    }
    
    // Get username from localStorage or use a default
    const username = localStorage.getItem('username') || `User-${userId.substring(0, 4)}`;
    
    // Initialize WebSocket connection with query parameters
    // Use the page host so clients on other devices (phone) connect back to the server host
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    // Use environment variables or fallback to current host and default port
    const host = import.meta.env.VITE_WS_HOST || window.location.hostname;
    const port = import.meta.env.VITE_WS_PORT || 3002;
    const wsUrl = new URL(`${proto}://${host}:${port}`);
    wsUrl.searchParams.append('quizCode', currentQuiz.quizCode);
    wsUrl.searchParams.append('userId', userId);
    wsUrl.searchParams.append('username', username);
    wsUrl.searchParams.append('isHost', 'true');
    
    const newWs = new WebSocket(wsUrl);

    newWs.onopen = () => {
      console.log('✅ Connected to WebSocket as host');
      console.log('WebSocket URL:', wsUrl.toString());
      setIsLoading(false);
      setConnectionError(false);
    };

    newWs.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📨 WebSocket message received:', data);
        
        switch (data.type) {
          case 'participant-joined':
            console.log('👤 Participant joined:', data.username);
            setParticipants(prev => {
              // Check if participant already exists
              if (prev.some(p => p.id === data.userId)) return prev;
              
              const updated = [...prev, {
                id: data.userId,
                username: data.username,
                joinedAt: new Date()
              }];
              console.log('Updated participants:', updated);
              return updated;
            });
            break;
            
          case 'participant-left':
            console.log('👋 Participant left:', data.userId);
            setParticipants(prev => prev.filter(p => p.id !== data.userId));
            break;
            
          case 'participants-update':
            console.log('📋 Initial participants list:', data.participants);
            // Initial list of participants when host connects
            setParticipants(data.participants.map(p => ({
              id: p.userId,
              username: p.username,
              joinedAt: new Date() // We don't have the actual join time here
            })));
            break;
            
          default:
            console.log('Unknown message type:', data.type);
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };

    newWs.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      setConnectionError(true);
      setIsLoading(false);
    };

    newWs.onclose = () => {
      console.log('WebSocket connection closed');
      // mark connection error if we didn't successfully connect before
      if (!newWs || newWs.readyState !== WebSocket.OPEN) {
        setConnectionError(true);
        setIsLoading(false);
      }
    };

    setWs(newWs);

    return () => {
      if (newWs) {
        newWs.close();
      }
    };
  }, [location]);

  const handleStartQuiz = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      // Notify server to start the quiz
      ws.send(JSON.stringify({
        type: 'start-quiz',
        quizData: quiz
      }));
      
      // Mark this client as host so QuizScreen reconnects as host
      localStorage.setItem('isHost', 'true');
      // Navigate to quiz screen
      navigate(`/quiz/${quiz.quizCode}`);
    } else {
      console.error('WebSocket not connected');
      // Fallback in case WebSocket is not available
      navigate(`/quiz/${quiz.quizCode}`);
    }
  };

  if (isLoading || !quiz) {
    if (connectionError) {
      return (
        <div style={styles.loading}>
          <div style={{ textAlign: 'center' }}>
            <p>Unable to connect to the real-time server.</p>
            <p style={{ marginTop: 8 }}>Make sure the backend server is running (port 3002).</p>
              <button
                style={{ marginTop: 12, padding: '8px 12px', borderRadius: 6, border: 'none', background: 'var(--accent)', color: 'var(--button-text)', cursor: 'pointer' }}
                onClick={() => window.location.reload()}
              >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return <div style={styles.loading}>Loading...</div>;
  }

  // Generate join URL using network IP if available, otherwise fall back to origin
  const getJoinUrl = () => {
    const hostname = window.location.hostname;
    const port = window.location.port ? `:${window.location.port}` : '';
    const protocol = window.location.protocol;
    // If localhost, use current origin; if actual IP, construct full URL
    const baseUrl = (hostname === 'localhost' || hostname === '127.0.0.1') 
      ? window.location.origin 
      : `${protocol}//${hostname}${port}`;
    return `${baseUrl}/join/${quiz.quizCode}`;
  };
  
  const joinUrl = getJoinUrl();
  const participantCount = participants.length;

  return (
    <div style={styles.wrapper}>
      <main style={styles.main}>
        <div style={styles.container}>
          <div style={styles.card}>
        <h1 style={styles.title}>Quiz Ready!</h1>
        <p style={styles.subtitle}>Share this code with participants</p>
        
        <div style={styles.codeContainer}>
          <div style={styles.joinCode}>
            <h2 style={styles.code}>{quiz.quizCode}</h2>
            <p style={styles.joinLink}>or share this link: {joinUrl}</p>
          </div>
        </div>

        <div style={styles.participantsList}>
          <h3 style={styles.participantsHeader}>
            Participants ({participantCount})
          </h3>
          {participantCount > 0 ? (
            <ul style={styles.participantList}>
              {participants.map(participant => (
                <li key={participant.id} style={styles.participantItem}>
                  <span style={styles.participantName}>{participant.username}</span>
                  <span style={styles.joinedTime}>
                    Joined {formatDistanceToNow(participant.joinedAt, { addSuffix: true })}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p style={styles.noParticipants}>No participants have joined yet</p>
          )}
        </div>

        <div style={styles.buttonGroup}>
          <button 
            style={styles.secondaryButton}
            onClick={() => {
              navigator.clipboard.writeText(quiz.quizCode);
              alert('Code copied to clipboard!');
            }}
          >
            Copy Code
          </button>
          <button 
            style={styles.primaryButton}
            onClick={handleStartQuiz}
            disabled={participantCount === 0}
          >
            Start Quiz
          </button>
        </div>
          </div>
        </div>
      </main>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: 'var(--bg)',
    padding: '2rem 1rem',
  },
  card: {
    backgroundColor: 'var(--card-bg)',
    borderRadius: '12px',
    boxShadow: 'var(--shadow)',
    padding: '2.5rem',
    maxWidth: '640px',
    width: '100%',
    textAlign: 'center',
  },
  title: {
    fontSize: '2rem',
    color: 'var(--text)',
    marginBottom: '0.5rem',
  },
  subtitle: {
    color: 'var(--muted)',
    marginBottom: '2rem',
    fontSize: '1.1rem',
  },
  codeContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1.5rem',
    margin: '2rem 0',
  },
  qrCode: {
    padding: '1rem',
    backgroundColor: 'var(--card-bg)',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
  },
  joinCode: {
    textAlign: 'center',
  },
  code: {
    fontSize: '3rem',
    fontWeight: 'bold',
    color: 'var(--accent)',
    margin: '0.5rem 0',
    letterSpacing: '0.5rem',
    paddingLeft: '0.5rem',
  },
  joinLink: {
    color: 'var(--muted)',
    fontSize: '0.9rem',
    wordBreak: 'break-all',
  },
  participantsList: {
    margin: '2rem 0',
    textAlign: 'left',
    width: '100%',
  },
  participantsHeader: {
    color: 'var(--text)',
    marginBottom: '1rem',
    fontSize: '1.25rem',
  },
    participantList: {
    listStyle: 'none',
    padding: '0',
    margin: '0',
    maxHeight: '200px',
    overflowY: 'auto',
    border: 'var(--border)',
    borderRadius: '8px',
  },
    participantItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.75rem 1rem',
    borderBottom: 'var(--border)',
    '&:last-child': {
      borderBottom: 'none',
    },
  },
  participantName: {
    fontWeight: '500',
    color: 'var(--text)',
  },
  joinedTime: {
    fontSize: '0.8rem',
    color: 'var(--muted)',
  },
  noParticipants: {
    color: 'var(--muted)',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: '1rem',
    backgroundColor: 'var(--card-bg)',
    borderRadius: '8px',
  },
  buttonGroup: {
    display: 'flex',
    gap: '1rem',
    marginTop: '2rem',
  },
  primaryButton: {
    flex: 1,
    backgroundColor: 'var(--accent)',
    color: 'var(--button-text)',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: 'var(--card-bg)',
    color: 'var(--text)',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontSize: '1.2rem',
    color: 'var(--muted)',
  },
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
};

export default WaitingRoom;
