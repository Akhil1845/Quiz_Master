import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import config from '../config';

// Sample questions data - in a real app, this would come from an API
const sampleQuestions = [
  {
    id: 1,
    type: 'MCQ',
    question: 'What is polymorphism in Java?',
    options: [
      'A way to create multiple methods with same name',
      'A way to achieve runtime binding',
      'A way to achieve compile-time binding',
      'A way to achieve both compile-time and runtime binding'
    ],
    correctAnswer: 1,
    points: 10
  },
  {
    id: 2,
    type: 'written',
    question: 'Explain the concept of database normalization.',
    correctAnswer: '',
    points: 20
  }
  // More questions would be added here
];

function QuizScreen() {
  const navigate = useNavigate();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [selectedOption, setSelectedOption] = useState(null);
  const [writtenAnswer, setWrittenAnswer] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const timerRef = useRef(null);
  const [ws, setWs] = useState(null);
  const [myAnswers, setMyAnswers] = useState([]);
  const isHost = (localStorage.getItem('isHost') === 'true');

  const currentQuestion = sampleQuestions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === sampleQuestions.length - 1;

  // Timer effect
  useEffect(() => {
    if (timeLeft > 0 && !isSubmitted) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && !isSubmitted) {
      handleSubmit();
    }

    return () => clearTimeout(timerRef.current);
  }, [timeLeft, isSubmitted]);

  // Open WebSocket connection for quiz participant/host
  useEffect(() => {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const { WS_HOST, WS_PORT } = config;
    const host = WS_HOST || window.location.hostname;
    const port = WS_PORT || 3002;
    const wsUrl = new URL(`${proto}://${host}:${port}`);
    const quizCode = window.location.pathname.split('/').pop();
    const userId = localStorage.getItem('userId') || `user-${Math.random().toString(36).substr(2,9)}`;
    const username = localStorage.getItem('username') || `User-${userId.substring(0,4)}`;
    wsUrl.searchParams.append('quizCode', quizCode);
    wsUrl.searchParams.append('userId', userId);
    wsUrl.searchParams.append('username', username);
    wsUrl.searchParams.append('isHost', isHost ? 'true' : 'false');

    const socket = new WebSocket(wsUrl);
    socket.onopen = () => { console.log('Quiz WS connected'); setWs(socket); };
    socket.onmessage = (evt) => {
      try {
        const d = JSON.parse(evt.data);
        if (d.type === 'leaderboard') {
          // Save leaderboard and navigate to leaderboard page
          localStorage.setItem('latestLeaderboard', JSON.stringify(d.results || []));
          // clear host flag for safety
          if (isHost) localStorage.removeItem('isHost');
          navigate('/leaderboard');
        }
      } catch (e) { console.error('WS message error', e); }
    };
    socket.onerror = (e) => console.error('WS error', e);
    socket.onclose = () => console.log('Quiz WS closed');

    return () => {
      try { socket.close(); } catch (e) {}
      if (isHost) localStorage.removeItem('isHost');
    };
  }, []);

  const playerId = localStorage.getItem('userId');
  const playerName = localStorage.getItem('username') || `User-${playerId ? playerId.substring(0,4) : 'G'}`;

  const handleOptionSelect = (index) => {
    setSelectedOption(index);
  };

  const handleWrittenAnswerChange = (e) => {
    setWrittenAnswer(e.target.value);
  };

  const handleSubmit = () => {
    setIsSubmitted(true);
    clearTimeout(timerRef.current);
    // store locally
    const entry = {
      questionId: currentQuestion.id,
      referenceAnswer: currentQuestion.correctAnswer || '',
      answer: currentQuestion.type === 'MCQ' ? String(selectedOption) : writtenAnswer
    };
    const updated = [...myAnswers, entry];
    setMyAnswers(updated);

    // Send submission to server (whole set for this player)
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'submit-answers',
        submission: {
          playerId,
          playerName,
          answers: updated
        }
      }));
    }
  };

  const handleCollectScores = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'collect-scores' }));
    } else {
      alert('Real-time server not connected');
    }
  };

  const handleNextQuestion = () => {
    if (isLastQuestion) {
      navigate('/leaderboard');
    } else {
      // Reset for next question
      setCurrentQuestionIndex(prev => prev + 1);
      setTimeLeft(60);
      setSelectedOption(null);
      setWrittenAnswer('');
      setIsSubmitted(false);
    }
  };

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.questionCounter}>
          Question {currentQuestionIndex + 1} of {sampleQuestions.length}
        </div>
        <div style={styles.timer}>
          ⏱️ {formatTime(timeLeft)}
        </div>
      </div>

      <div style={styles.questionCard}>
        <h2 style={styles.questionText}>{currentQuestion.question}</h2>
        
        {currentQuestion.type === 'MCQ' ? (
          <div style={styles.optionsContainer}>
            {currentQuestion.options.map((option, index) => (
              <div 
                key={index}
                style={{
                  ...styles.option,
                  ...(selectedOption === index && styles.selectedOption),
                  ...(isSubmitted && index === currentQuestion.correctAnswer && styles.correctOption),
                  ...(isSubmitted && selectedOption === index && selectedOption !== currentQuestion.correctAnswer && styles.wrongOption)
                }}
                onClick={() => !isSubmitted && handleOptionSelect(index)}
              >
                {option}
              </div>
            ))}
          </div>
        ) : (
          <div style={styles.writtenContainer}>
            <textarea
              value={writtenAnswer}
              onChange={handleWrittenAnswerChange}
              style={styles.textarea}
              placeholder="Type your answer here..."
              disabled={isSubmitted}
              rows={6}
            />
          </div>
        )}

        <div style={styles.footer}>
          <div style={styles.points}>
            Points: {currentQuestion.points}
          </div>
          
          {!isSubmitted ? (
            <button 
              onClick={handleSubmit}
              style={styles.submitBtn}
              disabled={currentQuestion.type === 'MCQ' ? selectedOption === null : writtenAnswer.trim() === ''}
            >
              Submit
            </button>
          ) : (
            <button 
              onClick={handleNextQuestion}
              style={styles.nextBtn}
            >
              {isLastQuestion ? 'View Results' : 'Next Question'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '800px',
    margin: '2rem auto',
    padding: '0 1rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
  },
  questionCounter: {
    fontSize: '1.1rem',
    color: 'var(--muted)',
    fontWeight: '500',
  },
  timer: {
    backgroundColor: 'var(--accent)',
    color: 'var(--button-text)',
    padding: '0.5rem 1rem',
    borderRadius: '20px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  questionCard: {
    backgroundColor: 'var(--card-bg)',
    borderRadius: '12px',
    padding: '2rem',
    boxShadow: 'var(--shadow)',
  },
  questionText: {
    fontSize: '1.5rem',
    marginBottom: '2rem',
    color: 'var(--text)',
    lineHeight: '1.4',
  },
  optionsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    marginBottom: '2rem',
  },
  option: {
    padding: '1rem',
    border: '2px solid var(--border-color)',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    backgroundColor: 'var(--card-bg)',
  },
  selectedOption: {
    borderColor: 'var(--accent)',
    backgroundColor: 'rgba(124,58,237,0.06)',
  },
  correctOption: {
    borderColor: '#10b981',
    backgroundColor: 'rgba(16,185,129,0.06)',
  },
  wrongOption: {
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239,68,68,0.04)',
  },
  writtenContainer: {
    marginBottom: '2rem',
  },
  textarea: {
    width: '100%',
    padding: '1rem',
    borderRadius: '8px',
    border: '2px solid var(--border-color)',
    fontSize: '1rem',
    fontFamily: 'inherit',
    resize: 'vertical',
    minHeight: '150px',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '1.5rem',
    borderTop: '1px solid var(--border-color)',
  },
  points: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: 'var(--accent)',
  },
  submitBtn: {
    backgroundColor: 'var(--accent)',
    color: 'var(--button-text)',
    border: 'none',
    padding: '0.75rem 2rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '600',
    transition: 'background-color 0.2s',
  },
  nextBtn: {
    backgroundColor: '#10b981',
    color: 'var(--button-text)',
    border: 'none',
    padding: '0.75rem 2rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '600',
    transition: 'background-color 0.2s',
  },
};

export default QuizScreen;
