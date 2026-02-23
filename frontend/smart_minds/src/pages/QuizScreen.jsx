import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import config from '../config';

function QuizScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { quizCode } = useParams();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(() => {
    const saved = localStorage.getItem(`quiz_${quizCode}_currentQuestion`);
    return saved ? parseInt(saved) : 0;
  });
  const [timePerQuestion, setTimePerQuestion] = useState(() => {
    const currentQuiz = JSON.parse(localStorage.getItem('currentQuiz') || '{}');
    return currentQuiz.timePerQuestion || 30;
  });

  const computeInitialTimeLeft = () => {
    const isHostCheck = Boolean(location.state?.isHost) || (localStorage.getItem('isHost') === 'true');
    // Try to get timePerQuestion from currentQuiz first, then localStorage, then default to 30
    const currentQuiz = JSON.parse(localStorage.getItem('currentQuiz') || '{}');
    const perQ = currentQuiz.timePerQuestion || parseInt(localStorage.getItem(`quiz_${quizCode}_timePerQuestion`)) || 30;
    const expiredKey = `quiz_${quizCode}_questionExpired_${currentQuestionIndex}`;
    const startKey = `quiz_${quizCode}_questionStartTime_${currentQuestionIndex}`;

    const expired = localStorage.getItem(expiredKey) === 'true';
    if (expired) return 0;

    const startTime = localStorage.getItem(startKey);
    if (startTime) {
      const elapsed = Math.floor((Date.now() - parseInt(startTime, 10)) / 1000);
      return Math.max(0, perQ - elapsed);
    }

    // If host, we still set a start time later; return full duration now
    return perQ;
  };

  const [timeLeft, setTimeLeft] = useState(computeInitialTimeLeft);
  const [selectedOption, setSelectedOption] = useState(null);
  const [writtenAnswer, setWrittenAnswer] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);
  const currentQuestionIndexRef = useRef(0);
  const questionsRef = useRef([]);
  const [ws, setWs] = useState(null);
  const [myAnswers, setMyAnswers] = useState([]);
  const [attemptCount, setAttemptCount] = useState(0);
  const [answerStats, setAnswerStats] = useState({ A: 0, B: 0, C: 0, D: 0 });
  const [writtenRanked, setWrittenRanked] = useState([]);
  const [writtenSubmissions, setWrittenSubmissions] = useState(0);
  const [writtenAccuracy, setWrittenAccuracy] = useState(null);
  const [showAnswerReveal, setShowAnswerReveal] = useState(false);
  const [submissionMessage, setSubmissionMessage] = useState('');
  const [canMoveToNext, setCanMoveToNext] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const [questionRevision, setQuestionRevision] = useState(0); // Force re-render when correct answer arrives
  const [revealedCorrectAnswer, setRevealedCorrectAnswer] = useState(null); // Store revealed correct answer
  const leaderboardTimeoutRef = useRef(null);
  const isHost = Boolean(location.state?.isHost) || (localStorage.getItem('isHost') === 'true');

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = questions.length > 0 && currentQuestionIndex === questions.length - 1;

  // Keep refs in sync with state for WebSocket handler access
  useEffect(() => {
    questionsRef.current = questions;
    currentQuestionIndexRef.current = currentQuestionIndex;
  }, [questions, currentQuestionIndex]);

  // Send quiz-info to server after questions are loaded (for host)
  useEffect(() => {
    if (isHost && ws && ws.readyState === WebSocket.OPEN && questions.length > 0) {
      const currentQuiz = JSON.parse(localStorage.getItem('currentQuiz') || '{}');
      console.log('[HOST] Sending quiz-info with questions to server:', questions.length, 'questions');
      ws.send(JSON.stringify({
        type: 'quiz-info',
        quiz: {
          quizCode: quizCode,
          subject: currentQuiz.subject,
          difficulty: currentQuiz.difficulty,
          numQuestions: questions.length,
          maxParticipants: currentQuiz.maxParticipants,
          timePerQuestion: currentQuiz.timePerQuestion || timePerQuestion,
          showTimer: currentQuiz.showTimer,
          questionType: currentQuiz.questionType,
          questions: questions.map((q, idx) => ({
            id: q.id,
            question: q.question,
            correctAnswer: q.correctAnswer,
            type: q.type,
            options: q.options,
            points: q.points
          }))
        }
      }));
    }
  }, [isHost, ws, questions, quizCode, timePerQuestion]);
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setIsLoading(true);
        
        // Save quiz code for later use
        localStorage.setItem('currentQuizCode', quizCode);
        
        // First try to get from localStorage
        const currentQuiz = JSON.parse(localStorage.getItem('currentQuiz') || '{}');
        
        // Set time per question from quiz config
        if (currentQuiz.timePerQuestion) {
          setTimePerQuestion(currentQuiz.timePerQuestion);
          setTimeLeft(currentQuiz.timePerQuestion);
        }
        
        if (currentQuiz.questions && Array.isArray(currentQuiz.questions) && currentQuiz.questions.length > 0) {
          // Ensure each question has an ID and type for tracking
          const questionsWithIds = currentQuiz.questions.map((q, index) => ({
            ...q,
            id: q.id !== undefined && q.id !== null ? String(q.id) : `q${index + 1}`,
            // Normalize type: use stored type or infer from quiz config, default to MCQ
            type: q.type || currentQuiz.questionType || 'MCQ'
          }));
          console.log('[FRONTEND] Loaded questions from localStorage with IDs:', questionsWithIds.map(q => ({ 
            id: q.id, 
            question: q.question, 
            type: q.type,
            correctAnswer: q.correctAnswer,
            hasCorrectAnswer: q.correctAnswer !== undefined && q.correctAnswer !== null
          })));
          setQuestions(questionsWithIds);
          setError(null);
          setIsLoading(false);
          return;
        }

        // If not in localStorage, try API
        if (quizCode) {
          // Always include answers so participants can include correctAnswer in submissions for proper scoring
          // Correct answers are still hidden from UI via conditional rendering
          const includeAnswers = 'true';
          const response = await fetch(`${config.API_BASE_URL}/quizzes/questions/${quizCode}?includeAnswers=${includeAnswers}`);
          if (!response.ok) throw new Error(`Failed to fetch questions: ${response.statusText}`);
          const data = await response.json();
          const questionsWithIds = (data.questions || []).map((q, index) => ({
            ...q,
            id: q.id !== undefined && q.id !== null ? String(q.id) : `q${index + 1}`,
            // Normalize type: default to MCQ if not provided
            type: q.type || 'MCQ'
          }));
          console.log('[FRONTEND] Loaded questions with IDs:', questionsWithIds.map(q => ({ id: q.id, question: q.question, type: q.type, hasCorrectAnswer: q.correctAnswer !== undefined })));
          setQuestions(questionsWithIds);
          setError(null);
        }
      } catch (err) {
        console.error('Error fetching questions:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, [quizCode, isHost]);

  // Timer effect - auto-submit when time runs out (only for participants)
  useEffect(() => {
    // For HOST: Timer runs and broadcasts to participants
    if (isHost) {
      if (timeLeft > 0 && !showAnswerReveal) {
        timerRef.current = setTimeout(() => {
          const newTime = timeLeft - 1;
          setTimeLeft(newTime);
          
          // Broadcast timer update to all participants every second with server timestamp
          if (ws && ws.readyState === WebSocket.OPEN && currentQuestion) {
            const timerUpdate = {
              type: 'timer-sync',
              questionId: currentQuestion.id,
              timeLeft: newTime,
              timePerQuestion: timePerQuestion,
              serverTimestamp: Date.now()
            };
            console.log('[HOST] Broadcasting timer update:', timerUpdate);
            ws.send(JSON.stringify(timerUpdate));
          }
        }, 1000);
      } else if (timeLeft === 0 && !showAnswerReveal && currentQuestion) {
        // Time is up - reveal answer for everyone
        const expiredKey = `quiz_${quizCode}_questionExpired_${currentQuestionIndex}`;
        localStorage.setItem(expiredKey, 'true');
        setShowAnswerReveal(true);
        
        // Get the correct answer - prefer from currentQuestion, fallback to questions array
        const correctAnswer = currentQuestion.correctAnswer !== undefined 
          ? currentQuestion.correctAnswer
          : questions[currentQuestionIndex]?.correctAnswer;
        
        console.log('[HOST] Time expired!', {
          hasCorrectAnswer: correctAnswer !== undefined,
          correctAnswer: correctAnswer,
          questionId: currentQuestion.id,
          fromCurrentQuestion: currentQuestion.correctAnswer,
          fromQuestionsArray: questions[currentQuestionIndex]?.correctAnswer
        });
        
        if (ws && ws.readyState === WebSocket.OPEN) {
          // First, send a time-up signal to stop all participant timers immediately
          console.log('[HOST] Broadcasting time-up signal for question:', currentQuestion.id);
          ws.send(JSON.stringify({
            type: 'time-up',
            questionId: currentQuestion.id
          }));
          
          // Then send the correct answer if available
          if (correctAnswer !== undefined && correctAnswer !== null) {
            console.log('[HOST] Sending correct answer:', correctAnswer, 'for question:', currentQuestion.id);
            
            // Host also sets its own revealed answer for display
            setRevealedCorrectAnswer(correctAnswer);
            
            ws.send(JSON.stringify({
              type: 'reveal-answer',
              questionId: currentQuestion.id,
              correctAnswer: correctAnswer
            }));
          } else {
            console.error('[HOST] Cannot reveal answer - correctAnswer is undefined/null!', {
              currentQuestion,
              questionsArrayEntry: questions[currentQuestionIndex]
            });
          }
        }
        
        setCanMoveToNext(true);
      }
    } else {
      // For PARTICIPANTS: Local countdown timer synced with host
      if (timeLeft > 0 && !showAnswerReveal) {
        timerRef.current = setTimeout(() => {
          const newTime = Math.max(0, timeLeft - 1);
          console.log('[PARTICIPANT] Local timer countdown:', newTime);
          setTimeLeft(newTime);
        }, 1000);
      } else if (timeLeft === 0 && !showAnswerReveal && currentQuestion) {
        // Only handle time-up case
        const expiredKey = `quiz_${quizCode}_questionExpired_${currentQuestionIndex}`;
        localStorage.setItem(expiredKey, 'true');
        setShowAnswerReveal(true);
        
        if (!isSubmitted) {
          handleSubmit();
        }
      }
    }

    return () => clearTimeout(timerRef.current);
  }, [timeLeft, isSubmitted, showAnswerReveal, isHost, currentQuestion, ws, quizCode, currentQuestionIndex]);

  // Request answer stats when question INDEX changes (for host)
  useEffect(() => {
    console.log('[HOST STATS] useEffect triggered - currentQuestionIndex:', currentQuestionIndex, 'isHost:', isHost, 'ws ready:', ws?.readyState === WebSocket.OPEN, 'currentQuestion:', currentQuestion?.id);
    if (isHost && ws && ws.readyState === WebSocket.OPEN && currentQuestion) {
      console.log('[HOST] Question index changed, requesting stats for question:', currentQuestion.id, 'Question text:', currentQuestion.question);
      // Clear old stats first when moving to a new question index
      setAnswerStats({ A: 0, B: 0, C: 0, D: 0 });
      setAttemptCount(0);
      setWrittenRanked([]);
      setWrittenSubmissions(0);
      
      // Send requests for stats
      ws.send(JSON.stringify({
        type: 'get-answer-stats',
        questionId: currentQuestion.id
      }));
      ws.send(JSON.stringify({
        type: 'get-attempt-count',
        questionId: currentQuestion.id
      }));
      // Written stats request for non-MCQ
      if (currentQuestion.type !== 'MCQ') {
        ws.send(JSON.stringify({
          type: 'get-written-stats',
          questionId: currentQuestion.id
        }));
      }
      
      // Retry if no response in 2 seconds
      const retryTimeout = setTimeout(() => {
        console.log('[HOST] Retrying stats request for question:', currentQuestion.id);
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'get-answer-stats',
            questionId: currentQuestion.id
          }));
          ws.send(JSON.stringify({
            type: 'get-attempt-count',
            questionId: currentQuestion.id
          }));
          if (currentQuestion.type !== 'MCQ') {
            ws.send(JSON.stringify({
              type: 'get-written-stats',
              questionId: currentQuestion.id
            }));
          }
        }
      }, 2000);

      // Periodic polling every 1 second to keep stats updated
      const pollInterval = setInterval(() => {
        const currentQ = questionsRef.current[currentQuestionIndexRef.current];
        console.log('[HOST] Polling stats for question:', currentQ?.id, 'type:', currentQ?.type);
        if (ws && ws.readyState === WebSocket.OPEN && currentQ) {
          ws.send(JSON.stringify({
            type: 'get-answer-stats',
            questionId: currentQ.id
          }));
          ws.send(JSON.stringify({
            type: 'get-attempt-count',
            questionId: currentQ.id
          }));
          // Always request written stats - server will respond with empty if not written type
          ws.send(JSON.stringify({
            type: 'get-written-stats',
            questionId: currentQ.id
          }));
        }
      }, 1000);
      
      return () => {
        clearTimeout(retryTimeout);
        clearInterval(pollInterval);
      };
    }
  }, [currentQuestionIndex, isHost, ws]); // Removed currentQuestion from dependencies to prevent re-triggering

  // For PARTICIPANTS: poll attempt count so 'Participants Attempted' updates live
  useEffect(() => {
    if (!isHost && ws && ws.readyState === WebSocket.OPEN && currentQuestion) {
      // Initial request
      ws.send(JSON.stringify({
        type: 'get-attempt-count',
        questionId: currentQuestion.id
      }));

      const pollInterval = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'get-attempt-count',
            questionId: currentQuestion.id
          }));
        }
      }, 1000);

      return () => clearInterval(pollInterval);
    }
  }, [currentQuestionIndex, isHost, ws, currentQuestion]);

  // Debug: Log canMoveToNext state changes
  useEffect(() => {
    console.log('canMoveToNext changed to:', canMoveToNext, 'isHost:', isHost);
  }, [canMoveToNext, isHost]);

  // Store current question and start time in localStorage to handle refresh (both host and participants)
  useEffect(() => {
    if (currentQuestion) {
      localStorage.setItem(`quiz_${quizCode}_currentQuestion`, currentQuestionIndex.toString());
      localStorage.setItem(`quiz_${quizCode}_timePerQuestion`, timePerQuestion.toString());
      
      const startKey = `quiz_${quizCode}_questionStartTime_${currentQuestionIndex}`;
      const expiredKey = `quiz_${quizCode}_questionExpired_${currentQuestionIndex}`;
      const existingStartTime = localStorage.getItem(startKey);

      // If already expired, keep it expired and ensure timer shows 0
      if (localStorage.getItem(expiredKey) === 'true') {
        setTimeLeft(0);
        setShowAnswerReveal(true);
        setIsSubmitted(true);
        // Host can always move to next; participants wait for host signal
        // Don't override canMoveToNext for participants - let the 'next-question-ready' handler set it
        if (isHost) {
          setCanMoveToNext(true);
        }
        // For participants: don't set canMoveToNext here, it will be set by 'next-question-ready' message
        return;
      }

      // Only set start time if not already set for this question
      if (!existingStartTime) {
        const startTime = Date.now();
        localStorage.setItem(startKey, startTime.toString());
      }

      // Recompute remaining time based on stored start time
      const perQ = timePerQuestion || 30;
      const startTimeVal = parseInt(localStorage.getItem(startKey) || '0', 10);
      if (startTimeVal) {
        const elapsed = Math.floor((Date.now() - startTimeVal) / 1000);
        setTimeLeft(Math.max(0, perQ - elapsed));
      } else {
        setTimeLeft(perQ);
      }
      
      // If host, broadcast initial timer state to all participants when question changes
      if (isHost && ws && ws.readyState === WebSocket.OPEN) {
        const currentTime = Math.max(0, perQ - Math.floor((Date.now() - startTimeVal) / 1000));
        console.log('[HOST] Broadcasting initial timer state:', { questionId: currentQuestion.id, timeLeft: currentTime, timePerQuestion: perQ });
        ws.send(JSON.stringify({
          type: 'timer-sync',
          questionId: currentQuestion.id,
          timeLeft: currentTime,
          timePerQuestion: perQ
        }));
      }
    }
  }, [currentQuestionIndex, currentQuestion, quizCode, timePerQuestion, isHost, ws]);

  // Open WebSocket connection for quiz participant/host
  useEffect(() => {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const { WS_HOST, WS_PORT } = config;
    const host = WS_HOST || window.location.hostname;
    const port = WS_PORT || 3002;
    const wsUrl = new URL(`${proto}://${host}:${port}`);
    const userId = localStorage.getItem('userId') || `user-${Math.random().toString(36).substr(2,9)}`;
    const username = localStorage.getItem('username') || `User-${userId.substring(0,4)}`;
    wsUrl.searchParams.append('quizCode', quizCode);
    wsUrl.searchParams.append('userId', userId);
    wsUrl.searchParams.append('username', username);
    wsUrl.searchParams.append('isHost', isHost ? 'true' : 'false');

    const socket = new WebSocket(wsUrl);
    socket.onopen = () => { 
      console.log('[WS] Quiz WS connected. isHost:', isHost, 'quizCode:', quizCode); 
      setWs(socket);
      
      // Log current state
      console.log('[WS] Current questions loaded:', questions.length);
      console.log('[WS] Current question index:', currentQuestionIndex);
      console.log('[WS] TimePerQuestion:', timePerQuestion);
      
      // If host, request initial answer stats for current question
      if (isHost && currentQuestion) {
        setTimeout(() => {
          socket.send(JSON.stringify({
            type: 'get-answer-stats',
            questionId: currentQuestion.id
          }));
        }, 200);
      } else if (!isHost && currentQuestion) {
        // If participant, request initial timer-sync to sync with host's current time
        setTimeout(() => {
          console.log('[PARTICIPANT] Requesting initial timer sync on connection for:', currentQuestion.id);
          socket.send(JSON.stringify({
            type: 'request-timer-sync',
            questionId: currentQuestion.id
          }));
        }, 200);
      }
    };
    socket.onmessage = (evt) => {
      try {
        const d = JSON.parse(evt.data);
        // Normalize message type so participants handle both server variants
        if (d.type === 'reveal-answer') {
          d.type = 'answer-revealed';
        }
        if (d.type === 'quiz-info') {
          // Participant receives quiz info from server - can update questions if needed
          console.log('[PARTICIPANT] Received quiz-info from server:', d.quiz);
          // Could use this to update questions if they weren't in localStorage
          // For now, just log it
        } else if (d.type === 'leaderboard') {
          // Save leaderboard and navigate to leaderboard page
          console.log('[QUIZ] Received leaderboard message with results:', d.results);
          localStorage.setItem('latestLeaderboard', JSON.stringify(d.results || []));
          console.log('[QUIZ] Saved to localStorage, now navigating...');
          
          if (leaderboardTimeoutRef.current) {
            clearTimeout(leaderboardTimeoutRef.current);
            leaderboardTimeoutRef.current = null;
          }
          // clear host flag for safety
          if (isHost) localStorage.removeItem('isHost');

          // Navigate with leaderboard data in state
          const currentQuiz = JSON.parse(localStorage.getItem('currentQuiz') || '{}');
          navigate('/leaderboard', {
            state: {
              leaderboard: d.results || [],
              isHost,
              questionType: currentQuiz.questionType
            }
          });
        } else if (d.type === 'question-attempt-count') {
          // Receive attempt count for current question using refs to avoid stale closures
          const currentQ = questionsRef.current[currentQuestionIndexRef.current];
          console.log('[HOST] Received attempt-count:', d.count, 'for questionId:', d.questionId, 'current:', currentQ?.id);
          if (currentQ && (d.questionId === currentQ.id || String(d.questionId) === String(currentQ.id))) {
            console.log('[HOST] Attempt count match! Updating to:', d.count);
            setAttemptCount(d.count || 0);
          } else {
            console.log('[HOST] Attempt count ID mismatch - received:', d.questionId, 'current:', currentQ?.id);
          }
        } else if (d.type === 'answer-stats') {
          // Receive answer statistics for current question (ref-backed to avoid stale state)
          const currentQ = questionsRef.current[currentQuestionIndexRef.current];
          console.log('[HOST] Received answer-stats for Q' + d.questionId + ':', d.stats, 'current question ID:', currentQ?.id);
          if (currentQ && (d.questionId === currentQ.id || String(d.questionId) === String(currentQ.id))) {
            console.log('[HOST] Stats match! Updating...', d.stats);
            setAnswerStats(d.stats || { A: 0, B: 0, C: 0, D: 0 });
          } else {
            console.log('[HOST] Stats do NOT match current question, ignoring. Will not update UI.', { currentId: currentQ?.id, receivedId: d.questionId });
          }
        } else if (d.type === 'written-stats') {
          // Host receives ranked written submissions for current question
          const currentQ = questionsRef.current[currentQuestionIndexRef.current];
          console.log('[HOST] Received written-stats for Q' + d.questionId + ':', d);
          if (currentQ && (d.questionId === currentQ.id || String(d.questionId) === String(currentQ.id))) {
            setWrittenRanked(Array.isArray(d.ranked) ? d.ranked : []);
            setWrittenSubmissions(d.submissionsCount || (Array.isArray(d.ranked) ? d.ranked.length : 0));
          }
        } else if (d.type === 'participants-count') {
          // Receive unique participant count
          setParticipantCount(d.participantCount || 0);
        } else if (d.type === 'next-question-ready') {
          // Host has moved to next question, participant should sync and proceed
          console.log('[PARTICIPANT] Received next-question-ready signal', d);

          // If host sent a target index, jump there (per-question effect will handle reset)
          if (typeof d.questionIndex === 'number') {
            const target = Math.max(0, Math.min(d.questionIndex, questionsRef.current.length - 1));
            console.log('[PARTICIPANT] Next question index received:', target, 'out of', questionsRef.current.length, 'total');
            // Always update to ensure participant is in sync with host
            setCurrentQuestionIndex(target);
          }

          // Reset all state for the new question
          setTimeLeft(timePerQuestion);
          setSelectedOption(null);
          setWrittenAnswer('');
          setIsSubmitted(false);
          setSubmissionMessage('');
          setAttemptCount(0);
          setShowAnswerReveal(false);
          setAnswerStats({ A: 0, B: 0, C: 0, D: 0 });
          setRevealedCorrectAnswer(null);
          setCanMoveToNext(false);
          
          // Request initial timer sync from host to get accurate time
          if (d.questionId && ws && ws.readyState === WebSocket.OPEN) {
            console.log('[PARTICIPANT] Requesting initial timer sync for question:', d.questionId);
            ws.send(JSON.stringify({
              type: 'request-timer-sync',
              questionId: d.questionId
            }));
          }
        } else if (d.type === 'timer-sync') {
          // Participant receives timer update from host - sync to host's timer
          console.log('[PARTICIPANT] Received timer-sync:', d);
          
          if (!isHost) {
            if (!currentQuestion) {
              console.warn('[PARTICIPANT] No currentQuestion yet, cannot sync timer');
            } else if (d.questionId === currentQuestion.id || String(d.questionId) === String(currentQuestion.id)) {
              // If this is the first sync or time per question changed, update it FIRST
              if (d.timePerQuestion && timePerQuestion !== d.timePerQuestion) {
                console.log('[PARTICIPANT] Updating time per question to:', d.timePerQuestion);
                setTimePerQuestion(d.timePerQuestion);
                // Save to localStorage for persistence
                localStorage.setItem(`quiz_${quizCode}_timePerQuestion`, String(d.timePerQuestion));
              }
              
              // Always sync timer using server timestamp for accurate synchronization
              // This accounts for network latency and ensures participant timer matches host
              if (d.serverTimestamp) {
                const clientNow = Date.now();
                const networkDelay = clientNow - d.serverTimestamp; // Time elapsed since server sent this message
                const calculatedTimeLeft = Math.max(0, d.timeLeft - (networkDelay / 1000)); // Subtract elapsed time
                
                console.log('[PARTICIPANT] Server sync - server time:', d.timeLeft, 's, network delay:', networkDelay.toFixed(0), 'ms, calculated:', calculatedTimeLeft.toFixed(1), 's');
                
                // Sync to calculated time from server
                setTimeLeft(calculatedTimeLeft);
                clearTimeout(timerRef.current); // Clear local timer to avoid conflicts
              } else {
                // Fallback if serverTimestamp is not available
                const timeDiff = Math.abs(timeLeft - d.timeLeft);
                if (timeDiff > 0.5) {
                  console.log('[PARTICIPANT] Time drift detected:', timeDiff.toFixed(1), 'seconds. Syncing from', timeLeft.toFixed(1), 'to', d.timeLeft, 's');
                  clearTimeout(timerRef.current);
                  setTimeLeft(d.timeLeft);
                }
              }
            } else {
              console.warn('[PARTICIPANT] Question ID mismatch - received:', d.questionId, 'current:', currentQuestion.id);
            }
          }
        } else if (d.type === 'time-up') {
          // Host has signaled that time is up for this question
          console.log('[PARTICIPANT] Received time-up signal for question:', d.questionId);
          if (currentQuestion && (d.questionId === currentQuestion.id || String(d.questionId) === String(currentQuestion.id))) {
            console.log('[PARTICIPANT] Time-up signal matches current question! Stopping timer.');
            
            // Stop the timer immediately
            setTimeLeft(0);
            clearTimeout(timerRef.current);
            
            // Show answer reveal UI
            setShowAnswerReveal(true);
            
            // Mark as expired in localStorage
            const expiredKey = `quiz_${quizCode}_questionExpired_${currentQuestionIndex}`;
            localStorage.setItem(expiredKey, 'true');
            
            // Don't submit yet - wait for answer-revealed message with the correct answer
            console.log('[PARTICIPANT] Waiting for answer-revealed message with correct answer');
          }
        } else if (d.type === 'answer-revealed') {
          // Participant receives the correct answer from host
          console.log('[PARTICIPANT] Received answer-revealed:', d);
          console.log('[PARTICIPANT] Current question ID (from state):', currentQuestion?.id);
          console.log('[PARTICIPANT] Current question ID (from ref):', questionsRef.current[currentQuestionIndexRef.current]?.id);
          console.log('[PARTICIPANT] Revealed questionId:', d.questionId, 'Correct answer:', d.correctAnswer);
          
          // Use ref to get the actual current question (avoids stale closure issue)
          const currentQFromRef = questionsRef.current[currentQuestionIndexRef.current];
          if (currentQFromRef && (d.questionId === currentQFromRef.id || String(d.questionId) === String(currentQFromRef.id))) {
            console.log('[PARTICIPANT] Question ID matches! Setting revealedCorrectAnswer to:', d.correctAnswer);
            
            // Store the revealed answer in state immediately
            setRevealedCorrectAnswer(d.correctAnswer);

            if (currentQFromRef?.type !== 'MCQ') {
              setWrittenAccuracy(null);
              const evaluationBody = {
                question: currentQFromRef?.question || '',
                referenceAnswer: d.correctAnswer || '',
                participantAnswer: writtenAnswer || ''
              };
              fetch(`${config.API_BASE_URL}/ai/evaluate-answer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(evaluationBody)
              })
                .then(res => res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`)))
                .then(data => {
                  if (typeof data?.accuracy === 'number') {
                    setWrittenAccuracy(data.accuracy);
                  } else {
                    setWrittenAccuracy(0);
                  }
                })
                .catch(err => {
                  console.error('[AI-EVAL] Failed to evaluate written answer:', err);
                  setWrittenAccuracy(0);
                });
            }
            
            // Stop the timer immediately
            setTimeLeft(0);
            clearTimeout(timerRef.current);
            
            // Show answer reveal UI
            setShowAnswerReveal(true);
            
            // Mark as expired in localStorage
            const expiredKey = `quiz_${quizCode}_questionExpired_${currentQuestionIndex}`;
            localStorage.setItem(expiredKey, 'true');
            
            // Submit answer if not already submitted
            if (!isSubmitted) {
              setIsSubmitted(true);
              setSubmissionMessage('⏰ Time is up!');
              
              const answerValue =
  currentQuestion.type === 'MCQ'
    ? (
        selectedOption !== null
          ? String(selectedOption) // Use index (0-3) for reliable server matching
          : null
      )
    : writtenAnswer;

              const entry = {
                questionId: currentQuestion.id,
                referenceAnswer: d.correctAnswer,
                answer: answerValue
              };
              const updated = [...myAnswers, entry];
              setMyAnswers(updated);
              
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
            } else {
              // Already submitted, but update the referenceAnswer with correct answer
              console.log('[PARTICIPANT] Already submitted, updating referenceAnswer with revealed correct answer');
              setMyAnswers(prev => {
                const updated = prev.map(ans => {
                  if (ans.questionId === d.questionId || String(ans.questionId) === String(d.questionId)) {
                    // Ensure both referenceAnswer AND answer are set
                    // If answer is still null from live submission, don't update it here
                    // The answer should have been captured in the live submission already
                    return { ...ans, referenceAnswer: d.correctAnswer };
                  }
                  return ans;
                });
                
                console.log('[PARTICIPANT] Updated answers array:', updated);
                
                // Resend updated submission to server so scoring has correct answer
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
                
                return updated;
              });
            }
          
            // Update the questions array with the correct answer
            console.log('[PARTICIPANT] About to update questions array. Current questions:', questions);
            console.log('[PARTICIPANT] Current question index:', currentQuestionIndex);
            console.log('[PARTICIPANT] Current question before update:', currentQuestion);
            
            setQuestions(prev => {
              const updated = prev.map((q, idx) => {
                if (q.id === d.questionId || String(q.id) === String(d.questionId)) {
                  console.log('[PARTICIPANT] Updating question at index', idx, 'with ID', q.id, 'setting correctAnswer to:', d.correctAnswer);
                  const updatedQuestion = { 
                    ...q, 
                    correctAnswer: d.correctAnswer,
                    // Ensure we have the correct answer text for display
                    _correctAnswerText: q.options && q.options[d.correctAnswer] !== undefined 
                      ? q.options[d.correctAnswer] 
                      : d.correctAnswer
                  };
                  console.log('[PARTICIPANT] Updated question object:', JSON.stringify(updatedQuestion));
                  return updatedQuestion;
                }
                return q;
              });
              
              console.log('[PARTICIPANT] Full updated questions array:', updated);
              console.log('[PARTICIPANT] Question at currentQuestionIndex after update:', updated[currentQuestionIndex]);
              console.log('[PARTICIPANT] Has correctAnswer?', updated[currentQuestionIndex]?.correctAnswer);
              
              return updated;
            });
            
            // Force re-render immediately after state update
            setTimeout(() => {
              console.log('[PARTICIPANT] After state update - currentQuestion:', currentQuestion);
              console.log('[PARTICIPANT] currentQuestion.correctAnswer:', currentQuestion?.correctAnswer);
              setQuestionRevision(rev => {
                console.log('[PARTICIPANT] Incrementing questionRevision from', rev, 'to', rev + 1);
                return rev + 1;
              });
            }, 100);
          } else {
            console.log('[PARTICIPANT] Question ID does not match, not updating. Received:', d.questionId, 'Current:', currentQuestion?.id);
          }
        }
      } catch (e) { console.error('WS message error', e); }
    };
    socket.onerror = (e) => console.error('WS error', e);
    socket.onclose = () => console.log('Quiz WS closed');

    return () => {
      try { socket.close(); } catch (e) {}
      if (isHost) localStorage.removeItem('isHost');
    };
  }, [quizCode, isHost, navigate]);

  // Prevent accidental page refresh during quiz
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (!isLastQuestion && timeLeft > 0) {
        e.preventDefault();
        e.returnValue = 'Quiz is in progress. Are you sure you want to leave? Your progress will be saved but the timer will continue.';
        return e.returnValue;
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isLastQuestion, timeLeft]);

  const playerId = localStorage.getItem('userId');
  const playerName = localStorage.getItem('username') || `User-${playerId ? playerId.substring(0,4) : 'G'}`;

  const handleOptionSelect = (index) => {
    if (isSubmitted || showAnswerReveal) return;
    
    setSelectedOption(index);

    // Send live update for MCQ selections to update host counts
    if (currentQuestion && currentQuestion.type === 'MCQ' && ws && ws.readyState === WebSocket.OPEN) {
      // Send both the index (0-3) and the text for maximum compatibility
      const answerValue = String(index); // Send as numeric index for reliable server-side matching
      const entry = {
        questionId: currentQuestion.id,
        referenceAnswer: null,
        answer: answerValue  // Server will handle "0", "1", "2", "3"
      };
      setMyAnswers(prev => {
        const updated = [
          ...prev.filter(a => String(a.questionId) !== String(currentQuestion.id)),
          entry
        ];
        try {
          ws.send(JSON.stringify({
            type: 'submit-answers',
            submission: {
              playerId,
              playerName,
              answers: updated
            }
          }));
        } catch {}
        return updated;
      });
    }
  };

  const handleWrittenAnswerChange = (e) => {
    setWrittenAnswer(e.target.value);
  };

  // Reset per-question participant UI state to avoid stale selections/highlights
  useEffect(() => {
    // Don't reset selectedOption here - we need it for submission when time expires
    // setSelectedOption(null);
    
    console.log('[QUESTION-RESET] Effect triggered for question index:', currentQuestionIndex);
    console.log('[QUESTION-RESET] Current question:', currentQuestion?.id, currentQuestion?.question?.substring(0, 50));
    console.log('[QUESTION-RESET] Resetting timeLeft to:', timePerQuestion);
    
    setTimeLeft(timePerQuestion); // Reset timer for new question
    setWrittenAnswer('');
    setShowAnswerReveal(false);
    setIsSubmitted(false);
    setSubmissionMessage('');
    setRevealedCorrectAnswer(null); // Clear revealed answer for new question
    setWrittenAccuracy(null);
    // Don't reset attemptCount or answerStats here - let server updates handle it
    // Don't reset canMoveToNext here - it will be set by the 'next-question-ready' handler when needed
    // Only reset for the host's initial question load
    if (isHost) {
      setCanMoveToNext(false);
    }

    // If this question was already expired earlier, keep it revealed and at 0s
    const expiredKey = `quiz_${quizCode}_questionExpired_${currentQuestionIndex}`;
    if (localStorage.getItem(expiredKey) === 'true') {
      setTimeLeft(0);
      setShowAnswerReveal(true);
      setIsSubmitted(true);
      // Only let host move immediately; participants wait for host signal
      if (isHost) {
        setCanMoveToNext(true);
      }
    }
  }, [currentQuestionIndex, quizCode, isHost, timePerQuestion]);

  const submitAnswer = (optionIndex = null) => {
    if (!currentQuestion) {
      console.error('Cannot submit: currentQuestion is undefined');
      return;
    }
    
    // Don't allow multiple submissions
    if (isSubmitted) {
      console.log('[PARTICIPANT] Already submitted answer for this question');
      return;
    }
    
    // Use provided optionIndex for MCQ, otherwise use current state
    // For MCQ: send index (0-3) for reliable server-side matching
    const answerValue =
  currentQuestion.type === 'MCQ'
    ? (
        optionIndex !== null
          ? String(optionIndex) // Send index for reliable server matching
          : (selectedOption !== null ? String(selectedOption) : null)
      )
    : writtenAnswer;
        
    // Use revealedCorrectAnswer if available (from host reveal), otherwise use currentQuestion's value
    // This ensures we have the correct answer for scoring, even if revealed after submission
    const correctAnswerForScoring = revealedCorrectAnswer !== null && revealedCorrectAnswer !== undefined
      ? revealedCorrectAnswer
      : (currentQuestion.correctAnswer !== undefined && currentQuestion.correctAnswer !== null
          ? currentQuestion.correctAnswer
          : '');
    
    console.log('[PARTICIPANT] Submitting answer:', answerValue, 'for question:', currentQuestion.id, 'with correct answer:', correctAnswerForScoring);
    
    // Mark as submitted first to prevent duplicate submissions
    setIsSubmitted(true);
    setSubmissionMessage('✓ Answer submitted successfully!');
    
    const entry = {
      questionId: currentQuestion.id,
      referenceAnswer: correctAnswerForScoring,
      answer: answerValue
    };
    const updated = [
      ...myAnswers.filter(a => String(a.questionId) !== String(currentQuestion.id)),
      entry
    ];
    setMyAnswers(updated);

    console.log('[PARTICIPANT] Full submission:', { playerId, playerName, answers: updated });
    console.log('[PARTICIPANT] PlayerName:', playerName, 'PlayerId:', playerId);

    // Send submission to server (whole set for this player)
    if (ws && ws.readyState === WebSocket.OPEN) {
      console.log('[PARTICIPANT] WebSocket OPEN, sending answer submission...');
      console.log('[DEBUG] Sending answer:', answerValue, 'playerName:', playerName, 'playerId:', playerId);
      const msg = {
        type: 'submit-answers',
        submission: {
          playerId,
          playerName,
          answers: updated
        }
      };
      console.log('[PARTICIPANT] Full message:', JSON.stringify(msg));
      ws.send(JSON.stringify(msg));
      console.log('[PARTICIPANT] Answer submission sent successfully');
    } else {
      console.error('[PARTICIPANT] WebSocket not ready. State:', ws?.readyState, 'ws exists:', !!ws);
      setSubmissionMessage('⚠️ Network connection issue - answer may not be synced');
    }
  };

  const handleSubmit = () => {
    submitAnswer();
  };

  const handleCollectScores = () => {
    // Clear quiz progress from localStorage
    localStorage.removeItem(`quiz_${quizCode}_currentQuestion`);
    localStorage.removeItem(`quiz_${quizCode}_questionStartTime`);
    localStorage.removeItem(`quiz_${quizCode}_timePerQuestion`);
    // Clear all question-specific start times
    for (let i = 0; i < questions.length; i++) {
      localStorage.removeItem(`quiz_${quizCode}_questionStartTime_${i}`);
      localStorage.removeItem(`quiz_${quizCode}_questionExpired_${i}`);
    }
    
    console.log('[COLLECT-SCORES] handleCollectScores called, ws ready:', ws?.readyState === WebSocket.OPEN);
    if (ws && ws.readyState === WebSocket.OPEN) {
      console.log('[COLLECT-SCORES] Sending collect-scores message to server');
      ws.send(JSON.stringify({ type: 'collect-scores' }));

      // Fallback: if no leaderboard arrives within 6s, still navigate to results
      if (leaderboardTimeoutRef.current) clearTimeout(leaderboardTimeoutRef.current);
      leaderboardTimeoutRef.current = setTimeout(() => {
        console.warn('No leaderboard received after 6s, navigating with last known data');
        const latest = JSON.parse(localStorage.getItem('latestLeaderboard') || '[]');
        console.log('[COLLECT-SCORES] Fallback leaderboard:', latest);
        localStorage.setItem('latestLeaderboard', JSON.stringify(latest));
        navigate('/leaderboard', { state: { isHost } });
      }, 6000);
    } else {
      alert('Real-time server not connected');
      navigate('/leaderboard', { state: { isHost } });
    }
  };

  const handleNextQuestion = () => {
    console.log('[QUIZ] handleNextQuestion called. isLastQuestion:', isLastQuestion, 'isHost:', isHost);
    if (isLastQuestion) {
      if (isHost) {
        console.log('[QUIZ] Last question reached, host collecting scores');
        handleCollectScores();
      } else {
        console.log('[QUIZ] Last question reached, participant waiting for host to end quiz');
        // Participant waits for leaderboard message from server without auto-navigating
        // The leaderboard message handler will navigate them
        
        // DO NOT auto-navigate after timeout - wait indefinitely for host
        // The host must click "End Quiz & Show Results" to trigger collect-scores
      }
    } else {
      const nextIndex = currentQuestionIndex + 1;
      const nextQuestion = questions[nextIndex];

      if (isHost) {
        // Host notifies all participants about moving to next question
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'host-next-question',
            nextQuestionIndex: nextIndex,
            nextQuestionId: nextQuestion?.id
          }));
        }
      }
      
      // Reset for next question
      setCurrentQuestionIndex(prev => {
        const newIndex = prev + 1;
        
        // Clear the old question's start time
        localStorage.removeItem(`quiz_${quizCode}_questionStartTime_${prev}`);
        localStorage.removeItem(`quiz_${quizCode}_questionStartTime`);
        
        // Request answer stats for the new question if host
        if (isHost && ws && ws.readyState === WebSocket.OPEN && questions[newIndex]) {
          setTimeout(() => {
            ws.send(JSON.stringify({
              type: 'get-answer-stats',
              questionId: questions[newIndex].id
            }));
          }, 100);
        }
        return newIndex;
      });
      setTimeLeft(timePerQuestion);
      setSelectedOption(null);
      setWrittenAnswer('');
      setIsSubmitted(false);
      setSubmissionMessage('');
      setAttemptCount(0);
      setShowAnswerReveal(false);
      setAnswerStats({ A: 0, B: 0, C: 0, D: 0 });
      setCanMoveToNext(false);
    }
  };

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={styles.wrapper}>
      <main style={styles.main}>
      {isLoading && (
        <div style={styles.loadingContainer}>
          <h2 style={{color: 'var(--text)'}}>Loading questions...</h2>
        </div>
      )}
      
      {error && (
        <div style={styles.errorContainer}>
          <h2 style={{color: '#ef4444'}}>Error: {error}</h2>
          <button onClick={() => navigate('/dashboard')} style={styles.primaryBtn}>
            Go Back to Dashboard
          </button>
        </div>
      )}
      
      {!isLoading && !error && questions.length === 0 && (
        <div style={styles.errorContainer}>
          <h2 style={{color: 'var(--text)'}}>No questions found for this quiz</h2>
          <button onClick={() => navigate('/dashboard')} style={styles.primaryBtn}>
            Go Back to Dashboard
          </button>
        </div>
      )}

      {isHost && !isLoading && !error && questions.length > 0 && currentQuestion && (
        <div style={styles.hostContainer}>
          <div style={styles.hostHeader}>
            <h1 style={styles.hostTitle}>Quiz Host Dashboard</h1>
            <div style={styles.quizCodeBadge}>Quiz: {quizCode}</div>
          </div>
          
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Total Questions</div>
              <div style={styles.statValue}>{questions.length}</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Current Question</div>
              <div style={styles.statValue}>{currentQuestionIndex + 1}/{questions.length}</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Time Remaining</div>
              <div style={{...styles.statValue, color: timeLeft <= 10 ? '#ef4444' : 'var(--accent)'}}>
                {formatTime(timeLeft)}
              </div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Connected Participants</div>
              <div style={styles.statValue}>{participantCount}</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Attempted This Question</div>
              <div style={styles.statValue}>{attemptCount}</div>
            </div>
          </div>

          {currentQuestion && (
            <div style={styles.questionContainer}>
              <h2 style={styles.questionTextHost}>{currentQuestion.question}</h2>
              
              {currentQuestion.type === 'MCQ' ? (
                <div style={styles.answerStatsContainer}>
                  <h3 style={styles.statsTitle}>Live Answer Submissions</h3>
                  <div style={styles.optionsGrid}>
                    {currentQuestion.options && currentQuestion.options.map((option, index) => {
                      const optionLetter = String.fromCharCode(65 + index);
                      const count = answerStats[optionLetter] || 0;
                      const isCorrect = index === currentQuestion.correctAnswer;
                      return (
                        <div 
                          key={index}
                          style={{
                            ...styles.statOptionCard,
                            ...(isCorrect && showAnswerReveal ? styles.correctStatCard : {})
                          }}
                        >
                          <div style={styles.optionLetter}>{optionLetter}</div>
                          <div style={styles.optionTextSmall}>{option}</div>
                          <div style={styles.optionCount}>{count}</div>
                          <div style={styles.optionCountLabel}>
                            {count === 1 ? 'participant' : 'participants'}
                          </div>
                          {isCorrect && showAnswerReveal && (
                            <div style={styles.correctBadge}>✓ Correct</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  {showAnswerReveal && revealedCorrectAnswer !== null && revealedCorrectAnswer !== undefined && (
                    <div style={styles.correctAnswerBanner}>
                      <strong>✓ Correct Answer: </strong>
                      {Array.isArray(currentQuestion.options) ? (
                        (() => {
                          // Check if revealedCorrectAnswer is already in the options array (it's the answer text)
                          if (currentQuestion.options.includes(String(revealedCorrectAnswer))) {
                            return String(revealedCorrectAnswer);
                          }
                          // Check if it's a letter (A, B, C, D)
                          const isLetter = typeof revealedCorrectAnswer === 'string' && /^[A-D]$/.test(revealedCorrectAnswer);
                          if (isLetter) {
                            const answerIndex = { A: 0, B: 1, C: 2, D: 3 }[revealedCorrectAnswer];
                            return currentQuestion.options[answerIndex] ?? `Option ${answerIndex}`;
                          }
                          // Try as numeric index
                          const answerIndex = Number(revealedCorrectAnswer);
                          return isNaN(answerIndex) ? String(revealedCorrectAnswer) : (currentQuestion.options[answerIndex] ?? `Option ${answerIndex}`);
                        })()
                      ) : String(revealedCorrectAnswer)}
                    </div>
                  )}
                </div>
              ) : (
                <div style={styles.answerStatsContainer}>
                  <h3 style={styles.statsTitle}>Written Submissions</h3>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '1rem'
                  }}>
                    <div style={{
                      padding: '0.75rem 1rem',
                      backgroundColor: 'rgba(59,130,246,0.08)',
                      border: '2px solid #3b82f6',
                      borderRadius: '10px',
                      fontWeight: 600,
                      color: 'var(--text)'
                    }}>
                      Submissions: {writtenSubmissions}
                    </div>
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '1rem'
                  }}>
                    {writtenRanked.map((row, idx) => (
                      <div key={idx} style={{
                        padding: '1rem',
                        backgroundColor: 'var(--card-bg)',
                        border: '2px solid var(--border-color)',
                        borderRadius: '12px'
                      }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: '0.5rem'
                        }}>
                          <span style={{ fontWeight: 700 }}>{row.playerName}</span>
                          <span style={{ color: '#3b82f6', fontWeight: 700 }}>
                            {typeof row.accuracy === 'number' ? `${row.accuracy}%` : '—'}
                          </span>
                        </div>
                        <div style={{ color: 'var(--muted)' }}>
                          Time: {typeof row.timeTakenMs === 'number' ? `${Math.round(row.timeTakenMs/100)/10}s` : '—'}
                        </div>
                      </div>
                    ))}
                    {writtenRanked.length === 0 && (
                      <div style={{
                        padding: '1rem',
                        backgroundColor: 'rgba(96,125,139,0.08)',
                        border: '2px solid #607d8b',
                        borderRadius: '12px',
                        textAlign: 'center',
                        color: 'var(--muted)'
                      }}>
                        No submissions yet
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div style={styles.hostActions}>
            {showAnswerReveal && (
              <button 
                onClick={handleNextQuestion}
                style={styles.nextBtnHost}
              >
                {isLastQuestion ? 'End Quiz & Show Results' : 'Next Question →'}
              </button>
            )}
            <button 
              onClick={() => navigate('/waiting-room')}
              style={styles.backBtn}
            >
              ← Back to Waiting Room
            </button>
          </div>
        </div>
      )}
      
      {!isHost && !isLoading && !error && questions.length > 0 && currentQuestion && (
        <div style={styles.participantContainer}>
          <div style={styles.header}>
            <div style={styles.questionCounter}>
              Question {currentQuestionIndex + 1} of {questions.length}
            </div>
            <div style={styles.timer}>
              ⏱️ {formatTime(timeLeft)}
            </div>
          </div>

          <div style={styles.questionCard}>
        <h2 style={styles.questionText}>{currentQuestion.question}</h2>
        
        {submissionMessage && (
          <div style={{
            padding: '1rem',
            marginBottom: '1.5rem',
            backgroundColor: 'rgba(16,185,129,0.1)',
            border: '2px solid #10b981',
            borderRadius: '8px',
            color: '#10b981',
            fontWeight: '600',
            textAlign: 'center',
            fontSize: '1.1rem'
          }}>
            {submissionMessage}
          </div>
        )}
        
        {currentQuestion.type === 'MCQ' ? (
          <div style={styles.optionsContainer}>
            {currentQuestion.options.map((option, index) => (
              <div 
                key={index}
                style={{
                  ...styles.option,
                  outline: 'none',
                  ...(selectedOption === index && !showAnswerReveal && styles.selectedOption),
                  ...(showAnswerReveal && selectedOption === index && selectedOption !== currentQuestion.correctAnswer && styles.wrongOption),
                  ...(showAnswerReveal && selectedOption === index && selectedOption === currentQuestion.correctAnswer && styles.correctOption)
                }}
                onClick={() => !showAnswerReveal && handleOptionSelect(index)}
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
              disabled={showAnswerReveal}
              rows={6}
            />
          </div>
        )}

        {showAnswerReveal && (
          currentQuestion.type === 'MCQ' ? (
            <div style={styles.answerReview}>
              <div style={styles.yourAnswerBox}>
                <strong>Your Answer:</strong>
                {selectedOption !== null ? (
                  (() => {
                    // Check if participant's answer matches the correct answer
                    let isCorrect = false;
                    if (revealedCorrectAnswer !== null && revealedCorrectAnswer !== undefined) {
                      const selectedText = String(currentQuestion.options[selectedOption] || '').trim();
                      const selectedLetter = String.fromCharCode(65 + selectedOption);
                      const correctAnswerStr = String(revealedCorrectAnswer || '').trim();
                      
                      // Check all possible formats of the correct answer
                      isCorrect = 
                        selectedOption === revealedCorrectAnswer || // numeric index
                        selectedLetter === revealedCorrectAnswer || // letter (A, B, C, D)
                        selectedText === correctAnswerStr || // actual text (trimmed and stringified)
                        String(selectedOption) === String(revealedCorrectAnswer); // string numeric
                      
                      console.log('[ANSWER-CHECK] Selected:', { selectedText, selectedLetter, selectedOption }, 'Correct:', correctAnswerStr, 'isCorrect:', isCorrect);
                    }
                    
                    return (
                      <p style={{ 
                        color: isCorrect ? '#10b981' : '#ef4444',
                        fontWeight: 'bold'
                      }}>
                        {isCorrect ? '✓ ' : '✗ '}
                        {currentQuestion.options[selectedOption]}
                      </p>
                    );
                  })()
                ) : (
                  <p style={{ color: '#ef4444', fontWeight: 'bold' }}>❌ Not Answered</p>
                )}
              </div>
              <div style={styles.correctAnswerBox}>
                <strong>✓ Correct Answer:</strong>
                {revealedCorrectAnswer !== null && revealedCorrectAnswer !== undefined ? (
                  <p style={{ color: '#10b981', fontWeight: 'bold' }}>
                    {Array.isArray(currentQuestion.options) ? (
                      (() => {
                        const revealedStr = String(revealedCorrectAnswer);
                        console.log('[DISPLAY] Revealed answer:', revealedStr, 'Type:', typeof revealedCorrectAnswer, 'Options:', currentQuestion.options);
                        
                        // Check if revealedCorrectAnswer is already in the options array (it's the answer text)
                        // Try exact match first
                        if (currentQuestion.options.includes(revealedStr)) {
                          console.log('[DISPLAY] Found exact match in options, returning:', revealedStr);
                          return revealedStr;
                        }
                        
                        // Try trimmed match
                        const revealedTrimmed = revealedStr.trim();
                        const trimmedMatch = currentQuestion.options.find(opt => String(opt).trim() === revealedTrimmed);
                        if (trimmedMatch) {
                          console.log('[DISPLAY] Found trimmed match in options:', trimmedMatch);
                          return trimmedMatch;
                        }
                        
                        // Check if it's a letter (A, B, C, D)
                        const isLetter = typeof revealedCorrectAnswer === 'string' && /^[A-D]$/.test(revealedCorrectAnswer);
                        if (isLetter) {
                          const answerIndex = { A: 0, B: 1, C: 2, D: 3 }[revealedCorrectAnswer];
                          console.log('[DISPLAY] Is letter:', revealedCorrectAnswer, 'index:', answerIndex, 'option:', currentQuestion.options[answerIndex]);
                          return currentQuestion.options[answerIndex] ?? `Option ${answerIndex}`;
                        }
                        // Try as numeric index
                        const answerIndex = Number(revealedCorrectAnswer);
                        console.log('[DISPLAY] As numeric:', answerIndex, 'isNaN:', isNaN(answerIndex), 'option:', currentQuestion.options[answerIndex]);
                        return isNaN(answerIndex) ? revealedStr : (currentQuestion.options[answerIndex] ?? `Option ${answerIndex}`);
                      })()
                    ) : (
                      (() => {
                        console.log('[DISPLAY] No options array, returning raw:', String(revealedCorrectAnswer));
                        return String(revealedCorrectAnswer);
                      })()
                    )}
                  </p>
                ) : (
                  <p style={{ color: '#f59e0b', fontStyle: 'italic' }}>Waiting for correct answer...</p>
                )}
              </div>
              <div style={styles.attemptsBox}>
                <strong>Participants Attempted: </strong>
                <span>{attemptCount}</span>
              </div>
            </div>
          ) : (
            <div style={styles.answerReview}>
              {/* Written type: show only Accuracy box */}
              <div style={styles.accuracyBox}>
                <strong>Accuracy:</strong>
                <p style={{ color: '#3b82f6', fontWeight: '700' }}>
                  {(() => {
                    if (writtenAccuracy === null) {
                      return 'Awaiting scoring...';
                    }
                    return `${writtenAccuracy}%`;
                  })()}
                </p>
              </div>
            </div>
          )
        )}

        <div style={styles.footer}>
          <div style={styles.points}>
            Points: {currentQuestion.points}
          </div>
          
          {(!showAnswerReveal && !canMoveToNext) ? (
            <button 
              onClick={handleSubmit}
              style={styles.submitBtn}
              disabled={currentQuestion.type === 'MCQ' ? selectedOption === null : writtenAnswer.trim() === ''}
            >
              Submit
            </button>
          ) : (
            <>
              {isHost ? (
                <button 
                  onClick={handleNextQuestion}
                  style={styles.nextBtn}
                >
                  {isLastQuestion ? 'End Quiz & Show Results' : 'Next Question'}
                </button>
              ) : (
                <>
                  {/* Participants automatically advance when host clicks Next - no button needed */}
                  <div style={{
                    padding: '0.75rem 2rem',
                    backgroundColor: 'var(--muted)',
                    color: 'var(--button-text)',
                    borderRadius: '8px',
                    textAlign: 'center',
                    fontSize: '0.95rem'
                  }}>
                    ⏳ Waiting for host to move to next question...
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
        </div>
      )}
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
  loadingContainer: {
    maxWidth: '600px',
    margin: '4rem auto',
    textAlign: 'center',
    padding: '3rem',
    backgroundColor: 'var(--card-bg)',
    borderRadius: '16px',
    boxShadow: 'var(--shadow)',
  },
  errorContainer: {
    maxWidth: '600px',
    margin: '4rem auto',
    textAlign: 'center',
    padding: '3rem',
    backgroundColor: 'var(--card-bg)',
    borderRadius: '16px',
    boxShadow: 'var(--shadow)',
  },
  hostContainer: {
    marginTop: '1rem',
    maxWidth: '100%',
    padding: '0 1rem',
  },
  hostHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  hostTitle: {
    fontSize: '2rem',
    fontWeight: '700',
    background: 'linear-gradient(90deg, var(--accent), #7c3aed)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  quizCodeBadge: {
    padding: '0.75rem 1.5rem',
    background: 'linear-gradient(90deg, var(--accent), #7c3aed)',
    color: 'white',
    borderRadius: '12px',
    fontWeight: '600',
    fontSize: '1.1rem',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem',
  },
  statCard: {
    backgroundColor: 'var(--card-bg)',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: 'var(--shadow)',
    textAlign: 'center',
  },
  statLabel: {
    fontSize: '0.9rem',
    color: 'var(--muted)',
    marginBottom: '0.5rem',
  },
  statValue: {
    fontSize: '2rem',
    fontWeight: '700',
    color: 'var(--accent)',
  },
  questionContainer: {
    backgroundColor: 'var(--card-bg)',
    padding: '2rem',
    borderRadius: '16px',
    boxShadow: 'var(--shadow)',
    marginBottom: '2rem',
  },
  questionTextHost: {
    fontSize: '1.75rem',
    fontWeight: '600',
    color: 'var(--text)',
    marginBottom: '2rem',
    textAlign: 'center',
    width: '100%',
  },
  answerStatsContainer: {
    marginTop: '2rem',
  },
  statsTitle: {
    fontSize: '1.25rem',
    color: 'var(--accent)',
    marginBottom: '1.5rem',
    textAlign: 'center',
  },
  optionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  statOptionCard: {
    padding: '1.5rem',
    backgroundColor: 'rgba(124,58,237,0.05)',
    border: '2px solid var(--border-color)',
    borderRadius: '12px',
    textAlign: 'center',
    transition: 'all 0.3s ease',
  },
  correctStatCard: {
    border: '3px solid #10b981',
    backgroundColor: 'rgba(16,185,129,0.1)',
  },
  optionLetter: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: 'var(--accent)',
    marginBottom: '0.5rem',
  },
  optionTextSmall: {
    fontSize: '0.95rem',
    marginBottom: '1rem',
    color: 'var(--text)',
    minHeight: '40px',
  },
  optionCount: {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    color: 'var(--accent)',
    marginBottom: '0.25rem',
  },
  optionCountLabel: {
    fontSize: '0.85rem',
    color: 'var(--muted)',
  },
  correctBadge: {
    marginTop: '0.75rem',
    padding: '0.5rem',
    backgroundColor: '#10b981',
    color: 'white',
    borderRadius: '8px',
    fontSize: '0.85rem',
    fontWeight: '600',
  },
  correctAnswerBanner: {
    padding: '1.25rem',
    backgroundColor: 'rgba(16,185,129,0.1)',
    border: '2px solid #10b981',
    borderRadius: '12px',
    color: '#10b981',
    fontSize: '1.1rem',
    textAlign: 'center',
  },
  hostActions: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  nextBtnHost: {
    flex: 1,
    minWidth: '200px',
    padding: '1rem 2rem',
    background: 'linear-gradient(90deg, #10b981, #059669)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '1.1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'transform 0.2s',
  },
  backBtn: {
    flex: 1,
    minWidth: '200px',
    padding: '1rem 2rem',
    backgroundColor: 'var(--card-bg)',
    color: 'var(--text)',
    border: '2px solid var(--border-color)',
    borderRadius: '12px',
    fontSize: '1.1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  participantContainer: {
    marginTop: '1rem',
    maxWidth: '100%',
    padding: '0 1rem',
  },
  container: {
    maxWidth: '800px',
    margin: '2rem auto',
    padding: '0 1rem',
    width: '100%',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  questionCounter: {
    fontSize: '1.1rem',
    color: 'var(--muted)',
    fontWeight: '600',
    padding: '0.75rem 1.5rem',
    backgroundColor: 'var(--card-bg)',
    borderRadius: '12px',
  },
  timer: {
    background: 'linear-gradient(90deg, var(--accent), #7c3aed)',
    color: 'white',
    padding: '0.75rem 1.5rem',
    borderRadius: '12px',
    fontWeight: '700',
    fontSize: '1.1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  questionCard: {
    backgroundColor: 'var(--card-bg)',
    borderRadius: '16px',
    padding: '2.5rem',
    boxShadow: 'var(--shadow)',
  },
  questionText: {
    fontSize: '1.5rem',
    marginBottom: '2rem',
    color: 'var(--text)',
    lineHeight: '1.4',
    fontWeight: '600',
    textAlign: 'center',
  },
  optionsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    marginBottom: '2rem',
  },
  option: {
    padding: '1.25rem 1.5rem',
    border: '2px solid #bfdbfe',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    backgroundColor: '#f8fafc',
    fontSize: '1.05rem',
    color: '#374151',
    outline: 'none',
    boxSizing: 'border-box',
  },
  selectedOption: {
    borderColor: '#4f46e5',
    borderWidth: '2px',
    borderStyle: 'solid',
    backgroundColor: 'rgba(124,58,237,0.1)',
    transform: 'scale(1.02)',
  },
  correctOption: {
    borderColor: '#10b981',
    borderWidth: '2px',
    backgroundColor: 'rgba(16,185,129,0.1)',
  },
  wrongOption: {
    borderColor: '#ef4444',
    borderWidth: '2px',
    backgroundColor: 'rgba(239,68,68,0.05)',
  },
  writtenContainer: {
    marginBottom: '2rem',
  },
  textarea: {
    width: '100%',
    padding: '1rem',
    borderRadius: '12px',
    border: '2px solid var(--border-color)',
    fontSize: '1rem',
    fontFamily: 'inherit',
    resize: 'vertical',
    minHeight: '150px',
    backgroundColor: 'var(--bg)',
    color: 'var(--text)',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '1.5rem',
    borderTop: '2px solid var(--border-color)',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  points: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: 'var(--accent)',
  },
  submitBtn: {
    background: 'linear-gradient(90deg, var(--accent), #7c3aed)',
    color: 'white',
    border: 'none',
    padding: '0.75rem 2rem',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '600',
    transition: 'all 0.2s',
  },
  nextBtn: {
    background: 'linear-gradient(90deg, #10b981, #059669)',
    color: 'white',
    border: 'none',
    padding: '0.75rem 2rem',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '600',
    transition: 'all 0.2s',
  },
  answerReview: {
    marginTop: '2rem',
    paddingTop: '1.5rem',
    borderTop: '2px solid var(--border-color)',
    display: 'flex',
    gap: '1.5rem',
    flexWrap: 'wrap',
  },
  yourAnswerBox: {
    flex: 1,
    minWidth: '200px',
    padding: '1.25rem',
    backgroundColor: 'rgba(96,125,139,0.1)',
    borderRadius: '12px',
    border: '2px solid #607d8b',
  },
  correctAnswerBox: {
    flex: 1,
    minWidth: '200px',
    padding: '1.25rem',
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderRadius: '12px',
    border: '2px solid #10b981',
  },
  attemptsBox: {
    flex: 1,
    minWidth: '200px',
    padding: '1.25rem',
    backgroundColor: 'rgba(124,58,237,0.1)',
    borderRadius: '12px',
    border: '2px solid var(--accent)',
  },
  accuracyBox: {
    flex: 1,
    minWidth: '200px',
    padding: '1.25rem',
    backgroundColor: 'rgba(59,130,246,0.1)',
    borderRadius: '12px',
    border: '2px solid #3b82f6',
  },
  primaryBtn: {
    background: 'linear-gradient(90deg, var(--accent), #7c3aed)',
    color: 'white',
    border: 'none',
    padding: '0.75rem 2rem',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '600',
    transition: 'all 0.2s',
  },
};

export default QuizScreen;
