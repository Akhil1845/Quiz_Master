import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { QRCodeSVG } from 'qrcode.react';

// Educational elements to float in the background
const FLOATING_ELEMENTS = [
  // Math formulas
  { content: '(a + b)² = a² + 2ab + b²', type: 'formula' },
  { content: 'E = mc²', type: 'formula' },
  { content: 'π = 3.14159...', type: 'formula' },
  { content: 'a² + b² = c²', type: 'formula' },
  { content: 'e^(iπ) + 1 = 0', type: 'formula' },
  
  // School supplies
  { content: '📚', type: 'emoji' },
  { content: '✏️', type: 'emoji' },
  { content: '📝', type: 'emoji' },
  { content: '📖', type: 'emoji' },
  { content: '📐', type: 'emoji' },
  { content: '📏', type: 'emoji' },
  { content: '🔬', type: 'emoji' },
  { content: '🧮', type: 'emoji' },
  
  // Numbers and symbols
  { content: '1 + 1 = 2', type: 'formula' },
  { content: '∫ f(x) dx', type: 'formula' },
  { content: '∞', type: 'symbol' },
  { content: '∑', type: 'symbol' },
  { content: '√', type: 'symbol' },
  { content: '×', type: 'symbol' },
  { content: '÷', type: 'symbol' },
];

// Add global styles for animations
const addGlobalStyles = () => {
  const globalStyles = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    @keyframes floatUp {
      0% { transform: translateY(0) rotate(0deg); opacity: 0; }
      10% { opacity: 0.2; }
      90% { opacity: 0.2; }
      100% { transform: translateY(-100vh) rotate(360deg); opacity: 0; }
    }
    
    @keyframes floatSideways {
      0% { transform: translateX(-50px) rotate(-10deg); opacity: 0; }
      10% { opacity: 0.2; }
      90% { opacity: 0.2; }
      100% { transform: translateX(calc(100vw + 50px)) rotate(10deg); opacity: 0; }
    }
  `;

  // Only add styles once
  if (!document.getElementById('quiz-animations')) {
    const styleElement = document.createElement('style');
    styleElement.id = 'quiz-animations';
    styleElement.textContent = globalStyles;
    document.head.appendChild(styleElement);
  }
};

function Dashboard() {
  const [user, setUser] = useState(null);
  const [quizCode, setQuizCode] = useState("");
  const [playersJoined, setPlayersJoined] = useState(0);
  const [maxParticipants, setMaxParticipants] = useState(50);
  const [quizCreated, setQuizCreated] = useState(false);
  const [joinQuizCode, setJoinQuizCode] = useState("");
  const [hasJoinedQuiz, setHasJoinedQuiz] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    // Add global styles when component mounts
    addGlobalStyles();
    
    // Load max participants from current quiz if available
    const currentQuiz = JSON.parse(localStorage.getItem('currentQuiz') || 'null');
    if (currentQuiz && currentQuiz.maxParticipants) {
      setMaxParticipants(currentQuiz.maxParticipants);
    }
    
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      navigate("/login");
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  const handleCreateQuiz = () => {
    navigate("/quiz-config");
  };

  const handleJoinQuiz = () => {
    if (!joinQuizCode.trim()) return;
    setHasJoinedQuiz(true);
  };

  const handleStartQuiz = () => {
    navigate("/quiz");
  };

  const handleViewLeaderboard = () => {
    navigate("/leaderboard");
  };

  if (!user) return null;

  return (
    <div style={{ ...styles.wrapper, background: 'var(--bg)' }}>
      <div style={styles.floatingBg}>
        {FLOATING_ELEMENTS.map((item, index) => {
          const size = Math.random() * 20 + 12; // Random size between 12 and 32
          const duration = Math.random() * 30 + 30; // Random duration between 30s and 60s
          const delay = Math.random() * 10; // Random delay up to 10s
          const startPosX = Math.random() * 100; // Random horizontal position
          const startPosY = Math.random() * 100; // Random vertical position
          const animationType = Math.random() > 0.5 ? 'floatUp' : 'floatSideways';
          const rotation = Math.random() * 30 - 15; // Random rotation between -15 and 15 degrees
          const opacity = 0.15 + Math.random() * 0.3; // Random opacity between 0.15 and 0.45
          
          // Different animation properties based on type
          const animationProps = {
            floatUp: {
              transform: `translateY(0) rotate(${rotation}deg)`,
              animation: `floatUp ${duration}s linear ${delay}s infinite`,
              top: `${startPosY}%`,
              left: `${startPosX}%`,
            },
            floatSideways: {
              transform: `rotate(${rotation}deg)`,
              animation: `floatSideways ${duration}s linear ${delay}s infinite`,
              top: `${startPosY}%`,
              left: `-${size}px`,
            }
          };
          
          return (
            <div 
              key={index}
              style={{
                position: 'absolute',
                fontSize: `${size}px`,
                opacity: 0,
                animationFillMode: 'both',
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
                fontFamily: item.type === 'formula' ? '"Times New Roman", serif' : 'inherit',
                fontWeight: item.type === 'symbol' ? 'bold' : 'normal',
                color: getRandomColor(),
                zIndex: 1,
                ...animationProps[animationType],
              }}
            >
              {item.content}
            </div>
          );
        })}
      </div>

      <Navbar user={user} onLogout={handleLogout} />

      <main style={styles.main}>
        <div style={styles.container}>
          <h1 style={styles.title}>Welcome, {user?.username || 'User'}</h1>
          
          <div style={styles.cardsContainer}>
            {/* Join Quiz Card - Top */}
            <div style={{ ...styles.card, backgroundColor: 'var(--card-bg)', color: 'var(--text)' }}>
              <h2 style={styles.cardTitle}>Join Quiz</h2>
              {!hasJoinedQuiz ? (
                <div style={styles.joinOptions}>
                  <div style={styles.joinOption}>
                    <h3 style={styles.optionTitle}>Enter Quiz Code</h3>
                    <div style={styles.inputContainer}>
                      <input
                        type="text"
                        placeholder="Enter Quiz Code"
                        value={joinQuizCode}
                        onChange={(e) => setJoinQuizCode(e.target.value.toUpperCase())}
                        style={styles.input}
                        maxLength="6"
                      />
                    </div>
                    <button 
                      style={styles.primaryBtn}
                      onClick={handleJoinQuiz}
                      disabled={!joinQuizCode.trim()}
                    >
                      Join Quiz
                    </button>
                  </div>
                </div>
              ) : (
                <div style={styles.waitingContainer}>
                  <p style={styles.waitingText}>Waiting for quiz to start...</p>
                  <p style={styles.playerCount}>
                    <span>👥</span> Players Joined: {playersJoined + 1} / {maxParticipants}
                  </p>
                  <div className="spinner" style={styles.spinner}></div>
                </div>
              )}
            </div>

            {/* Create Quiz Card - Bottom */}
            <div style={{ ...styles.card, backgroundColor: 'var(--card-bg)', color: 'var(--text)' }}>
              <h2 style={styles.cardTitle}>Create Quiz</h2>
              {!quizCreated ? (
                <button 
                  style={styles.primaryBtn} 
                  onClick={handleCreateQuiz}
                >
                  Create New Quiz
                </button>
              ) : (
                <div style={styles.quizInfo}>
                  <div style={styles.qrContainer}>
                    <QRCodeSVG 
                      value={quizCode} 
                      size={150}
                      level="H"
                      includeMargin={true}
                      style={styles.qrCode}
                    />
                    <p style={styles.quizCode}>{quizCode}</p>
                  </div>
                  <p style={styles.playerCount}>
                    <span>👥</span> Players Joined: {playersJoined} / {maxParticipants}
                  </p>
                  <div style={styles.buttonGroup}>
                    <button 
                      style={styles.primaryBtn}
                      onClick={handleStartQuiz}
                    >
                      Start Quiz
                    </button>
                    <button 
                      style={styles.secondaryBtn}
                      onClick={handleViewLeaderboard}
                    >
                      View Leaderboard
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Helper function to generate random colors
const getRandomColor = () => {
  const colors = [
    '#4a90e2', // blue
    '#e94e77', // pink
    '#2ecc71', // green
    '#f39c12', // orange
    '#9b59b6', // purple
    '#1abc9c', // teal
    '#e74c3c', // red
    '#3498db', // light blue
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

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
  floatingBg: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: 1,
    inset: 0,
    pointerEvents: 'none',
    zIndex: 0,
    overflow: 'hidden',
  },
  floatItem: {
    position: 'absolute',
    bottom: '-60px',
    fontSize: '2rem',
    opacity: 0.1,
    animation: 'floatUp 20s linear infinite',
    zIndex: 0,
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
  },
  title: {
    textAlign: 'center',
    color: 'var(--text)',
    marginBottom: '2.5rem',
    fontSize: '2.25rem',
    fontWeight: '700',
    background: 'linear-gradient(90deg, var(--accent), #7c3aed)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    display: 'inline-block',
    width: '100%',
  },
  cardsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
    maxWidth: '500px',
    margin: '0 auto',
    width: '100%',
    padding: '0 1rem',
    boxSizing: 'border-box',
  },
  card: {
    backgroundColor: 'var(--card-bg)',
    borderRadius: '16px',
    padding: '2rem',
    boxShadow: 'var(--shadow)',
    textAlign: 'center',
    transition: 'all 0.3s ease',
    border: '1px solid var(--border-color)',
    position: 'relative',
    overflow: 'visible',
    '&:hover': {
      transform: 'translateY(-5px)',
      boxShadow: '0 20px 25px -5px rgba(0,0,0,0.08), 0 10px 10px -6px rgba(0,0,0,0.03)',
    },
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '4px',
      background: 'linear-gradient(90deg, var(--accent), #7c3aed)',
    }
  },
  quizInfo: {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1.5rem',
  },
  joinOptions: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  joinOption: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  optionTitle: {
    fontSize: '1.1rem',
    color: 'var(--text)',
    margin: '0 0 0.5rem 0',
    fontWeight: '600',
  },
  qrScannerPlaceholder: {
    backgroundColor: 'var(--card-bg)',
    border: '2px dashed var(--border-color)',
    borderRadius: '12px',
    padding: '2.5rem 1.5rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    marginBottom: '1.5rem',
    '&:hover': {
      borderColor: 'var(--accent)',
      backgroundColor: 'rgba(255,255,255,0.02)',
      transform: 'translateY(-1px)',
      boxShadow: 'var(--shadow)'
    },
    '&:active': {
      transform: 'translateY(0)',
    }
  },
  qrIcon: {
    fontSize: '3rem',
    marginBottom: '0.5rem',
  },
  qrHint: {
    color: 'var(--muted)',
    margin: '0.5rem 0 0 0',
    fontSize: '0.95rem',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    margin: '0.5rem 0',
    '&::before, &::after': {
      content: '""',
      flex: 1,
      height: '1px',
      backgroundColor: 'rgba(255,255,255,0.04)',
    },
  },
  dividerText: {
    padding: '0 1rem',
    color: 'var(--muted)',
    fontSize: '0.875rem',
  },
  qrContainer: {
    backgroundColor: 'var(--card-bg)',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
    border: '1px solid var(--border-color)',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
  },
  qrCode: {
    padding: '0.5rem',
    backgroundColor: 'var(--card-bg)',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
  },
  quizCode: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: 'var(--text)',
    letterSpacing: '0.05em',
    background: 'var(--card-bg)',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    margin: '0.5rem 0',
  },
  buttonGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    marginTop: '1.5rem',
    width: '100%',
    maxWidth: '300px',
  },
  primaryBtn: {
    background: 'linear-gradient(135deg, var(--accent) 0%, #7c3aed 100%)',
    color: 'var(--button-text)',
    border: 'none',
    padding: '0.875rem 1.75rem',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
    zIndex: 1,
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 10px 15px -3px rgba(79, 70, 229, 0.2)',
    },
    '&:active': {
      transform: 'translateY(0)',
    },
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'linear-gradient(135deg, #4338ca 0%, #6d28d9 100%)',
      opacity: 0,
      transition: 'opacity 0.3s ease',
      zIndex: -1,
    },
    '&:hover::before': {
      opacity: 1,
    }
  },
  secondaryBtn: {
    backgroundColor: 'transparent',
    color: 'var(--accent)',
    border: '2px solid var(--border-color)',
    padding: '0.75rem 1.5rem',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    width: '100%',
    '&:hover': {
      backgroundColor: 'rgba(255,255,255,0.02)',
      borderColor: 'rgba(255,255,255,0.04)',
    }
  },
  inputContainer: {
    width: '100%',
    marginBottom: '1.5rem',
    position: 'relative',
  },
    input: {
    width: 'calc(100% - 3rem)',
    padding: '0.9375rem 1.5rem',
    borderRadius: '12px',
    border: '2px solid var(--border-color)',
    fontSize: '1.05rem',
    fontWeight: '500',
    color: 'var(--text)',
    backgroundColor: 'var(--card-bg)',
    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
    transition: 'all 0.2s ease-in-out',
    '&:hover': {
      borderColor: 'rgba(255,255,255,0.04)',
    },
    '&:focus': {
      outline: 'none',
      borderColor: 'var(--accent)',
      boxShadow: '0 0 0 3px rgba(124, 58, 237, 0.12)',
    },
    '&::placeholder': {
      color: 'var(--muted)',
      fontWeight: '400',
      opacity: 1,
    },
    '&:disabled': {
      backgroundColor: 'var(--card-bg)',
      cursor: 'not-allowed',
    }
  },
  waitingContainer: {
    textAlign: 'center',
    padding: '1.5rem 0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
  },
  waitingText: {
    fontSize: '1.125rem',
    color: 'var(--muted)',
    margin: 0,
  },
  playerCount: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '1rem',
    color: 'var(--accent)',
    fontWeight: '600',
    margin: '0.5rem 0',
    '& span': {
      fontSize: '1.25rem',
    }
  },
  spinner: {
    border: '3px solid rgba(124,58,237,0.08)',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    borderTopColor: 'var(--accent)',
    animation: 'spin 1s linear infinite',
    margin: '1rem auto 0',
  },
  cardTitle: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: 'var(--text)',
    marginBottom: '1.5rem',
    position: 'relative',
    display: 'inline-block',
    '&::after': {
      content: '""',
      position: 'absolute',
      bottom: '-8px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '50px',
      height: '3px',
      background: 'linear-gradient(90deg, var(--accent), #7c3aed)',
      borderRadius: '3px',
    }
  },
};

export default Dashboard;
