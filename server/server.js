const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Store active rooms and their participants
  const rooms = new Map(); // quizCode -> { host: WebSocket, participants: Map<userId, {ws: WebSocket, username: string}>, submissions: Map<userId, submission> }

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
      participants: new Map(),
      submissions: new Map()
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
  }

  // Handle messages from client
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received message:', data);
      
      switch (data.type) {
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

          case 'submit-answers':
            // Participant submits their answers (could be partial or full)
            // Expect data.submission = { playerId, playerName, answers: [ { questionId, referenceAnswer, answer }, ... ] }
            if (!data.submission) break;
            const roomSubmissions = room.submissions;
            roomSubmissions.set(userId, data.submission);

            // Notify host that a player submitted
            if (room.host && room.host.readyState === WebSocket.OPEN) {
              room.host.send(JSON.stringify({
                type: 'player-submitted',
                playerId: data.submission.playerId || userId,
                playerName: data.submission.playerName || username,
                timestamp: new Date().toISOString()
              }));
            }
            // Acknowledge to participant
            ws.send(JSON.stringify({ type: 'submission-received', timestamp: new Date().toISOString() }));
            break;

          case 'collect-scores':
            // Only host may trigger scoring
            if (!isHost) break;

            // Build submissions array
            const submissions = Array.from(room.submissions.values());

            // POST to backend scoring endpoint
            const backendUrl = process.env.SCORING_BACKEND_URL || 'http://localhost:8086/api/ai/score-written';
            postJson(backendUrl, submissions)
              .then(result => {
                // Broadcast leaderboard to host and participants
                const payload = JSON.stringify({ type: 'leaderboard', results: result });
                // To host
                if (room.host && room.host.readyState === WebSocket.OPEN) room.host.send(payload);
                // To participants
                Array.from(room.participants.values()).forEach(p => {
                  if (p.ws && p.ws.readyState === WebSocket.OPEN) p.ws.send(payload);
                });
                // Optionally clear submissions after scoring
                room.submissions.clear();
              })
              .catch(err => {
                console.error('Error scoring submissions:', err);
                if (room.host && room.host.readyState === WebSocket.OPEN) {
                  room.host.send(JSON.stringify({ type: 'scoring-error', message: String(err) }));
                }
              });
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
