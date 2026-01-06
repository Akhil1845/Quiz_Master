import { useNavigate } from 'react-router-dom';

// Sample leaderboard data - in a real app, this would come from an API
const sampleLeaderboard = [
  { id: 1, name: 'Alex Johnson', score: 95, accuracy: 95, time: '4:32' },
  { id: 2, name: 'Taylor Smith', score: 92, accuracy: 92, time: '5:12' },
  { id: 3, name: 'Jordan Lee', score: 88, accuracy: 88, time: '5:45' },
  { id: 4, name: 'Casey Kim', score: 85, accuracy: 85, time: '6:21' },
  { id: 5, name: 'Riley Wilson', score: 82, accuracy: 82, time: '6:55' },
];

function Leaderboard() {
  const navigate = useNavigate();
  // Try to load latest leaderboard pushed by server
  let latest = null;
  try {
    latest = JSON.parse(localStorage.getItem('latestLeaderboard') || 'null');
  } catch (e) { latest = null; }

  const leaderboard = Array.isArray(latest) && latest.length > 0 ? latest : sampleLeaderboard;

  // Build a simple userScore from leaderboard if exists
  const playerId = localStorage.getItem('userId');
  const foundIndex = leaderboard.findIndex(p => p.playerId === playerId || p.id === playerId || p.name === localStorage.getItem('username'));
  const userScore = foundIndex >= 0 ? {
    rank: foundIndex + 1,
    score: leaderboard[foundIndex].score || 0,
    accuracy: leaderboard[foundIndex].averageScore || leaderboard[foundIndex].accuracy || 0,
    time: leaderboard[foundIndex].time || '--:--'
  } : { rank: '-', score: '-', accuracy: '-', time: '--:--' };

  return (
    <div style={{ ...styles.container, background: 'var(--bg)', color: 'var(--text)' }}>
      <h1 style={styles.title}>Quiz Results</h1>
      
      <div style={styles.leaderboardContainer}>
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Rank</th>
                <th style={styles.th}>Player</th>
                <th style={styles.th}>Score</th>
                <th style={styles.th}>Accuracy</th>
                <th style={styles.th}>Time</th>
              </tr>
            </thead>
            <tbody>
              {sampleLeaderboard.map((player, index) => (
                <tr 
                  key={player.id} 
                  style={{
                    ...styles.tr,
                    ...(index < 3 && styles.topThree),
                    ...(index === 1 && styles.secondPlace),
                    ...(index === 2 && styles.thirdPlace),
                  }}
                >
                  <td style={styles.td}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                  </td>
                  <td style={{ ...styles.td, textAlign: 'left' }}>
                    <div style={styles.playerCell}>
                      {index < 3 && (
                        <span style={styles.medal}>
                          {index === 0 ? '👑' : index === 1 ? '🥈' : '🥉'}
                        </span>
                      )}
                      {player.name}
                    </div>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.score}>{player.score}</span>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.accuracyBarContainer}>
                      <div 
                        style={{
                          ...styles.accuracyBar,
                          width: `${player.accuracy}%`,
                          backgroundColor: 
                            player.accuracy >= 90 ? '#10b981' : 
                            player.accuracy >= 70 ? '#3b82f6' : 
                            '#f59e0b'
                        }}
                      ></div>
                      <span style={styles.accuracyText}>{player.accuracy}%</span>
                    </div>
                  </td>
                  <td style={styles.td}>{player.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div style={styles.userStatsCard}>
          <h3 style={styles.userStatsTitle}>Your Performance</h3>
          <div style={styles.statsGrid}>
            <div style={styles.statItem}>
              <div style={styles.statValue}>{userScore.rank}</div>
              <div style={styles.statLabel}>Rank</div>
            </div>
            <div style={styles.statItem}>
              <div style={styles.statValue}>{userScore.score}</div>
              <div style={styles.statLabel}>Score</div>
            </div>
            <div style={styles.statItem}>
              <div style={styles.statValue}>{userScore.accuracy}%</div>
              <div style={styles.statLabel}>Accuracy</div>
            </div>
            <div style={styles.statItem}>
              <div style={styles.statValue}>{userScore.time}</div>
              <div style={styles.statLabel}>Time</div>
            </div>
          </div>
          
          <div style={styles.buttonGroup}>
            <button 
              style={styles.primaryBtn}
              onClick={() => navigate('/dashboard')}
            >
              Back to Dashboard
            </button>
            <button 
              style={styles.secondaryBtn}
              onClick={() => window.print()}
            >
              Download Certificate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '2rem 1rem',
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
    '&:last-child': {
      borderBottom: 'none',
    },
  },
  topThree: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    '&:nth-child(1)': {
      backgroundColor: 'rgba(255,255,255,0.02)',
      '& td': {
        fontWeight: 'bold',
        color: '#b45309',
      },
    },
  },
  secondPlace: {
    backgroundColor: '#f0fdf4',
    '& td': {
      color: '#047857',
    },
  },
  thirdPlace: {
    backgroundColor: '#eff6ff',
    '& td': {
      color: '#1d4ed8',
    },
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
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  accuracyBar: {
    height: '100%',
    borderRadius: '12px',
    transition: 'width 0.5s ease-in-out',
  },
  accuracyText: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    color: 'var(--button-text)',
    fontSize: '0.75rem',
    fontWeight: '600',
    textShadow: '0 0 2px rgba(0,0,0,0.5)',
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
  buttonGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
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
    '&:hover': {
      backgroundColor: '#4338ca',
    },
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
    '&:hover': {
      backgroundColor: 'rgba(255,255,255,0.02)',
    },
  },
};

export default Leaderboard;
