import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Confetti from 'react-confetti';

function Leaderboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [questionType, setQuestionType] = useState('MCQ');
  const [showConfetti, setShowConfetti] = useState(true);

  const [userScore, setUserScore] = useState({
    rank: '-',
    score: '-',
    correctCount: '-',
    totalQuestions: '-',
    accuracy: '-',
    writtenCount: '-',
    writtenAccuracy: '-',
    time: '--:--'
  });

  /* ---------------- LOAD LEADERBOARD ---------------- */
  useEffect(() => {
    setLoading(true);

    let lb = [];

    // From navigation state
    if (location.state?.leaderboard) {
      console.log('[LEADERBOARD] Received from navigation state:', location.state.leaderboard);
      lb = location.state.leaderboard;
      localStorage.setItem('latestLeaderboard', JSON.stringify(lb));
    }

    // From localStorage fallback
    if (lb.length === 0) {
      try {
        const stored = JSON.parse(localStorage.getItem('latestLeaderboard'));
        console.log('[LEADERBOARD] Loaded from localStorage:', stored);
        if (Array.isArray(stored)) lb = stored;
      } catch {
        console.log('[LEADERBOARD] No data in localStorage');
        lb = [];
      }
    }

    console.log('[LEADERBOARD] Final leaderboard data:', lb);
    setLeaderboard(lb);
    
    // Get question type from navigation state or current quiz
    const currentQuiz = JSON.parse(localStorage.getItem('currentQuiz') || '{}');
    const storedQuestionType =
      location.state?.questionType ||
      localStorage.getItem('questionType') ||
      currentQuiz.questionType ||
      'MCQ';
    localStorage.setItem('questionType', storedQuestionType);
    setQuestionType(storedQuestionType);
    
    setLoading(false);
  }, [location.state]);

  const isWrittenOnly = questionType === 'Written';
  const isMCQ = questionType === 'MCQ';
  const getWrittenAccuracy = (player) => {
    const value = player?.writtenAccuracy ?? player?.accuracy ?? 0;
    return Number.isFinite(value) ? value : 0;
  };
  const getScoreValue = (player) => (
    isWrittenOnly ? getWrittenAccuracy(player) : (player?.score ?? 0)
  );
  const formatScore = (player) => (
    isWrittenOnly ? `${getScoreValue(player)}%` : getScoreValue(player)
  );

  /* ---------------- SORT ---------------- */
  const sortedLeaderboard = [...leaderboard].sort(
    (a, b) => getScoreValue(b) - getScoreValue(a)
  );

  const isHost = Boolean(location.state?.isHost) || (localStorage.getItem('isHost') === 'true');

  /* ---------------- USER STATS ---------------- */
  useEffect(() => {
    const userId = localStorage.getItem('userId');
    const username = localStorage.getItem('username');

    const index = sortedLeaderboard.findIndex(
      p =>
        p.playerId === userId ||
        p.playerName === username
    );

    if (index !== -1) {
      const p = sortedLeaderboard[index];

      setUserScore({
        rank: index + 1,
        score: p.score ?? 0,
        correctCount: p.correctCount ?? 0,
        totalQuestions: p.totalQuestions ?? 0,
        accuracy: p.accuracy ?? 0,
        writtenCount: p.writtenCount ?? 0,
        writtenAccuracy: p.writtenAccuracy ?? 0,
        time: p.time ?? '--:--'
      });
    }
  }, [sortedLeaderboard]);

  // Stop confetti after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowConfetti(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  const handleBackToDashboard = () => {
    // Clear quiz-related data
    localStorage.removeItem('isHost');
    localStorage.removeItem('quizCode');
    localStorage.removeItem('latestLeaderboard');
    localStorage.removeItem('questionType');

    const hasUser = Boolean(localStorage.getItem('user'));
    navigate(hasUser ? '/dashboard' : '/login');
  };

  // Add bounce animation for medals
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-10px); }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  if (loading) {
    return (
      <div style={styles.wrapper}>
        <div style={styles.main}>
          <div style={styles.emptyState}>
            <p>Loading results...</p>
          </div>
        </div>
      </div>
    );
  }

  const showPersonalStats = !isHost && userScore.score !== '-';
  const scoreLabel = isWrittenOnly ? 'Written Accuracy' : 'Score';
  const showMcqAccuracy = !isMCQ && !isWrittenOnly;
  const showWrittenAccuracyColumn = !isMCQ && !isWrittenOnly;

  return (
    <>
      {showConfetti && sortedLeaderboard.length > 0 && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={500}
          gravity={0.3}
        />
      )}
      <div style={styles.wrapper}>
        <div style={styles.main}>
          <h1 style={styles.title}>Quiz Results</h1>

        {sortedLeaderboard.length === 0 ? (
          <div style={styles.emptyState}>
            <p>No results yet.</p>
            <button style={styles.primaryBtn} onClick={handleBackToDashboard}>
              Back to Dashboard
            </button>
          </div>
        ) : (
          <>
            {/* -------- PERSONAL STATS -------- */}
            {showPersonalStats && (
              <div style={styles.personalStatsContainer}>
                <h2 style={{ marginBottom: '15px' }}>Your Performance</h2>

                <div style={styles.personalStatsGrid}>
                  <div style={styles.statBox}>
                    <div style={styles.statLabel}>{scoreLabel}</div>
                    <div style={styles.statValueLarge}>{formatScore(userScore)}</div>
                  </div>

                  <div style={styles.statBox}>
                    <div style={styles.statLabel}>Rank</div>
                    <div style={styles.statValueLarge}>{userScore.rank}</div>
                  </div>

                  {showMcqAccuracy && (
                    <>
                      <div style={styles.statBox}>
                        <div style={styles.statLabel}>MCQ Accuracy</div>
                        <div style={styles.statValueLarge}>{userScore.accuracy}%</div>
                      </div>

                      <div style={styles.statBox}>
                        <div style={styles.statLabel}>Written Accuracy</div>
                        <div style={styles.statValueLarge}>
                          {userScore.writtenAccuracy}%
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* -------- WINNER PODIUM -------- */}
            {sortedLeaderboard.length >= 3 && (
              <div style={styles.podiumContainer}>
                <h2 style={{ textAlign: 'center', marginBottom: '30px', color: '#6366f1' }}>🏆 Top Winners 🏆</h2>
                <div style={styles.podiumWrapper}>
                  {/* 2nd Place - Left */}
                  <div style={styles.podiumItem}>
                    <div style={styles.playerInfo}>
                      <div style={styles.medalLarge}>🥈</div>
                      <div style={styles.playerName}>{sortedLeaderboard[1]?.playerName || 'Player 2'}</div>
                      <div style={styles.playerScore}>{formatScore(sortedLeaderboard[1])}</div>
                    </div>
                    <div style={{ ...styles.podiumBar, height: '120px', background: 'linear-gradient(135deg, #c0c0c0, #e8e8e8)' }}>
                      <div style={styles.rankLabel}>2</div>
                    </div>
                  </div>

                  {/* 1st Place - Center */}
                  <div style={styles.podiumItem}>
                    <div style={styles.playerInfo}>
                      <div style={styles.medalLarge}>🥇</div>
                      <div style={{ ...styles.playerName, fontSize: '1.3rem', fontWeight: 'bold' }}>
                        {sortedLeaderboard[0]?.playerName || 'Player 1'}
                      </div>
                      <div style={{ ...styles.playerScore, fontSize: '1.2rem' }}>
                        {formatScore(sortedLeaderboard[0])}
                      </div>
                    </div>
                    <div style={{ ...styles.podiumBar, height: '160px', background: 'linear-gradient(135deg, #ffd700, #ffed4e)' }}>
                      <div style={{ ...styles.rankLabel, fontSize: '2rem' }}>1</div>
                    </div>
                  </div>

                  {/* 3rd Place - Right */}
                  <div style={styles.podiumItem}>
                    <div style={styles.playerInfo}>
                      <div style={styles.medalLarge}>🥉</div>
                      <div style={styles.playerName}>{sortedLeaderboard[2]?.playerName || 'Player 3'}</div>
                      <div style={styles.playerScore}>{formatScore(sortedLeaderboard[2])}</div>
                    </div>
                    <div style={{ ...styles.podiumBar, height: '100px', background: 'linear-gradient(135deg, #cd7f32, #e6a57e)' }}>
                      <div style={styles.rankLabel}>3</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* -------- LEADERBOARD TABLE -------- */}
            <div style={styles.leaderboardContainer}>
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Rank</th>
                      <th style={styles.th}>Player</th>
                      <th style={styles.th}>{scoreLabel}</th>
                      {showMcqAccuracy && <th style={styles.th}>MCQ Accuracy</th>}
                      {showWrittenAccuracyColumn && <th style={styles.th}>Written Accuracy</th>}
                    </tr>
                  </thead>

                  <tbody>
                    {sortedLeaderboard.map((p, index) => (
                      <tr key={index} style={styles.tr}>
                        <td style={styles.td}>
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                        </td>

                        <td style={{ ...styles.td, textAlign: 'left' }}>
                          {p.playerName || 'Player'}
                        </td>

                        <td style={styles.td}>{formatScore(p)}</td>
                        {showMcqAccuracy && <td style={styles.td}>{p.accuracy ?? 0}%</td>}
                        {showWrittenAccuracyColumn && <td style={styles.td}>{p.writtenAccuracy ?? 0}%</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={styles.buttonContainer}>
              <button
                style={styles.primaryBtn}
                onClick={handleBackToDashboard}
              >
                Back to Dashboard
              </button>
            </div>
          </>
        )}
      </div>
    </div>
    </>
  );
}
const styles = {
  wrapper: {
    minHeight: '100vh',
    width: '100vw',
    background: 'var(--bg)',
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    padding: '2rem 1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  main: {
    position: 'relative',
    zIndex: 2,
    maxWidth: '1200px',
    width: '100%',
    margin: '0 auto',
  },
  title: {
    textAlign: 'center',
    color: 'var(--text)',
    marginBottom: '2rem',
    fontSize: '2rem',
  },
  leaderboardContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
  },
  emptyState: {
    backgroundColor: 'var(--card-bg)',
    borderRadius: '12px',
    padding: '2rem',
    textAlign: 'center',
    boxShadow: 'var(--shadow)',
  },
  tableContainer: {
    overflowX: 'auto',
    backgroundColor: 'var(--card-bg)',
    borderRadius: '12px',
    boxShadow: 'var(--shadow)',
    padding: '1rem',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    padding: '1rem',
    textAlign: 'left',
    color: 'var(--muted)',
    fontWeight: '600',
    borderBottom: '2px solid var(--border-color)',
  },
  tr: {
    borderBottom: '1px solid var(--border-color)',
  },
  topThree: {
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  secondPlace: {
    backgroundColor: '#f0fdf4',
  },
  thirdPlace: {
    backgroundColor: '#eff6ff',
  },
  td: {
    padding: '1rem',
    textAlign: 'center',
    color: 'var(--muted)',
  },
  playerCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  medal: {
    fontSize: '1.25rem',
  },
  score: {
    fontWeight: '600',
    color: 'var(--text)',
  },
  accuracyBarContainer: {
    position: 'relative',
    height: '24px',
    backgroundColor: 'rgba(37,99,235,0.12)',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  accuracyBar: {
    height: '100%',
    borderRadius: '12px',
    transition: 'width 0.5s ease-in-out',
    backgroundColor: '#2563eb',
  },
  accuracyText: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    fontSize: '0.8rem',
    fontWeight: '700',
    textShadow: '0 0 4px rgba(0,0,0,0.35)',
  },
  userStatsCard: {
    backgroundColor: 'var(--card-bg)',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: 'var(--shadow)',
  },
  userStatsTitle: {
    fontSize: '1.25rem',
    color: 'var(--text)',
    marginBottom: '1.5rem',
    textAlign: 'center',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  statItem: {
    backgroundColor: 'var(--card-bg)',
    borderRadius: '8px',
    padding: '1rem',
    textAlign: 'center',
  },
  statValue: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: 'var(--accent)',
    marginBottom: '0.25rem',
  },
  statLabel: {
    fontSize: '0.875rem',
    color: 'var(--muted)',
  },
  personalStatsContainer: {
    backgroundColor: 'var(--card-bg)',
    borderRadius: '12px',
    padding: '2rem',
    marginBottom: '2rem',
    boxShadow: 'var(--shadow)',
  },
  personalStatsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '1.5rem',
  },
  statBox: {
    backgroundColor: 'var(--bg)',
    borderRadius: '8px',
    padding: '1.5rem',
    textAlign: 'center',
    border: '2px solid var(--accent)',
  },
  statValueLarge: {
    fontSize: '2rem',
    fontWeight: '700',
    color: 'var(--accent)',
    marginTop: '0.5rem',
  },
  buttonGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  buttonContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '1rem',
  },
  primaryBtn: {
    backgroundColor: 'var(--accent)',
    color: 'var(--button-text)',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '600',
    transition: 'background-color 0.2s',
    width: '100%',
  },
  secondaryBtn: {
    backgroundColor: 'var(--card-bg)',
    color: 'var(--text)',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '600',
    transition: 'background-color 0.2s',
    width: '100%',
  },
  podiumContainer: {
    backgroundColor: 'var(--card-bg)',
    borderRadius: '12px',
    padding: '2rem',
    marginBottom: '2rem',
    boxShadow: 'var(--shadow)',
  },
  podiumWrapper: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: '1.5rem',
    marginTop: '2rem',
    minHeight: '280px',
  },
  podiumItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flex: '0 0 180px',
  },
  playerInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  medalLarge: {
    fontSize: '3rem',
    marginBottom: '0.5rem',
    animation: 'bounce 2s infinite',
  },
  playerName: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: 'var(--text)',
    marginBottom: '0.25rem',
    textAlign: 'center',
  },
  playerScore: {
    fontSize: '1rem',
    color: 'var(--accent)',
    fontWeight: '700',
  },
  podiumBar: {
    width: '100%',
    borderRadius: '8px 8px 0 0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    transition: 'transform 0.3s ease',
    cursor: 'pointer',
  },
  rankLabel: {
    fontSize: '1.5rem',
    fontWeight: '900',
    color: '#fff',
    textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
  },
};

export default Leaderboard;
