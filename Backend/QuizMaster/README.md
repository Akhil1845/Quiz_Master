# QuizMaster — OpenAI Integration

This project includes an AI question generator endpoint. The backend code will call OpenAI's Chat Completions API when an API key is provided; otherwise it falls back to deterministic sample questions for development.

Files changed for this integration:
- `Backend/QuizMaster/src/main/java/com/quizmaster/quizmaster/dto/QuizRequest.java` (added `customPrompt`)
- `Backend/QuizMaster/src/main/java/com/quizmaster/quizmaster/service/AIQuizService.java` (uses `openai.api.key` and `customPrompt`)
- `frontend/smart_minds/src/pages/QuizConfig.jsx` (added optional `customPrompt` textarea and sends it in payload)

How to enable real OpenAI integration

1) Set your OpenAI API key as an environment variable (recommended).

PowerShell (current session):

```powershell
$env:OPENAI_API_KEY = 'sk-REPLACE_WITH_YOUR_KEY'
./mvnw.cmd spring-boot:run
```

Command Prompt (Windows):

```cmd
set OPENAI_API_KEY=sk-REPLACE_WITH_YOUR_KEY
mvnw.cmd spring-boot:run
```

Or export and run with Maven if you have Maven installed:

```powershell
setx OPENAI_API_KEY "sk-REPLACE_WITH_YOUR_KEY"   # persists for new sessions
mvn spring-boot:run
```

2) (Alternative) Put the key into `application.properties` (not recommended for production):

Edit `Backend/QuizMaster/src/main/resources/application.properties` and set:

```
openai.api.key=sk-REPLACE_WITH_YOUR_KEY
```

3) Start backend and frontend

- Start backend from `Backend/QuizMaster`:

```powershell
./mvnw.cmd spring-boot:run
```

- Start frontend from `frontend/smart_minds` (Vite):

```powershell
cd d:\Smart Minds\frontend\smart_minds
npm install
npm run dev
```

Notes about CORS and proxy

- The frontend Vite config proxies `/api` requests to `http://localhost:8086` (backend). Make sure backend runs on port `8086` or update `vite.config.js` and `application.properties` accordingly.
- Backend CORS whites list includes `http://localhost:5173` and `http://localhost:3000` in `WebConfig`.

Quick test of the AI endpoint (curl)

Replace `sk-REPLACE_WITH_YOUR_KEY` with your key and run backend.

```bash
curl -X POST "http://localhost:8086/api/ai/generate-quiz" \
  -H "Content-Type: application/json" \
  -d '{ "subject":"Recursion","difficulty":1,"questionType":"MCQ","count":3 }'
```

If the backend has a valid API key, it will return a JSON array of generated questions. If the key is not set, it returns deterministic sample questions.

If you want, I can now:
- run a quick local smoke test (I cannot start processes here without your confirmation), or
- walk you through adding rate-limiting or prompt templates for better quality.
