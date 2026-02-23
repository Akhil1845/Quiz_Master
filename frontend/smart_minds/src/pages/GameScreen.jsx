import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Howl } from 'howler';
import Confetti from 'react-confetti';

/* ---------------- SOUNDS ---------------- */
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
  })
};

function GameScreen() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { quiz } = state || {};

  /* ---------------- USER INFO ---------------- */
  const isHost = localStorage.getItem('isHost') === 'true';
  const username = localStorage.getItem('username') || 'Anonymous';
  const userId = localStorage.getItem('userId');

  /* ---------------- WEBSOCKET ---------------- */
  const socketRef = useRef(null);

  /* ---------------- GAME STATE ---------------- */
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeLeft, setTimeLeft] = useState(quiz?.timePerQuestion || 30);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  /* ---------------- MCQ STATS ---------------- */
  const [mcqCorrect, setMcqCorrect] = useState(0);
  const [mcqTotal, setMcqTotal] = useState(0);

  /* ---------------- WRITTEN STATS ---------------- */
  const [writtenAnswer, setWrittenAnswer] = useState('');
  const [writtenCorrect, setWrittenCorrect] = useState(0);
  const [writtenTotal, setWrittenTotal] = useState(0);

  const timerRef = useRef(null);
  const question = quiz?.questions?.[currentQuestion];

  /* ---------------- CONNECT WS ---------------- */
  useEffect(() => {
    const quizCode = quiz?.code || localStorage.getItem('quizCode');

    socketRef.current = new WebSocket(
      `ws://localhost:3002/?quizCode=${quizCode}&userId=${userId}&username=${username}&isHost=${isHost}`
    );

    socketRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'timer-update') {
        setTimeLeft(data.timeLeft);
      }

      if (data.type === 'next-question') {
        setCurrentQuestion(data.questionIndex);
        setTimeLeft(data.timeLeft);
      }
    };

    return () => socketRef.current?.close();
  }, [quiz, isHost, username, userId]);

  /* ---------------- HOST TIMER (ONLY HOST RUNS THIS) ---------------- */
  useEffect(() => {
    if (!isHost || gameOver) return;

    if (timeLeft > 0) {
      timerRef.current = setTimeout(() => {
        const next = timeLeft - 1;
        setTimeLeft(next);

        socketRef.current?.send(JSON.stringify({
          type: 'timer-update',
          timeLeft: next
        }));

        if (next <= 5) sounds.timer.play();
      }, 1000);
    } else {
      handleAnswerSelect(null);
    }

    return () => clearTimeout(timerRef.current);
  }, [timeLeft, isHost, gameOver]);

  /* ---------------- ANSWER HANDLER ---------------- */
  const handleAnswerSelect = useCallback((answer) => {
    if (showFeedback || gameOver) return;

    const isWritten = question.type === 'written';
    let correct = false;

    if (isWritten) {
      setWrittenTotal(p => p + 1);
      correct =
        (answer || '').trim().toLowerCase() ===
        question.correctAnswer.trim().toLowerCase();

      if (correct) setWrittenCorrect(p => p + 1);
    } else {
      setMcqTotal(p => p + 1);
      correct = answer === question.correctAnswer;

      if (correct) {
        setMcqCorrect(p => p + 1);
        setScore(p => p + 10);
        sounds.correct.play();
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 2000);
      } else {
        sounds.wrong.play();
      }
    }

    setIsCorrect(correct);
    setShowFeedback(true);

    setTimeout(() => {
      setShowFeedback(false);
      setSelectedAnswer(null);
      setWrittenAnswer('');

      if (currentQuestion < quiz.questions.length - 1) {
        const nextIndex = currentQuestion + 1;
        setCurrentQuestion(nextIndex);

        if (isHost) {
          socketRef.current?.send(JSON.stringify({
            type: 'next-question',
            questionIndex: nextIndex,
            timeLeft: quiz.timePerQuestion
          }));
        }
      } else {
        setGameOver(true);
      }
    }, 1500);
  }, [question, currentQuestion, quiz, isHost, showFeedback, gameOver]);

  /* ---------------- GAME OVER ---------------- */
  if (gameOver) {
    const mcqAccuracy = mcqTotal ? Math.round((mcqCorrect / mcqTotal) * 100) : 0;
    const writtenAccuracy = writtenTotal ? Math.round((writtenCorrect / writtenTotal) * 100) : 0;

    const finalResult = {
      playerId: userId,
      name: username,
      score,
      correctCount: mcqCorrect,
      totalQuestions: mcqTotal,
      accuracy: mcqAccuracy,
      writtenCount: writtenTotal,
      writtenAccuracy,
      time: '--:--'
    };

    localStorage.setItem('latestLeaderboard', JSON.stringify([finalResult]));

    return (
      <div style={styles.gameOverContainer}>
        <h1>🎉 Quiz Complete!</h1>
        <p>Score: {score}</p>
        <p>MCQ Accuracy: {mcqAccuracy}%</p>
        {writtenTotal > 0 && <p>Written Accuracy: {writtenAccuracy}%</p>}

        <button
          style={styles.primaryButton}
          onClick={() => navigate('/leaderboard', { state: { isHost } })}
        >
          View Leaderboard
        </button>
      </div>
    );
  }

  if (!question) return <div>Loading...</div>;

  /* ---------------- UI ---------------- */
  return (
    <div style={styles.container}>
      {showConfetti && <Confetti recycle={false} numberOfPieces={200} />}

      <div style={styles.header}>
        <div style={styles.timerCircle}>{timeLeft}s</div>
        <span style={styles.scoreBadge}>🏆 {score}</span>
      </div>

      <div style={styles.questionContainer}>
        <h2>{question.question}</h2>
      </div>

      {question.type === 'written' ? (
        <div style={styles.questionContainer}>
          <input
            value={writtenAnswer}
            onChange={(e) => setWrittenAnswer(e.target.value)}
            style={styles.textInput}
          />
          <button
            style={styles.primaryButton}
            onClick={() => handleAnswerSelect(writtenAnswer)}
          >
            Submit
          </button>
        </div>
      ) : (
        <div style={styles.optionsContainer}>
          {question.options.map((opt, i) => (
            <button
              key={i}
              style={styles.option}
              onClick={() => handleAnswerSelect(opt)}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- CSS (UNCHANGED) ---------------- */
const styles = {
  container: { maxWidth: '800px', margin: '0 auto', padding: '20px', background: '#f8f9fa', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', marginBottom: '20px' },
  timerCircle: { width: '60px', height: '60px', borderRadius: '50%', background: '#ff6b6b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  scoreBadge: { background: '#4CAF50', color: '#fff', padding: '8px 15px', borderRadius: '20px' },
  questionContainer: { background: '#fff', padding: '25px', borderRadius: '12px', marginBottom: '20px' },
  optionsContainer: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' },
  option: { padding: '15px', borderRadius: '10px', border: '2px solid #e9ecef' },
  textInput: { width: '100%', padding: '15px', borderRadius: '8px', border: '2px solid #e9ecef' },
  primaryButton: { padding: '12px 30px', background: '#4CAF50', color: '#fff', border: 'none', borderRadius: '8px' },
  gameOverContainer: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }
};

export default GameScreen;
