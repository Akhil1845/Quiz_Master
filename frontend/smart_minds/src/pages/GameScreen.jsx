import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Howl } from 'howler';
import Confetti from 'react-confetti';

// Sound effects
const sounds = {
  correct: new Howl({
    src: ['https://assets.mixkit.co/sfx/preview/mixkit-correct-answer-tone-2870.mp3'],
    volume: 0.5
  }),
  wrong: new Howl({
    src: ['https://assets.mixkit.co/sfx/preview/mixkit-wrong-answer-fail-notification-946.mp3'],
    volume: 0.5
  }),
  timer: new Howl({
    src: ['https://assets.mixkit.co/sfx/preview/mixkit-alarm-digital-clock-beep-989.mp3'],
    volume: 0.3
  }),
  background: new Howl({
    src: ['https://assets.mixkit.co/music/preview/mixkit-game-show-suspense-waiting-668.mp3'],
    loop: true,
    volume: 0.2
  })
};

function GameScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const { quiz } = location.state || {};
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(quiz?.timePerQuestion || 30);
  const [gameOver, setGameOver] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [playerRank, setPlayerRank] = useState(0);
  const [players, setPlayers] = useState([
    { id: 1, name: 'You', score: 0, avatar: '👤' },
    { id: 2, name: 'Player 2', score: 0, avatar: '👨' },
    { id: 3, name: 'Player 3', score: 0, avatar: '👩' },
  ]);

  const timerRef = useRef(null);
  const question = quiz?.questions?.[currentQuestion];
  const progress = ((currentQuestion) / (quiz?.questions?.length || 1)) * 100;

  // Initialize game
  useEffect(() => {
    if (!quiz) {
      navigate('/dashboard');
      return;
    }

    // Start background music if enabled
    if (quiz.enableSounds) {
      sounds.background.play();
    }

    // Simulate other players (for demo)
    const playerInterval = setInterval(() => {
      setPlayers(prevPlayers => 
        prevPlayers.map(player => 
          player.id === 1 ? player : { 
            ...player, 
            score: player.score + Math.floor(Math.random() * 3) 
          }
        )
      );
    }, 3000);

    return () => {
      clearInterval(playerInterval);
      sounds.background.stop();
    };
  }, [quiz, navigate]);

  // Timer logic
  useEffect(() => {
    if (timeLeft > 0 && !showFeedback && !gameOver) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(prev => {
          if (prev <= 5 && quiz.enableSounds) {
            sounds.timer.play();
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timeLeft === 0 && !showFeedback) {
      handleAnswerSelect(null);
    }

    return () => clearTimeout(timerRef.current);
  }, [timeLeft, showFeedback, gameOver, quiz?.enableSounds]);

  // Update leaderboard
  useEffect(() => {
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    setLeaderboard(sortedPlayers);
    const playerIndex = sortedPlayers.findIndex(p => p.id === 1);
    setPlayerRank(playerIndex + 1);
  }, [players, score]);

  const handleAnswerSelect = useCallback((answer) => {
    if (showFeedback) return;

    const correct = answer === question.correctAnswer;
    setSelectedAnswer(answer);
    setIsCorrect(correct);
    setShowFeedback(true);

    // Update score
    if (correct) {
      const points = Math.max(10, Math.floor(timeLeft * 0.5));
      setScore(prev => prev + points);
      setPlayers(prev => 
        prev.map(p => p.id === 1 ? { ...p, score: p.score + points } : p)
      );
      
      if (quiz.enableSounds) {
        sounds.correct.play();
      }
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    } else if (quiz.enableSounds) {
      sounds.wrong.play();
    }

    // Move to next question or end game
    setTimeout(() => {
      setShowFeedback(false);
      setSelectedAnswer(null);
      
      if (currentQuestion < quiz.questions.length - 1) {
        setCurrentQuestion(prev => prev + 1);
        setTimeLeft(quiz.timePerQuestion || 30);
      } else {
        setGameOver(true);
      }
    }, 2000);
  }, [currentQuestion, question, quiz, showFeedback, timeLeft]);

  if (gameOver) {
    return (
      <div style={styles.gameOverContainer}>
        <h1>🎉 Quiz Complete! 🎉</h1>
        <div style={styles.scoreContainer}>
          <h2>Your Score: {score}</h2>
          <p>You ranked #{playerRank} out of {players.length} players</p>
        </div>
        <button 
          onClick={() => navigate('/dashboard')}
          style={styles.primaryButton}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (!question) {
    return <div>Loading...</div>;
  }

  return (
    <div style={styles.container}>
      {showConfetti && <Confetti recycle={false} numberOfPieces={200} />}
      
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.timerContainer}>
          <div style={styles.timerCircle}>
            <span style={styles.timerText}>{timeLeft}s</span>
          </div>
          <div style={styles.questionCounter}>
            Question {currentQuestion + 1} of {quiz.questions.length}
          </div>
        </div>
        
        <div style={styles.scoreContainer}>
          <span style={styles.scoreBadge}>🏆 {score} points</span>
          <span style={styles.rankBadge}>Rank: #{playerRank}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={styles.progressBarContainer}>
        <div 
          style={{
            ...styles.progressBar,
            width: `${progress}%`,
            background: `linear-gradient(90deg, #4CAF50, #8BC34A)`
          }} 
        />
      </div>

      {/* Question */}
      <div style={styles.questionContainer}>
        <h2 style={styles.questionText}>{question.question}</h2>
      </div>

      {/* Answer Options */}
      <div style={styles.optionsContainer}>
        {question.options.map((option, index) => {
          const isSelected = selectedAnswer === option;
          const isCorrectAnswer = option === question.correctAnswer;
          let optionStyle = styles.option;
          
          if (showFeedback) {
            if (isCorrectAnswer) {
              optionStyle = styles.correctOption;
            } else if (isSelected) {
              optionStyle = styles.wrongOption;
            }
          } else if (isSelected) {
            optionStyle = styles.selectedOption;
          }
          
          return (
            <button
              key={index}
              onClick={() => handleAnswerSelect(option)}
              style={optionStyle}
              disabled={showFeedback}
            >
              {option}
              {showFeedback && isCorrectAnswer && (
                <span style={styles.feedbackIcon}>✓</span>
              )}
              {showFeedback && isSelected && !isCorrectAnswer && (
                <span style={styles.feedbackIcon}>✗</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Leaderboard */}
      {quiz.showLeaderboard && (
        <div style={styles.leaderboardContainer}>
          <h3>🏆 Leaderboard</h3>
          <div style={styles.leaderboard}>
            {leaderboard.slice(0, 5).map((player, index) => (
              <div 
                key={player.id} 
                style={{
                  ...styles.leaderboardItem,
                  background: player.id === 1 ? '#e3f2fd' : 'white',
                  borderLeft: `4px solid ${getRankColor(index + 1)}`
                }}
              >
                <span style={styles.rank}>{index + 1}</span>
                <span style={styles.playerName}>
                  {player.avatar} {player.name}
                </span>
                <span style={styles.playerScore}>{player.score} pts</span>
                {index < 3 && (
                  <span style={styles.medal}>
                    {['🥇', '🥈', '🥉'][index]}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const getRankColor = (rank) => {
  const colors = ['#FFD700', '#C0C0C0', '#CD7F32', '#4CAF50', '#2196F3'];
  return colors[rank - 1] || '#9E9E9E';
};

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: '"Inter", sans-serif',
    backgroundColor: '#f8f9fa',
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '15px',
  },
  timerContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },
  timerCircle: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #ff6b6b, #f06595)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '1.2rem',
    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
  },
  questionCounter: {
    fontSize: '1rem',
    color: '#495057',
    fontWeight: '500',
  },
  scoreContainer: {
    display: 'flex',
    gap: '15px',
    alignItems: 'center',
  },
  scoreBadge: {
    backgroundColor: '#4CAF50',
    color: 'white',
    padding: '8px 15px',
    borderRadius: '20px',
    fontWeight: '600',
    boxShadow: '0 2px 10px rgba(76, 175, 80, 0.3)',
  },
  rankBadge: {
    backgroundColor: '#2196F3',
    color: 'white',
    padding: '8px 15px',
    borderRadius: '20px',
    fontWeight: '600',
    boxShadow: '0 2px 10px rgba(33, 150, 243, 0.3)',
  },
  progressBarContainer: {
    width: '100%',
    height: '10px',
    backgroundColor: '#e9ecef',
    borderRadius: '5px',
    marginBottom: '30px',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: '5px',
    transition: 'width 0.3s ease',
  },
  questionContainer: {
    backgroundColor: 'white',
    padding: '25px',
    borderRadius: '12px',
    marginBottom: '25px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
  },
  questionText: {
    fontSize: '1.4rem',
    color: '#2d3436',
    margin: 0,
    lineHeight: 1.4,
  },
  optionsContainer: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '15px',
    marginBottom: '30px',
  },
  option: {
    padding: '15px 20px',
    border: '2px solid #e9ecef',
    borderRadius: '10px',
    backgroundColor: 'white',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '500',
    color: '#495057',
    transition: 'all 0.2s ease',
    textAlign: 'left',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    ':hover': {
      borderColor: '#4CAF50',
      backgroundColor: '#f8f9fa',
    },
  },
  selectedOption: {
    borderColor: '#4CAF50',
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
  },
  correctOption: {
    borderColor: '#4CAF50',
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
    transform: 'scale(1.02)',
    boxShadow: '0 4px 15px rgba(76, 175, 80, 0.3)',
  },
  wrongOption: {
    borderColor: '#f44336',
    backgroundColor: '#ffebee',
    color: '#c62828',
  },
  feedbackIcon: {
    fontSize: '1.2rem',
    marginLeft: '10px',
  },
  leaderboardContainer: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
  },
  leaderboard: {
    marginTop: '15px',
  },
  leaderboardItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 15px',
    marginBottom: '10px',
    borderRadius: '8px',
    backgroundColor: 'white',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
  },
  rank: {
    fontWeight: 'bold',
    color: '#495057',
    width: '24px',
  },
  playerName: {
    flex: 1,
    margin: '0 15px',
    fontWeight: '500',
  },
  playerScore: {
    fontWeight: '600',
    color: '#4CAF50',
  },
  medal: {
    marginLeft: '10px',
    fontSize: '1.2rem',
  },
  gameOverContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f8f9fa',
    textAlign: 'center',
    padding: '20px',
  },
  primaryButton: {
    padding: '12px 30px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1.1rem',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '20px',
    transition: 'all 0.3s ease',
    ':hover': {
      backgroundColor: '#43a047',
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)',
    },
  },
};

export default GameScreen;
