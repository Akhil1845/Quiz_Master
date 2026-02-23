const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Store active rooms and their participants
  const rooms = new Map(); // quizCode -> { host: WebSocket, hostData: {}, participants: Map<userId, {ws: WebSocket, username: string}>, submissions: Map<userId, submission>, questionAttempts: Map<questionId, count>, answerStats: Map<questionId, {A: count, B: count, C: count, D: count}>, maxParticipants: number }

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../frontend/smart_minds/build')));

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  console.log('New WebSocket connection');
  
  // Parse URL parameters
  const url = new URL(req.url, `http://${req.headers.host}`);
  const quizCode = url.searchParams.get('quizCode');
  const userId = url.searchParams.get('userId');
  const username = url.searchParams.get('username');
  const isHost = url.searchParams.get('isHost') === 'true';

  if (!quizCode || !userId) {
    console.error('Missing quizCode or userId');
    ws.close();
    return;
  }

  // Initialize room if it doesn't exist
  if (!rooms.has(quizCode)) {
    rooms.set(quizCode, {
      host: null,
      hostData: null,
      participants: new Map(),
      submissions: new Map(),
      questionAttempts: new Map(),
      answerStats: new Map(),
      questionStartTimes: new Map(), // per-question start timestamps
      writtenStats: new Map(), // questionId -> Map<userId, { playerId, playerName, timeTakenMs, accuracy }>
      maxParticipants: 50, // Default max participants
      lastLeaderboard: null // Store last leaderboard for retry requests
    });
  }

  const room = rooms.get(quizCode);

  if (isHost) {
    // Handle host connection
    if (room.host) {
      console.log('Host already connected, closing duplicate');
      ws.close();
      return;
    }
    
    room.host = ws;
    console.log(`Host connected to room ${quizCode}`);
    
    // Send current participants to host
    if (room.participants.size > 0) {
      const participants = Array.from(room.participants.values()).map(p => ({
        userId: p.userId,
        username: p.username
      }));
      ws.send(JSON.stringify({
        type: 'participants-update',
        participants
      }));
    }
  } else {
    // Handle participant connection
    // Check if quiz is full (only if not already connected)
    if (!room.participants.has(userId) && room.participants.size >= room.maxParticipants) {
      console.log(`Quiz ${quizCode} is full. Rejecting participant ${userId}`);
      ws.send(JSON.stringify({
        type: 'quiz-full',
        message: `This quiz is full. Maximum ${room.maxParticipants} participants allowed.`
      }));
      ws.close();
      return;
    }
    
    if (room.participants.has(userId)) {
      console.log(`User ${userId} already connected, updating connection`);
      // Close previous connection if it exists
      const existingWs = room.participants.get(userId).ws;
      if (existingWs && existingWs.readyState === WebSocket.OPEN) {
        existingWs.close();
      }
    }
    
    // Add participant to room
    room.participants.set(userId, { ws, userId, username });
    console.log(`Participant ${username || userId} joined room ${quizCode}`);
    
    // Notify host about new participant
    if (room.host && room.host.readyState === WebSocket.OPEN) {
      room.host.send(JSON.stringify({
        type: 'participant-joined',
        userId,
        username: username || `User-${userId.substring(0, 4)}`,
        timestamp: new Date().toISOString()
      }));
    }
    
    // Send welcome message to participant
    ws.send(JSON.stringify({
      type: 'welcome',
      quizCode,
      message: 'Connected to quiz room',
      isHost: false
    }));
    
    // Send stored quiz-info to the new participant if available
    if (room.hostData) {
      ws.send(JSON.stringify({
        type: 'quiz-info',
        quiz: room.hostData
      }));
    }

    // Broadcast updated participant list to all participants so everyone sees the correct count
    const participantList = Array.from(room.participants.values()).map(p => ({
      userId: p.userId,
      username: p.username,
      joinedAt: new Date().toISOString()
    }));

    // Send participant count update to host
    if (room.host && room.host.readyState === WebSocket.OPEN) {
      room.host.send(JSON.stringify({
        type: 'participants-count',
        participantCount: room.participants.size
      }));
      // Also send the updated participant list to host
      room.host.send(JSON.stringify({
        type: 'participants-update',
        participants: participantList
      }));
    }

    // Send to all participants
    room.participants.forEach(participant => {
      if (participant.ws && participant.ws.readyState === WebSocket.OPEN) {
        participant.ws.send(JSON.stringify({
          type: 'participants-update',
          participants: participantList
        }));
      }
    });
  }

  // Handle messages from client
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received message:', data);
      
      switch (data.type) {
        case 'quiz-info':
          // Store quiz info from host and broadcast to all participants
          if (isHost) {
            room.hostData = data.quiz;
            // Update max participants from quiz config
            if (data.quiz && data.quiz.maxParticipants) {
              room.maxParticipants = data.quiz.maxParticipants;
              console.log(`Max participants set to: ${room.maxParticipants}`);
            }
            console.log('Host sent quiz info:', data.quiz);
            
            // Call backend to mark quiz as started
            if (data.quiz && data.quiz.quizCode) {
              const startUrl = `${process.env.BACKEND_URL || 'http://localhost:8086'}/api/quizzes/${data.quiz.quizCode}/start`;
              console.log(`[QUIZ-START] Calling: ${startUrl}`);
              putJson(startUrl)
                .then(result => {
                  console.log('[QUIZ-START] Quiz marked as started:', result);
                })
                .catch(err => {
                  console.error('[QUIZ-START] Error:', err.message);
                });
            }
            
            // Broadcast to all participants
            Array.from(room.participants.values()).forEach(participant => {
              if (participant.ws.readyState === WebSocket.OPEN) {
                participant.ws.send(JSON.stringify({
                  type: 'quiz-info',
                  quiz: data.quiz
                }));
              }
            });
          }
          break;

        case 'start-quiz':
          // Notify all participants that quiz is starting
          const participants = Array.from(room.participants.values());
          participants.forEach(participant => {
            if (participant.ws.readyState === WebSocket.OPEN) {
              participant.ws.send(JSON.stringify({
                type: 'quiz-starting',
                quizData: data.quizData
              }));
            }
          });
          break;

        case 'get-attempt-count':
          // Client requests unique participant count for a specific question
          const questionId = data.questionId;
          const questionKey = String(questionId);
          const participantSet = room.questionAttempts.get(questionKey);
          const attemptCount = participantSet ? participantSet.size : 0;
          ws.send(JSON.stringify({
            type: 'question-attempt-count',
            questionId: questionId,
            count: attemptCount
          }));
          break;

        case 'get-answer-stats':
          // Host requests answer statistics for a specific question
          if (!isHost) break;
          const statsQuestionId = data.questionId;
          const statsKey = String(statsQuestionId);
          // Track which question the host is currently viewing
          room.currentQuestion = statsKey;
          console.log(`[GET-STATS] Host requesting stats for Q${statsQuestionId}, Setting currentQuestion to: ${statsKey}`);
          console.log(`[GET-STATS] Available questions:`, Array.from(room.answerStats.keys()));
          const rawStats = room.answerStats.get(statsKey) || { A: 0, B: 0, C: 0, D: 0 };
          const currentStats = { A: rawStats.A || 0, B: rawStats.B || 0, C: rawStats.C || 0, D: rawStats.D || 0 };
          console.log(`[GET-STATS] Sending stats for Q${statsQuestionId}:`, currentStats);
          ws.send(JSON.stringify({
            type: 'answer-stats',
            questionId: statsQuestionId,
            stats: currentStats
          }));
          break;

        case 'get-written-stats':
          // Host requests written-answer stats for a specific question
          if (!isHost) break;
          const wqId = String(data.questionId);
          const writtenMap = room.writtenStats.get(wqId);
          const ranked = rankWrittenMap(writtenMap);
          ws.send(JSON.stringify({
            type: 'written-stats',
            questionId: wqId,
            submissionsCount: ranked.length,
            ranked
          }));
          break;

          case 'submit-answers':
            // Participant submits their answers (could be partial or full)
            // Expect data.submission = { playerId, playerName, answers: [ { questionId, referenceAnswer, answer }, ... ] }
            if (!data.submission) {
              console.warn('[SUBMIT-ANSWERS] No submission data received');
              break;
            }
            console.log(`[SUBMIT-ANSWERS] Received submission from ${data.submission.playerName} (userId: ${userId}):`, JSON.stringify(data.submission, null, 2));
            const roomSubmissions = room.submissions;
            // Ensure submission has playerId and playerName
            const enhancedSubmission = {
              ...data.submission,
              playerId: data.submission.playerId || userId,
              playerName: data.submission.playerName || username || `User-${userId.substring(0, 4)}`
            };
            roomSubmissions.set(userId, enhancedSubmission);
            console.log(`[SUBMIT-ANSWERS] Stored submission. Total submissions now: ${roomSubmissions.size}`);

            // Track unique participants per question and answer statistics
            if (data.submission.answers && Array.isArray(data.submission.answers)) {
              data.submission.answers.forEach(answer => {
                const qId = answer.questionId;
                const qKey = String(qId);
                // If participant submission lacks a reference answer, fill it from host quiz data
                if (room.hostData && Array.isArray(room.hostData.questions)) {
                  const hostQuestion = room.hostData.questions.find(hq => {
                    const hostId = hq.id !== undefined && hq.id !== null ? String(hq.id) : undefined;
                    return hostId === qKey;
                  });
                  if ((answer.referenceAnswer === undefined || answer.referenceAnswer === null || answer.referenceAnswer === '') && hostQuestion && hostQuestion.correctAnswer !== undefined && hostQuestion.correctAnswer !== null) {
                    console.log(`[SUBMIT-ANSWERS] Filling reference answer for Q${qId} from host data. Was: "${answer.referenceAnswer}", Now: "${hostQuestion.correctAnswer}"`);
                    answer.referenceAnswer = hostQuestion.correctAnswer;
                  } else if (!hostQuestion) {
                    console.warn(`[SUBMIT-ANSWERS] Host question not found for Q${qId}. Keys in hostQuestions:`, room.hostData.questions.map(q => String(q.id)));
                  } else if (answer.referenceAnswer) {
                    console.log(`[SUBMIT-ANSWERS] Q${qId} already has referenceAnswer: "${answer.referenceAnswer}"`);
                  }
                }
                
                // Track unique participants per question (not total attempts)
                if (!room.questionAttempts.has(qKey)) {
                  room.questionAttempts.set(qKey, new Set());
                }
                room.questionAttempts.get(qKey).add(userId);

                // Track answer statistics (A, B, C, D) - only count unique participants
                const answerValue = answer.answer; // Can be '0'..'3', 'A'..'D', or option text
                console.log(`[ANSWER STATS] Question ${qId}, User ${userId}, Answer: "${answerValue}", ReferenceAnswer: "${answer.referenceAnswer}", Type: ${typeof answerValue}`);

                if (answerValue !== null && answerValue !== undefined && answerValue !== 'null') {
                  if (!room.answerStats.has(qKey)) {
                    room.answerStats.set(qKey, { A: 0, B: 0, C: 0, D: 0, participantAnswers: new Map() });
                  }
                  const stats = room.answerStats.get(qKey);

                  // Normalize to letter and index
                  const letters = ['A', 'B', 'C', 'D'];
                  
                  // Try to find the index of the answer option
                  let normalizedLetter = null;
                  let letterIndex = -1;
                  
                  // Check if it's already a letter (A-D)
                  if (typeof answerValue === 'string' && answerValue.length === 1 && /[A-D]/i.test(answerValue)) {
                    normalizedLetter = answerValue.toUpperCase();
                    letterIndex = letters.indexOf(normalizedLetter);
                    console.log(`[ANSWER STATS] Detected letter format: ${normalizedLetter} (index: ${letterIndex})`);
                  }
                  // Check if it's a number (0-3)
                  else if (typeof answerValue === 'string' && /^[0-3]$/.test(answerValue)) {
                    letterIndex = parseInt(answerValue);
                    normalizedLetter = letters[letterIndex];
                    console.log(`[ANSWER STATS] Detected number format: ${answerValue} -> ${normalizedLetter}`);
                  }
                  // Otherwise it's the option text - try to find which option it is from host data
                  else {
                    const answerTrimmed = String(answerValue).trim().toLowerCase();
                    
                    if (room.hostData && Array.isArray(room.hostData.questions)) {
                      const hostQuestion = room.hostData.questions.find(hq => String(hq.id) === qKey);
                      if (hostQuestion && Array.isArray(hostQuestion.options)) {
                        console.log(`[ANSWER STATS] Searching for "${answerTrimmed}" in options:`, hostQuestion.options);
                        // Try exact match first
                        letterIndex = hostQuestion.options.findIndex(opt => String(opt).trim().toLowerCase() === answerTrimmed);
                        if (letterIndex >= 0) {
                          normalizedLetter = letters[letterIndex];
                          console.log(`[ANSWER STATS] Found exact match at index ${letterIndex}: ${normalizedLetter}`);
                        } else {
                          // Try partial match (contains)
                          letterIndex = hostQuestion.options.findIndex(opt => String(opt).trim().toLowerCase().includes(answerTrimmed) || answerTrimmed.includes(String(opt).trim().toLowerCase()));
                          if (letterIndex >= 0) {
                            normalizedLetter = letters[letterIndex];
                            console.log(`[ANSWER STATS] Found partial match at index ${letterIndex}: ${normalizedLetter}`);
                          } else {
                            console.warn(`[ANSWER STATS] No match found for "${answerTrimmed}" in options:`, hostQuestion.options.map(o => String(o).trim()));
                          }
                        }
                      } else {
                        console.warn(`[ANSWER STATS] Host question not found or no options array for Q${qId}. Host questions:`, room.hostData.questions ? room.hostData.questions.map(q => ({ id: q.id, options: q.options })) : 'none');
                      }
                    } else {
                      console.warn(`[ANSWER STATS] Host data not yet available for Q${qId}. Will retry when host data is received.`);
                    }
                  }
                  
                  console.log(`[ANSWER STATS] Normalized answer: ${normalizedLetter}, index: ${letterIndex}, original: "${answerValue}"`);

                  // Check if this participant already answered this question
                  const previousAnswer = stats.participantAnswers.get(userId);
                  if (previousAnswer !== undefined) {
                    const prevLetter = (typeof previousAnswer === 'string' && /[A-D]/i.test(previousAnswer))
                      ? previousAnswer.toUpperCase()
                      : letters[parseInt(previousAnswer)];
                    if (prevLetter && stats[prevLetter] > 0) {
                      stats[prevLetter]--;
                    }
                  }

                  // Add current answer
                  if (letterIndex >= 0 && letterIndex <= 3) {
                    stats[letters[letterIndex]]++;
                    stats.participantAnswers.set(userId, normalizedLetter);
                    console.log(`[ANSWER STATS] Updated stats for Q${qId}:`, { A: stats.A, B: stats.B, C: stats.C, D: stats.D });
                  } else {
                    console.log(`[ANSWER STATS] Invalid answerValue ${answerValue}, skipping stats update`);
                  }
                } else {
                  console.log(`[ANSWER STATS] Skipping null/undefined answer for Q${qId}`);
                }

                // Written-answer stats: compute accuracy and time taken
                if (room.hostData && Array.isArray(room.hostData.questions)) {
                  const hostQuestion = room.hostData.questions.find(hq => String(hq.id) === qKey);
                  console.log(`[WRITTEN-CHECK] Q${qId}: hostQuestion found:`, !!hostQuestion, 'type:', hostQuestion?.type);
                  const isWritten = hostQuestion ? (hostQuestion.type !== 'MCQ' && hostQuestion.type !== undefined) : false;
                  console.log(`[WRITTEN-CHECK] Is written? ${isWritten}, question type: ${hostQuestion?.type}`);
                  if (isWritten) {
                    const startTime = room.questionStartTimes.get(qKey);
                    const timeTakenMs = startTime ? (Date.now() - startTime) : null;
                    const evaluationUrl = `${process.env.BACKEND_URL || 'http://localhost:8086'}/api/ai/evaluate-answer`;
                    const payload = {
                      question: hostQuestion?.question || '',
                      referenceAnswer: answer.referenceAnswer || '',
                      participantAnswer: answer.answer || ''
                    };

                    if (!room.writtenStats.has(qKey)) {
                      room.writtenStats.set(qKey, new Map());
                    }
                    // Record submission immediately so host sees it even if scoring is slow/failed.
                    room.writtenStats.get(qKey).set(userId, {
                      playerId: data.submission.playerId || userId,
                      playerName: data.submission.playerName || username,
                      timeTakenMs,
                      accuracy: null
                    });

                    if (room.host && room.host.readyState === WebSocket.OPEN) {
                      const ranked = rankWrittenMap(room.writtenStats.get(qKey));
                      room.host.send(JSON.stringify({
                        type: 'written-stats',
                        questionId: qKey,
                        submissionsCount: ranked.length,
                        ranked
                      }));
                    }

                    postJson(evaluationUrl, payload)
                      .then(result => {
                        const accuracy = typeof result?.accuracy === 'number' ? result.accuracy : 0;
                        room.writtenStats.get(qKey).set(userId, {
                          playerId: data.submission.playerId || userId,
                          playerName: data.submission.playerName || username,
                          timeTakenMs,
                          accuracy
                        });
                        console.log(`[WRITTEN] Recorded stats for Q${qId} user ${userId}: time=${timeTakenMs}ms accuracy=${accuracy}%`);

                        if (room.host && room.host.readyState === WebSocket.OPEN) {
                          const ranked = rankWrittenMap(room.writtenStats.get(qKey));
                          room.host.send(JSON.stringify({
                            type: 'written-stats',
                            questionId: qKey,
                            submissionsCount: ranked.length,
                            ranked
                          }));
                        }
                      })
                      .catch(err => {
                        console.error('[WRITTEN] AI evaluation failed:', err.message);
                        const accuracy = null;
                        room.writtenStats.get(qKey).set(userId, {
                          playerId: data.submission.playerId || userId,
                          playerName: data.submission.playerName || username,
                          timeTakenMs,
                          accuracy
                        });
                        if (room.host && room.host.readyState === WebSocket.OPEN) {
                          const ranked = rankWrittenMap(room.writtenStats.get(qKey));
                          room.host.send(JSON.stringify({
                            type: 'written-stats',
                            questionId: qKey,
                            submissionsCount: ranked.length,
                            ranked
                          }));
                        }
                      });
                  }
                }
              });
            }

            // Notify host that a player submitted
            if (room.host && room.host.readyState === WebSocket.OPEN) {
              console.log(`[SUBMIT] Notifying host of submission from ${data.submission.playerName}`);
              room.host.send(JSON.stringify({
                type: 'player-submitted',
                playerId: data.submission.playerId || userId,
                playerName: data.submission.playerName || username,
                timestamp: new Date().toISOString()
              }));
              
              // Send updated answer statistics for ALL questions that were answered
              if (data.submission.answers && data.submission.answers.length > 0) {
                console.log(`[SUBMIT] Sending stats for ${data.submission.answers.length} answered questions`);
                // Get all unique question IDs from this submission
                const answeredQuestions = [...new Set(data.submission.answers.map(a => String(a.questionId)))];
                console.log(`[SUBMIT] Question IDs in submission:`, answeredQuestions);
                console.log(`[SUBMIT] Host's current question:`, room.currentQuestion);
                
                answeredQuestions.forEach(qKey => {
                  const rawStats = room.answerStats.get(qKey) || { A: 0, B: 0, C: 0, D: 0 };
                  const cleanStats = { A: rawStats.A || 0, B: rawStats.B || 0, C: rawStats.C || 0, D: rawStats.D || 0 };
                  console.log(`[SENDING STATS] To host for Q${qKey}:`, cleanStats);
                  room.host.send(JSON.stringify({
                    type: 'answer-stats',
                    questionId: qKey,
                    stats: cleanStats
                  }));

                  // Also send updated attempt counts
                  const attemptSet = room.questionAttempts.get(qKey);
                  const attemptCount = attemptSet ? attemptSet.size : 0;
                  console.log(`[SENDING ATTEMPT] To host for Q${qKey}: ${attemptCount} attempts`);
                  room.host.send(JSON.stringify({
                    type: 'question-attempt-count',
                    questionId: qKey,
                    count: attemptCount
                  }));

                  // Send written stats (ranked by accuracy desc, time asc) if available
                  const writtenMap = room.writtenStats.get(qKey);
                  if (writtenMap) {
                    const ranked = rankWrittenMap(writtenMap);
                    room.host.send(JSON.stringify({
                      type: 'written-stats',
                      questionId: qKey,
                      submissionsCount: ranked.length,
                      ranked
                    }));
                    console.log(`[SENDING WRITTEN] To host for Q${qKey}: ${ranked.length} submissions`);
                  }
                });
              }
            }
            // Acknowledge to participant
            ws.send(JSON.stringify({ type: 'submission-received', timestamp: new Date().toISOString() }));
            break;

          case 'collect-scores':
            // Only host may trigger scoring
            if (!isHost) break;

            console.log('[COLLECT-SCORES] Starting scoring process...');
            // Build submissions array
            const submissions = Array.from(room.submissions.values());
            console.log(`[COLLECT-SCORES] Found ${submissions.length} submissions`);
            console.log('[COLLECT-SCORES] Full submissions:', JSON.stringify(submissions, null, 2));
            
            // Log participants in room for debugging
            console.log(`[COLLECT-SCORES] Total participants in room: ${room.participants.size}`);
            Array.from(room.participants.values()).forEach((p, idx) => {
              console.log(`[COLLECT-SCORES] Participant ${idx}: userId=${p.userId}, username=${p.username}`);
            });

            if (submissions.length === 0) {
              console.warn('[COLLECT-SCORES] No submissions to score, sending empty leaderboard');
              const emptyPayload = JSON.stringify({ type: 'leaderboard', results: [] });
              if (room.host && room.host.readyState === WebSocket.OPEN) room.host.send(emptyPayload);
              Array.from(room.participants.values()).forEach(p => {
                if (p.ws && p.ws.readyState === WebSocket.OPEN) p.ws.send(emptyPayload);
              });
              
              // Mark quiz as ended
              if (room.hostData && room.hostData.quizCode) {
                const endUrl = `${process.env.BACKEND_URL || 'http://localhost:8086'}/api/quizzes/${room.hostData.quizCode}/end`;
                console.log(`[QUIZ-END] Calling: ${endUrl}`);
                putJson(endUrl)
                  .then(result => {
                    console.log('[QUIZ-END] Quiz marked as ended:', result);
                  })
                  .catch(err => {
                    console.error('[QUIZ-END] Error marking quiz as ended:', err.message);
                  });
              }
              break;
            }
            // Use direct scoring: 10 marks per correct answer, 0 for wrong
            console.log('[COLLECT-SCORES] Using simple 10-mark per question scoring');
            
            // Get total questions from host quiz data
            const totalQuestionsInQuiz = room.hostData && room.hostData.questions 
              ? room.hostData.questions.length 
              : 0;
            const writtenQuestionIds = room.hostData && Array.isArray(room.hostData.questions)
              ? room.hostData.questions
                  .filter(q => q && q.type !== undefined && q.type !== 'MCQ')
                  .map(q => String(q.id))
              : [];
            const totalWrittenQuestions = writtenQuestionIds.length;
            console.log('[COLLECT-SCORES] Total questions in quiz:', totalQuestionsInQuiz);
            
            Promise.all(submissions.map(async (sub, idx) => {
              let correctCount = 0;
              let totalPoints = 0;
              
              console.log(`[SCORING] Processing submission ${idx}:`, sub.playerName, 'with', sub.answers?.length, 'answers out of', totalQuestionsInQuiz, 'total');
              
              if (sub.answers && Array.isArray(sub.answers)) {
                for (const ans of sub.answers) {
                  // Get the host question to access options array
                  const hostQuestion = room.hostData && Array.isArray(room.hostData.questions)
                    ? room.hostData.questions.find(q => String(q.id) === String(ans.questionId))
                    : null;
                  
                  // Parse participant answer - could be numeric index or text
                  let participantAnswerText = String(ans.answer || '').trim();
                  
                  console.log(`[SCORING-DEBUG] Q${ans.questionId}: Raw answer="${participantAnswerText}", hostQuestion exists: ${!!hostQuestion}, options: ${hostQuestion ? JSON.stringify(hostQuestion.options) : 'N/A'}`);
                  
                  // If answer is a numeric index (0-3), convert it to the option text
                  if (/^[0-3]$/.test(participantAnswerText) && hostQuestion && Array.isArray(hostQuestion.options)) {
                    const optionIndex = parseInt(participantAnswerText);
                    const optionText = hostQuestion.options[optionIndex];
                    console.log(`[SCORING] Q${ans.questionId}: Converting index ${participantAnswerText} to option text "${optionText}"`);
                    if (optionText) {
                      participantAnswerText = optionText;
                    }
                  }
                  
                  // Normalize both to lowercase for comparison
                  const participantAnswer = participantAnswerText.toLowerCase();
                  const correctAnswer = String(ans.referenceAnswer || '').trim().toLowerCase();
                  
                  console.log(`[SCORING] Q${ans.questionId}: answer="${participantAnswer}" vs correct="${correctAnswer}"`);
                  
                  // Award 10 marks for correct answer, 0 for wrong or unanswered
                  if (participantAnswer && correctAnswer && participantAnswer === correctAnswer) {
                    correctCount++;
                    totalPoints += 10;
                    console.log(`[SCORING] ✓ CORRECT! Score now: ${totalPoints}`);
                  } else if (!participantAnswer && !correctAnswer) {
                    // Both empty is considered correct
                    correctCount++;
                    totalPoints += 10;
                  } else {
                    console.log(`[SCORING] ✗ WRONG. Score: 0 for this question`);
                  }
                }
              }
              
              // Use total questions from quiz, not from submitted answers
              const totalQuestions = totalQuestionsInQuiz > 0 ? totalQuestionsInQuiz : (sub.answers ? sub.answers.length : 0);
              const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
              
              console.log(`[SCORING] Final for ${sub.playerName}: ${totalPoints} marks, ${correctCount}/${totalQuestions} correct, ${accuracy}% accuracy`);
              
              let writtenAccuracy = 0;
              let writtenCount = 0;
              if (totalWrittenQuestions > 0) {
                const writtenSum = writtenQuestionIds.reduce((sum, qId) => {
                  const perQuestionMap = room.writtenStats.get(qId);
                  const entry = perQuestionMap ? perQuestionMap.get(sub.playerId) : null;
                  const acc = typeof entry?.accuracy === 'number' ? entry.accuracy : 0;
                  return sum + acc;
                }, 0);
                writtenCount = totalWrittenQuestions;
                writtenAccuracy = Math.round(writtenSum / totalWrittenQuestions);
              }

              return {
                playerId: sub.playerId,
                playerName: sub.playerName || `Player ${idx + 1}`,
                score: totalPoints,
                totalScore: totalPoints,
                correctCount: correctCount,
                totalQuestions: totalQuestions,
                accuracy: accuracy,
                writtenCount: writtenCount,
                writtenAccuracy: writtenAccuracy,
                averageScore: totalPoints,
                time: '--:--'
              };
            })).then(fallbackResults => {
                const sorted = fallbackResults.sort((a, b) => b.score - a.score);
                console.log('[COLLECT-SCORES] Using fallback scoring:', sorted);
                const fallbackPayload = JSON.stringify({ type: 'leaderboard', results: sorted });
                
                // Mark quiz as ended
                if (room.hostData && room.hostData.quizCode) {
                  const endUrl = `${process.env.BACKEND_URL || 'http://localhost:8086'}/api/quizzes/${room.hostData.quizCode}/end`;
                  console.log(`[QUIZ-END] Calling: ${endUrl}`);
                  putJson(endUrl)
                    .then(result => {
                      console.log('[QUIZ-END] Quiz marked as ended:', result);
                    })
                    .catch(err => {
                      console.error('[QUIZ-END] Error marking quiz as ended:', err.message);
                    });
                }
                
                // Store leaderboard for retry requests
                room.lastLeaderboard = sorted;
                console.log('[COLLECT-SCORES] Stored leaderboard in room:', room.lastLeaderboard);
                
                // To host
                if (room.host && room.host.readyState === WebSocket.OPEN) {
                  console.log('[COLLECT-SCORES] Sending leaderboard to host');
                  room.host.send(fallbackPayload);
                }
                // To participants
                console.log('[COLLECT-SCORES] Sending leaderboard to', room.participants.size, 'participants');
                Array.from(room.participants.values()).forEach(p => {
                  if (p.ws && p.ws.readyState === WebSocket.OPEN) {
                    console.log('[COLLECT-SCORES] Sending to participant:', p.username);
                    p.ws.send(fallbackPayload);
                  }
                });
                
                // Clear submissions after scoring
                room.submissions.clear();
              }).catch(err => {
                console.error('[COLLECT-SCORES] Error processing submissions:', err);
              });
            break;

          case 'host-next-question':
            // Only host can trigger moving to next question
            if (!isHost) break;

            const nextQuestionIndex = data.nextQuestionIndex;
            const nextQuestionId = data.nextQuestionId;

            console.log(`[HOST-NEXT] Host requesting next question for room ${quizCode}`);
            console.log(`[HOST-NEXT] Target index: ${nextQuestionIndex}, questionId: ${nextQuestionId}`);
            console.log(`[HOST-NEXT] Number of participants: ${room.participants.size}`);

            // Record start time for the next question
            if (nextQuestionId !== undefined && nextQuestionId !== null) {
              room.questionStartTimes.set(String(nextQuestionId), Date.now());
              console.log(`[HOST-NEXT] Recorded start time for Q${nextQuestionId}`);
            }

            // Notify all participants that they can move to next question with target index/id
            let sentCount = 0;
            Array.from(room.participants.values()).forEach(participant => {
              if (participant.ws && participant.ws.readyState === WebSocket.OPEN) {
                participant.ws.send(JSON.stringify({
                  type: 'next-question-ready',
                  questionIndex: nextQuestionIndex,
                  questionId: nextQuestionId
                }));
                sentCount++;
              }
            });
            console.log(`[HOST-NEXT] Sent next-question-ready to ${sentCount} participants`);
            break;

          case 'reveal-answer':
            // Host sends the correct answer to all participants when answer is revealed
            if (!isHost) break;
            
            const revealQuestionId = data.questionId;
            const correctAnswer = data.correctAnswer;
            
            console.log(`[REVEAL] Host revealing correct answer for question ${revealQuestionId}: ${correctAnswer}`);
            
            // Broadcast to all participants
            Array.from(room.participants.values()).forEach(participant => {
              if (participant.ws && participant.ws.readyState === WebSocket.OPEN) {
                participant.ws.send(JSON.stringify({
                  type: 'answer-revealed',
                  questionId: revealQuestionId,
                  correctAnswer: correctAnswer
                }));
              }
            });
            break;

          case 'time-up':
            // Host signals that time is up for a question - broadcast to all participants
            if (!isHost) break;
            
            const timeUpQuestionId = data.questionId;
            console.log(`[TIME-UP] Host signaling time-up for question ${timeUpQuestionId}`);
            
            // Broadcast to all participants to stop their timers
            Array.from(room.participants.values()).forEach(participant => {
              if (participant.ws && participant.ws.readyState === WebSocket.OPEN) {
                participant.ws.send(JSON.stringify({
                  type: 'time-up',
                  questionId: timeUpQuestionId
                }));
              }
            });
            break;
          case 'request-timer-sync':
            // Participant requests immediate timer update - server responds with current time estimate
            const reqQuestionId = data.questionId;
            const reqQuestionKey = String(reqQuestionId);
            console.log(`[REQUEST-TIMER-SYNC] Participant requesting timer sync for Q${reqQuestionId}`);
            
            // Get the stored start time for this question
            const startTime = room.questionStartTimes.get(reqQuestionKey);
            if (startTime && room.hostData) {
              const currentServerTime = Date.now();
              const elapsedMs = currentServerTime - startTime;
              const elapsedSecs = Math.floor(elapsedMs / 1000);
              
              // Find the question to get timePerQuestion
              const hostQuestion = room.hostData.questions.find(q => String(q.id) === reqQuestionKey);
              const timePerQuestion = room.hostData.timePerQuestion || 30;
              const timeLeft = Math.max(0, timePerQuestion - elapsedSecs);
              
              console.log(`[REQUEST-TIMER-SYNC] Sending immediate timer sync: ${timeLeft}s left (started ${elapsedSecs}s ago)`);
              
              // Send timer-sync directly to the requesting participant
              ws.send(JSON.stringify({
                type: 'timer-sync',
                questionId: reqQuestionId,
                timeLeft: timeLeft,
                timePerQuestion: timePerQuestion,
                serverTimestamp: currentServerTime
              }));
            } else {
              console.warn(`[REQUEST-TIMER-SYNC] Cannot calculate timer - no start time or host data for Q${reqQuestionId}`);
            }
            break;
          case 'request-timer-sync':
            // Participant requests current timer status from host
            const requestedQuestionId = data.questionId;
            console.log(`[REQUEST-TIMER-SYNC] Participant requesting timer sync for Q${requestedQuestionId}`);
            
            // Find the host and ask them to send timer-sync
            if (room.host && room.host.readyState === WebSocket.OPEN && room.hostData) {
              // Send a special message to the host requesting to broadcast timer-sync
              room.host.send(JSON.stringify({
                type: 'send-timer-sync-now',
                questionId: requestedQuestionId,
                targetParticipantId: userId
              }));
              console.log(`[REQUEST-TIMER-SYNC] Asked host to send timer-sync for Q${requestedQuestionId}`);
            } else {
              console.warn(`[REQUEST-TIMER-SYNC] Host not available to send timer-sync`);
            }
            break;

          case 'timer-sync':
            // Host broadcasts timer updates to keep all participants in sync
            if (!isHost) break;
            
            const syncQuestionId = data.questionId;
            const syncTimeLeft = data.timeLeft;
            const syncTimePerQuestion = data.timePerQuestion;
            const serverTimestamp = Date.now(); // Server time in milliseconds

            // Record start time if not set yet
            const syncKey = String(syncQuestionId);
            if (!room.questionStartTimes.has(syncKey)) {
              room.questionStartTimes.set(syncKey, serverTimestamp);
              console.log(`[TIMER-SYNC] Recorded start time for Q${syncQuestionId}: ${serverTimestamp}`);
            }
            
            // Broadcast to all participants with server timestamp
            Array.from(room.participants.values()).forEach(participant => {
              if (participant.ws && participant.ws.readyState === WebSocket.OPEN) {
                participant.ws.send(JSON.stringify({
                  type: 'timer-sync',
                  questionId: syncQuestionId,
                  timeLeft: syncTimeLeft,
                  timePerQuestion: syncTimePerQuestion,
                  serverTimestamp: serverTimestamp // Include server timestamp for accurate sync
                }));
              }
            });
            break;

          case 'get-leaderboard':
            // Client requests the last calculated leaderboard (in case message was lost)
            console.log('[GET-LEADERBOARD] Client requesting leaderboard for room', quizCode);
            if (room.lastLeaderboard) {
              console.log('[GET-LEADERBOARD] Sending stored leaderboard');
              ws.send(JSON.stringify({
                type: 'leaderboard',
                results: room.lastLeaderboard
              }));
            } else {
              console.log('[GET-LEADERBOARD] No leaderboard available yet');
              ws.send(JSON.stringify({
                type: 'leaderboard',
                results: []
              }));
            }
            break;
          
        // Add more message types as needed
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  // Helper: POST JSON to a URL and return parsed JSON
  function postJson(urlString, data) {
    return new Promise((resolve, reject) => {
      try {
        const url = new URL(urlString);
        const payload = JSON.stringify(data || {});
        const isHttps = url.protocol === 'https:';
        const lib = isHttps ? require('https') : require('http');

        const opts = {
          hostname: url.hostname,
          port: url.port || (isHttps ? 443 : 80),
          path: url.pathname + (url.search || ''),
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
          }
        };

        const req = lib.request(opts, (res) => {
          let body = '';
          res.setEncoding('utf8');
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            try {
              const parsed = body ? JSON.parse(body) : null;
              if (res.statusCode >= 200 && res.statusCode < 300) resolve(parsed);
              else reject(new Error(`Status ${res.statusCode}: ${body}`));
            } catch (e) {
              reject(e);
            }
          });
        });

        req.on('error', reject);
        req.write(payload);
        req.end();
      } catch (e) { reject(e); }
    });
  }

  function rankWrittenMap(writtenMap) {
    if (!writtenMap) return [];
    return Array.from(writtenMap.values()).sort((a, b) => {
      const accA = typeof a.accuracy === 'number' ? a.accuracy : -1;
      const accB = typeof b.accuracy === 'number' ? b.accuracy : -1;
      if (accB !== accA) return accB - accA;
      const ta = a.timeTakenMs ?? Infinity;
      const tb = b.timeTakenMs ?? Infinity;
      return ta - tb;
    });
  }

  function putJson(urlString) {
    return new Promise((resolve, reject) => {
      try {
        const url = new URL(urlString);
        const isHttps = url.protocol === 'https:';
        const lib = isHttps ? require('https') : require('http');

        const opts = {
          hostname: url.hostname,
          port: url.port || (isHttps ? 443 : 80),
          path: url.pathname + (url.search || ''),
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          }
        };

        const req = lib.request(opts, (res) => {
          let body = '';
          res.setEncoding('utf8');
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            try {
              const parsed = body ? JSON.parse(body) : null;
              if (res.statusCode >= 200 && res.statusCode < 300) resolve(parsed);
              else reject(new Error(`Status ${res.statusCode}: ${body}`));
            } catch (e) {
              reject(e);
            }
          });
        });

        req.on('error', reject);
        req.end();
      } catch (e) { reject(e); }
    });
  }

  // Handle client disconnection
  const cleanup = () => {
    if (isHost && room.host === ws) {
      console.log(`Host disconnected from room ${quizCode}`);
      room.host = null;
      // Optionally, notify participants that host has left
    } else if (!isHost) {
      // Remove participant from room
      if (room.participants.has(userId) && room.participants.get(userId).ws === ws) {
        room.participants.delete(userId);
        console.log(`Participant ${userId} left room ${quizCode}`);
        
        // Notify host about participant leaving
        if (room.host && room.host.readyState === WebSocket.OPEN) {
          room.host.send(JSON.stringify({
            type: 'participant-left',
            userId,
            timestamp: new Date().toISOString()
          }));
        }
      }
    }
    
    // Clean up empty rooms
    if (!room.host && room.participants.size === 0) {
      rooms.delete(quizCode);
      console.log(`Room ${quizCode} cleaned up`);
    }
  };

  ws.on('close', cleanup);
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    cleanup();
  });
});

// Start the server
const PORT = process.env.PORT || 3002;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  wss.close(() => {
    console.log('WebSocket server closed');
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });
});
