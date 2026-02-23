import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from "../components/Navbar";
import { QRCodeSVG } from 'qrcode.react';
import config from '../config';

function QuizConfig() {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      navigate("/login");
    }
  }, [navigate]);

  const [formData, setFormData] = useState({
    subject: 'Java',
    difficulty: '0',
    questionType: 'MCQ',
    questionSource: 'AI',
    numQuestions: 10,
    maxParticipants: 20,
    timePerQuestion: 30,
    showTimer: true,
    questionsFile: null,
    customPrompt: ''
  });

  const [isCustomPromptModified, setIsCustomPromptModified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');

  // Add spinner animation CSS
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // Auto-generate prompt when quiz settings change
  useEffect(() => {
    if (formData.questionSource === 'AI' && !isCustomPromptModified) {
      const autoPrompt = generatePromptPreview();
      setFormData(prev => ({ ...prev, customPrompt: autoPrompt }));
    }
  }, [formData.subject, formData.difficulty, formData.questionType, formData.numQuestions, formData.questionSource, isCustomPromptModified]);

  // Handle drag and drop events
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.json')) {
      try {
        const fileContent = await file.text();
        const parsedData = JSON.parse(fileContent);
        
        console.log('Parsed JSON:', parsedData);
        
        // Auto-extract subject and questions from file
        let subject = formData.subject; // Keep current if not in file
        let extractedQuestions = null;
        
        // Check different ways subject might be stored
        if (parsedData.subject) {
          subject = parsedData.subject;
          console.log('Subject found in parsedData.subject:', subject);
        } else if (parsedData.Subject) {
          subject = parsedData.Subject;
          console.log('Subject found in parsedData.Subject:', subject);
        } else if (Array.isArray(parsedData) && parsedData[0]?.subject) {
          subject = parsedData[0].subject;
          console.log('Subject found in first question:', subject);
        }
        
        // Map common subject variations to dropdown values
        const subjectMapping = {
          'General Knowledge': 'GK',
          'general knowledge': 'GK',
          'GK': 'GK',
          'Java': 'Java',
          'java': 'Java',
          'DBMS': 'DBMS',
          'dbms': 'DBMS',
          'JavaScript': 'JavaScript',
          'javascript': 'JavaScript',
          'js': 'JavaScript',
          'Python': 'Python',
          'python': 'Python'
        };
        
        subject = subjectMapping[subject] || subject;
        
        // Check if it's an array of questions or object with questions field
        if (Array.isArray(parsedData)) {
          extractedQuestions = parsedData;
        } else if (parsedData.questions && Array.isArray(parsedData.questions)) {
          extractedQuestions = parsedData.questions;
        } else if (parsedData.Questions && Array.isArray(parsedData.Questions)) {
          extractedQuestions = parsedData.Questions;
        }
        
        console.log('Extracted:', { subject, numQuestions: extractedQuestions?.length });
        
        // Update form with extracted data
        setFormData(prev => ({
          ...prev,
          questionsFile: file,
          subject: subject,
          numQuestions: extractedQuestions ? extractedQuestions.length : prev.numQuestions
        }));
        
      } catch (error) {
        console.error('Error parsing JSON file:', error);
        alert('Invalid JSON file. Please make sure your file contains valid JSON.');
      }
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const fileContent = await file.text();
        const parsedData = JSON.parse(fileContent);
        
        console.log('Parsed JSON:', parsedData);
        
        // Auto-extract subject and questions from file
        let subject = formData.subject; // Keep current if not in file
        let extractedQuestions = null;
        
        // Check different ways subject might be stored
        if (parsedData.subject) {
          subject = parsedData.subject;
          console.log('Subject found in parsedData.subject:', subject);
        } else if (parsedData.Subject) {
          subject = parsedData.Subject;
          console.log('Subject found in parsedData.Subject:', subject);
        } else if (Array.isArray(parsedData) && parsedData[0]?.subject) {
          subject = parsedData[0].subject;
          console.log('Subject found in first question:', subject);
        }
        
        // Map common subject variations to dropdown values
        const subjectMapping = {
          'General Knowledge': 'GK',
          'general knowledge': 'GK',
          'GK': 'GK',
          'Java': 'Java',
          'java': 'Java',
          'DBMS': 'DBMS',
          'dbms': 'DBMS',
          'JavaScript': 'JavaScript',
          'javascript': 'JavaScript',
          'js': 'JavaScript',
          'Python': 'Python',
          'python': 'Python'
        };
        
        subject = subjectMapping[subject] || subject;
        
        // Check if it's an array of questions or object with questions field
        if (Array.isArray(parsedData)) {
          extractedQuestions = parsedData;
        } else if (parsedData.questions && Array.isArray(parsedData.questions)) {
          extractedQuestions = parsedData.questions;
        } else if (parsedData.Questions && Array.isArray(parsedData.Questions)) {
          extractedQuestions = parsedData.Questions;
        }
        
        console.log('Extracted:', { subject, numQuestions: extractedQuestions?.length });
        
        // Update form with extracted data
        setFormData(prev => ({
          ...prev,
          questionsFile: file,
          subject: subject,
          numQuestions: extractedQuestions ? extractedQuestions.length : prev.numQuestions
        }));
        
      } catch (error) {
        console.error('Error parsing JSON file:', error);
        alert('Invalid JSON file. Please make sure your file contains valid JSON.');
        setFormData(prev => ({ ...prev, questionsFile: null }));
      }
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Track if user manually modifies the custom prompt
    if (name === 'customPrompt') {
      setIsCustomPromptModified(true);
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    const numValue = Math.max(1, parseInt(value) || 1);
    setFormData(prev => ({
      ...prev,
      [name]: numValue
    }));
  };

  const generatePromptPreview = () => {
    const subject = formData.subject || 'Topic';
    const count = formData.numQuestions || 1;
    const difficulty = parseInt(formData.difficulty || '0', 10);
    const questionType = formData.questionType || 'MCQ';
    
    // Difficulty level instructions
    let levelInstruction = '';
    if (difficulty === 0) {
      levelInstruction = 'Easy level: Create definition-based questions with straightforward facts and basic concepts.';
    } else if (difficulty === 1) {
      levelInstruction = 'Medium level: Create conceptual questions that test understanding and application of knowledge.';
    } else {
      levelInstruction = 'Hard level: Create scenario-based questions requiring critical thinking, analysis, and problem-solving.';
    }
    
    // Question type specific instructions
    let typeInstruction = '';
    if (questionType === 'MCQ') {
      typeInstruction = 'All questions must be Multiple Choice Questions (MCQ) with exactly 4 options.';
    } else if (questionType === 'Written') {
      typeInstruction = 'All questions must be written/descriptive questions requiring detailed answers.';
    } else {
      typeInstruction = 'Create a mix of Multiple Choice Questions (MCQ) and written/descriptive questions.';
    }
    
    // Subject-specific context
    let subjectContext = '';
    switch(subject) {
      case 'Java':
        subjectContext = 'Focus on Java programming concepts, syntax, OOP principles, collections, exception handling, and best practices.';
        break;
      case 'DBMS':
        subjectContext = 'Focus on Database Management System concepts including SQL, normalization, transactions, indexing, and database design.';
        break;
      case 'GK':
        subjectContext = 'Focus on General Knowledge covering current affairs, history, geography, science, sports, and general awareness topics.';
        break;
      case 'JavaScript':
        subjectContext = 'Focus on JavaScript programming including ES6+ features, DOM manipulation, async programming, and modern frameworks.';
        break;
      case 'Python':
        subjectContext = 'Focus on Python programming including syntax, data structures, libraries, OOP concepts, and best practices.';
        break;
      default:
        subjectContext = `Focus on ${subject} related topics and concepts.`;
    }

    return `You are an expert exam question generator.

Subject: ${subject}
${subjectContext}

Difficulty: ${difficulty === 0 ? 'Easy' : difficulty === 1 ? 'Medium' : 'Hard'}
${levelInstruction}

Question Type: ${questionType}
${typeInstruction}

Task: Generate exactly ${count} high-quality questions following these requirements:
1. Each question should be clear, unambiguous, and relevant to ${subject}
2. Questions should match the ${difficulty === 0 ? 'Easy' : difficulty === 1 ? 'Medium' : 'Hard'} difficulty level
3. For MCQ questions: provide exactly 4 options with only ONE correct answer
4. Ensure variety in topics within ${subject}
5. Avoid repetitive or overly similar questions

Output Format:
Return ONLY a valid JSON array. Each question must be an object with these exact keys:
- "question": (string) The question text
- "options": (array of 4 strings) The answer choices
- "correctAnswer": (string) One of the options that is the correct answer

Important: Return ONLY the JSON array with no additional text, explanations, markdown formatting, or backticks.`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setLoadingStatus('');

    if (formData.questionSource === 'Manual' && !formData.questionsFile) {
      alert('Please upload a questions file');
      setIsLoading(false);
      return;
    }

    try {
      let questions = [];
      if (formData.questionSource === 'Manual') {
        setLoadingStatus('Parsing questions file...');
        try {
          const fileContent = await formData.questionsFile.text();
          const parsedData = JSON.parse(fileContent);
          
          // Extract questions array - handle different JSON structures
          if (Array.isArray(parsedData)) {
            // File contains array of questions directly
            questions = parsedData;
          } else if (parsedData.questions && Array.isArray(parsedData.questions)) {
            // File contains object with questions property
            questions = parsedData.questions;
          } else if (parsedData.Questions && Array.isArray(parsedData.Questions)) {
            // File contains object with Questions property (capital Q)
            questions = parsedData.Questions;
          } else {
            throw new Error('Invalid questions format. Expected an array or object with "questions" property.');
          }

          // Normalize manual questions: set default type and points
          questions = questions.map(q => ({
            ...q,
            type: q.type || (q.options ? 'MCQ' : 'WRITTEN'),
            points: q.points ?? 1,
          }));

          if (!Array.isArray(questions)) {
            throw new Error('Invalid questions format. Expected an array of questions.');
          }

          questions.forEach((q, i) => {
            if (!q.question || !q.options || !Array.isArray(q.options) || q.correctAnswer === undefined) {
              throw new Error(`Question ${i + 1} is missing required fields (question, options array, or correctAnswer)`);
            }
          });
        } catch (error) {
          console.error('Error parsing questions file:', error);
          alert(`Error parsing questions file: ${error.message}`);
          setIsLoading(false);
          return;
        }
      } else if (formData.questionSource === 'AI') {
        setLoadingStatus('🤖 Generating questions with AI... (this may take 30-60 seconds)');
        const promptToSend = formData.customPrompt || generatePromptPreview();
        console.log('Sending AI generation request:', promptToSend);
        
        const res = await fetch(`${config.API_BASE_URL}/ai/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: promptToSend
        });

        if (!res.ok) {
          const txt = await res.text();
          console.error('AI generation failed:', txt);
          throw new Error('AI generation failed. Make sure the backend server is running at ' + config.API_BASE_URL + '. Error: ' + (txt || res.statusText));
        }

        const text = await res.text();
        console.log('AI response received:', text);
        const data = JSON.parse(text);
        if (!Array.isArray(data)) throw new Error('AI returned invalid format. Expected JSON array.');
        questions = data;
        setLoadingStatus('✅ Questions generated! Saving quiz...');
      }

      const quizCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      // Save quiz and questions to database
      if (formData.questionSource === 'AI') {
        setLoadingStatus('💾 Saving quiz to database...');
        const saveResponse = await fetch(`${config.API_BASE_URL}/ai/save-quiz`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quizCode,
            title: formData.title || `${formData.subject} Quiz`,
            subject: formData.subject,
            difficulty: formData.difficulty,
            questionType: formData.questionType,
            questionSource: formData.questionSource,
            numQuestions: questions.length,
            hostUserId: user?.id,
            questions: questions
          })
        });

        if (!saveResponse.ok) {
          const error = await saveResponse.text();
          throw new Error('Failed to save quiz to database: ' + error);
        }
      }

      setLoadingStatus('✨ Preparing waiting room...');
      const quizConfig = {
        ...formData,
        quizCode,
        questions: formData.questionSource === 'Manual' ? questions : null,
        numQuestions: questions.length,
        createdAt: new Date().toISOString(),
        status: 'waiting'
      };

      localStorage.setItem('currentQuiz', JSON.stringify(quizConfig));
      if (fileInputRef.current) fileInputRef.current.value = '';

      navigate('/waiting-room', {
        state: { quiz: quizConfig }
      });
    } catch (error) {
      console.error('Error:', error);
      alert(error.message || 'Error processing quiz. Please try again.');
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  if (!user) return null;

  return (
    <div style={{ ...styles.wrapper, background: 'var(--bg)' }}>
      <Navbar user={user} onLogout={handleLogout} />

      {isLoading && (
        <div style={styles.loadingOverlay}>
          <div style={styles.loadingModal}>
            <div style={styles.spinner}></div>
            <h2 style={styles.loadingText}>{loadingStatus || 'Creating quiz...'}</h2>
            <p style={styles.loadingSubtext}>This may take up to a minute for AI generation</p>
          </div>
        </div>
      )}

      <main style={styles.main}>
        <div style={styles.container}>
          <h1 style={styles.title}>Create New Quiz</h1>

          <div style={{ ...styles.card, backgroundColor: 'var(--card-bg)', color: 'var(--text)' }}>
            <form onSubmit={handleSubmit} style={styles.form}>
              {/* Quiz Settings Section */}
              <div style={styles.section}>
                <h2 style={styles.sectionTitle}> Quiz Settings</h2>
                <div style={styles.grid}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      <span style={styles.labelText}>Subject</span>
                      <select
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        style={styles.select}
                      >
                        <option value="Java">Java</option>
                        <option value="DBMS">DBMS</option>
                        <option value="GK">General Knowledge</option>
                        <option value="JavaScript">JavaScript</option>
                        <option value="Python">Python</option>
                      </select>
                    </label>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      <span style={styles.labelText}>Difficulty</span>
                      <select
                        name="difficulty"
                        value={formData.difficulty}
                        onChange={handleChange}
                        style={styles.select}
                      >
                        <option value="0">Easy</option>
                        <option value="1">Medium</option>
                        <option value="2">Hard</option>
                      </select>
                    </label>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      <span style={styles.labelText}>Question Type</span>
                      <select
                        name="questionType"
                        value={formData.questionType}
                        onChange={handleChange}
                        style={styles.select}
                      >
                        <option value="MCQ">Multiple Choice</option>
                        <option value="Written">Written</option>
                        <option value="Mixed">Mixed</option>
                      </select>
                    </label>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      <span style={styles.labelText}># of Questions</span>
                      <input
                        type="number"
                        name="numQuestions"
                        min="1"
                        max="50"
                        value={formData.numQuestions}
                        onChange={handleNumberChange}
                        style={styles.input}
                      />
                    </label>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      <span style={styles.labelText}>Time per Question (sec)</span>
                      <input
                        type="number"
                        name="timePerQuestion"
                        min="5"
                        max="300"
                        value={formData.timePerQuestion}
                        onChange={handleNumberChange}
                        style={styles.input}
                      />
                    </label>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      <span style={styles.labelText}>Max Participants</span>
                      <input
                        type="number"
                        name="maxParticipants"
                        min="1"
                        max="100"
                        value={formData.maxParticipants}
                        onChange={handleNumberChange}
                        style={styles.input}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Question Source Section */}
              <div style={styles.section}>
                <h2 style={styles.sectionTitle}> Question Source</h2>
                <div style={styles.grid}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      <span style={styles.labelText}>Source</span>
                      <select
                        name="questionSource"
                        value={formData.questionSource}
                        onChange={handleChange}
                        style={styles.select}
                      >
                        <option value="AI">AI Generated</option>
                        <option value="Manual">Upload Questions</option>
                      </select>
                    </label>
                  </div>

                  {formData.questionSource === 'Manual' ? (
                    <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
                      <label style={styles.label}>
                        <span style={styles.labelText}>Upload Questions (JSON)</span>
                        <div
                          style={{
                            ...styles.uploadArea,
                            border: isDragging ? '2px dashed #4CAF50' : '2px dashed #ccc',
                            backgroundColor: isDragging ? 'rgba(76, 175, 80, 0.1)' : 'transparent'
                          }}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                        >
                          <input
                            type="file"
                            accept=".json"
                            onChange={handleFileChange}
                            ref={fileInputRef}
                            style={styles.fileInput}
                            id="file-upload"
                          />
                          <label htmlFor="file-upload" style={styles.uploadButton}>
                            {formData.questionsFile ? (
                              <span> {formData.questionsFile.name}</span>
                            ) : (
                              <span> Drag & drop or click to upload JSON</span>
                            )}
                          </label>
                          {formData.questionsFile && (
                            <button
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, questionsFile: null }))}
                              style={styles.removeButton}
                              aria-label="Remove file"
                            >
                              ×
                            </button>
                          )}
                        </div>
                        <div style={styles.helpText}>
                          Upload a JSON file with questions in the correct format
                        </div>
                      </label>
                    </div>
                  ) : (
                    <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
                      <label style={styles.label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={styles.labelText}>Custom Prompt</span>
                          <button
                            type="button"
                            onClick={() => {
                              setIsCustomPromptModified(false);
                              setFormData(prev => ({ ...prev, customPrompt: generatePromptPreview() }));
                            }}
                            style={styles.smallButton}
                            disabled={!formData.customPrompt}
                          >
                            Reset to Default
                          </button>
                        </div>
                        <textarea
                          name="customPrompt"
                          value={formData.customPrompt}
                          onChange={handleChange}
                          placeholder="AI prompt will be automatically generated based on your selections..."
                          style={styles.textarea}
                          rows={8}
                        />
                        <div style={styles.helpText}>
                          The prompt is automatically generated based on your quiz settings. You can customize it manually if needed.
                        </div>
                      </label>
                    </div>
                  )}
                </div>
              </div>

              <div style={styles.buttonGroup}>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  style={styles.secondaryBtn}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{...styles.primaryBtn, opacity: isLoading ? 0.6 : 1, cursor: isLoading ? 'not-allowed' : 'pointer'}}
                  disabled={isLoading}
                >
                  {isLoading ? 'Creating...' : 'Create Quiz'}
                </button>
              </div>
            </form>
          </div>
        </div>
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
    maxWidth: '600px',
    margin: '0 auto',
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
      borderRadius: '16px 16px 0 0',
    }
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    textAlign: 'left',
  },
  section: {
    backgroundColor: 'var(--card-bg)',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: 'var(--shadow-sm)',
    border: '1px solid var(--border-color)',
  },
  sectionTitle: {
    fontSize: '1.1rem',
    color: 'var(--text)',
    margin: '0 0 1.5rem 0',
    paddingBottom: '0.75rem',
    borderBottom: '1px solid var(--border-color)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontWeight: '600',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1.5rem',
    '@media (max-width: 768px)': {
      gridTemplateColumns: '1fr',
    },
  },
  formGroup: {
    marginBottom: '0',
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  labelText: {
    fontSize: '0.95rem',
    color: 'var(--text-secondary)',
    fontWeight: '500',
  },
  input: {
    width: '100%',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
    fontSize: '0.95rem',
    backgroundColor: 'var(--input-bg)',
    color: 'var(--text)',
    transition: 'all 0.2s',
    ':focus': {
      outline: 'none',
      borderColor: 'var(--accent)',
      boxShadow: '0 0 0 2px var(--accent-light)',
    },
  },
  select: {
    width: '100%',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
    fontSize: '0.95rem',
    backgroundColor: 'var(--input-bg)',
    color: 'var(--text)',
    cursor: 'pointer',
    appearance: 'none',
    ':focus': {
      outline: 'none',
      borderColor: 'var(--accent)',
      boxShadow: '0 0 0 2px var(--accent-light)',
    },
  },
  textarea: {
    width: '100%',
    padding: '1rem',
    borderRadius: '10px',
    border: '1px solid var(--border-color)',
    fontSize: '0.95rem',
    backgroundColor: 'var(--input-bg)',
    color: 'var(--text)',
    fontFamily: 'inherit',
    lineHeight: '1.5',
    transition: 'all 0.2s',
    ':focus': {
      outline: 'none',
      borderColor: 'var(--accent)',
      boxShadow: '0 0 0 2px var(--accent-light)',
    },
  },
  buttonGroup: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '1rem',
    marginTop: '1.5rem',
  },
  primaryBtn: {
    padding: '0.75rem 2rem',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(90deg, var(--accent), #7c3aed)',
    color: 'white',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)',
    },
    ':active': {
      transform: 'translateY(0)',
    },
  },
  secondaryBtn: {
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--card-bg)',
    color: 'var(--text)',
    fontSize: '1rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: 'var(--hover-bg)',
      borderColor: 'var(--border-hover)',
    },
  },
  smallButton: {
    padding: '0.4rem 0.8rem',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    backgroundColor: 'var(--card-bg)',
    color: 'var(--text)',
    color: '#4a5568',
    fontSize: '0.85rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: '#f8fafc',
    },
    ':disabled': {
      opacity: 0.6,
      cursor: 'not-allowed',
    },
  },
  uploadArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '1rem',
    borderRadius: '10px',
    backgroundColor: '#f8fafc',
    border: '2px dashed #e2e8f0',
    transition: 'all 0.2s',
    position: 'relative',
  },
  uploadButton: {
    flex: 1,
    padding: '0.75rem 1.25rem',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    textAlign: 'center',
    color: '#4a5568',
    fontWeight: '500',
    fontSize: '0.95rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    transition: 'all 0.2s',
  },
  removeButton: {
    padding: '0.5rem',
    backgroundColor: '#fed7d7',
    color: '#e53e3e',
    border: 'none',
    borderRadius: '50%',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontSize: '1.2rem',
    lineHeight: '1',
    ':hover': {
      backgroundColor: '#feb2b2',
    },
  },
  helpText: {
    fontSize: '0.85rem',
    color: '#718096',
    marginTop: '0.5rem',
    lineHeight: '1.4',
  },
  toggleContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.5rem',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: 'rgba(0, 0, 0, 0.02)',
    },
  },
  toggleInput: {
    display: 'none',
  },
  toggleSlider: {
    position: 'relative',
    display: 'inline-block',
    width: '44px',
    height: '24px',
    backgroundColor: '#e2e8f0',
    borderRadius: '34px',
    transition: 'all 0.3s',
    ':before': {
      content: '""',
      position: 'absolute',
      height: '18px',
      width: '18px',
      left: '3px',
      bottom: '3px',
      backgroundColor: 'white',
      borderRadius: '50%',
      transition: 'all 0.3s',
    },
  },
  toggleLabel: {
    fontSize: '0.95rem',
    color: '#4a5568',
    fontWeight: '500',
  },
  'input[type="checkbox"]:checked + $toggleSlider': {
    backgroundColor: '#4a90e2',
  },
  'input[type="checkbox"]:checked + $toggleSlider:before': {
    transform: 'translateX(20px)',
  },
  loadingOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  loadingModal: {
    backgroundColor: 'var(--card-bg)',
    borderRadius: '12px',
    padding: '3rem 2rem',
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    minWidth: '400px',
    maxWidth: '500px',
  },
  spinner: {
    border: '4px solid rgba(255, 255, 255, 0.3)',
    borderTop: '4px solid var(--accent)',
    borderRadius: '50%',
    width: '50px',
    height: '50px',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 20px',
  },
  loadingText: {
    color: 'var(--text)',
    fontSize: '1.3rem',
    fontWeight: '600',
    marginBottom: '10px',
  },
  loadingSubtext: {
    color: 'var(--muted)',
    fontSize: '0.9rem',
  },
};

export default QuizConfig;