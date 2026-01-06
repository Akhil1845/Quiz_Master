import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../services/api";
import config from "../config";
import {
  FaUserGraduate,
  FaChalkboardTeacher,
  FaPuzzlePiece,
  FaTrophy,
  FaEye,
  FaEyeSlash
} from "react-icons/fa";

// Static decorative elements for the background
const staticElements = [
  // Top-left corner
  { emoji: '📚', size: '40px', top: '10%', left: '5%', rotate: '-5deg' },
  { emoji: '✏️', size: '30px', top: '15%', left: '12%', rotate: '10deg' },
  // Top-right corner
  { emoji: '📖', size: '35px', top: '8%', right: '8%', rotate: '15deg' },
  { emoji: '📝', size: '25px', top: '18%', right: '15%', rotate: '-8deg' },
  // Bottom-left corner
  { emoji: '📊', size: '45px', bottom: '15%', left: '7%', rotate: '5deg' },
  { emoji: '📈', size: '35px', bottom: '8%', left: '15%', rotate: '-12deg' },
  // Bottom-right corner
  { emoji: '📉', size: '40px', bottom: '12%', right: '10%', rotate: '-5deg' },
  { emoji: '📋', size: '30px', bottom: '5%', right: '18%', rotate: '10deg' },
  // Center elements
  { emoji: '🧠', size: '50px', top: '30%', left: '20%', rotate: '0deg' },
  { emoji: '💡', size: '45px', top: '35%', right: '25%', rotate: '15deg' },
  { emoji: '🎯', size: '40px', top: '60%', left: '25%', rotate: '-10deg' },
  { emoji: '🎲', size: '35px', top: '70%', right: '30%', rotate: '12deg' },
  // Additional elements
  { emoji: '🧩', size: '30px', top: '25%', left: '45%', rotate: '8deg' },
  { emoji: '🔍', size: '25px', top: '75%', left: '40%', rotate: '-5deg' },
  { emoji: '🏆', size: '60px', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(15deg)' },
  { emoji: '📚', size: '35px', top: '20%', right: '30%', rotate: '-8deg' },
  { emoji: '📖', size: '30px', bottom: '25%', left: '30%', rotate: '10deg' },
  { emoji: '✒️', size: '25px', top: '80%', right: '20%', rotate: '-15deg' },
  { emoji: '🖋️', size: '30px', top: '90%', left: '10%', rotate: '5deg' },
];

function Login() {
  const [isSignup, setIsSignup] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all required fields');
      return;
    }
    
    try {
      setIsLoading(true);
      setError('');
      
      console.log('API_BASE_URL:', config.API_BASE_URL);
      console.log('Attempting login with email:', email);
      
      if (isSignup) {
        if (!username.trim()) {
          setError('Please choose a username');
          return;
        }
        try {
          console.log('Registering with:', { username, email });
          await api.register(username.trim(), email, password);
          console.log('Registration successful');
        } catch (registerErr) {
          console.error('Registration error:', registerErr);
          throw new Error(registerErr.message || 'Failed to create account. Please try again.');
        }
      }
      
      try {
        console.log('Logging in with email:', email);
        const response = await api.login(email, password);
        console.log('Login response:', response);
        localStorage.setItem('user', JSON.stringify(response.user));
        localStorage.setItem('token', response.token);
        navigate('/dashboard');
      } catch (loginErr) {
        console.error('Login error:', loginErr);
        throw new Error(loginErr.message || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      console.error('Form submission error:', err);
      if (err.message.includes('Failed to fetch')) {
        setError('Cannot connect to the server. Please check your internet connection and try again.');
      } else if (err.message.includes('NetworkError')) {
        setError('Network error. Please check if the backend server is running.');
      } else {
        setError(err.message || (isSignup ? 'Signup failed' : 'Login failed'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.wrapper}>
      {/* Static decorative elements */}
      <div style={styles.decorativeElements}>
        {staticElements.map((item, i) => (
          <div
            key={i}
            style={{
              ...styles.staticElement,
              fontSize: item.size,
              top: item.top,
              left: item.left,
              right: item.right,
              bottom: item.bottom,
              transform: `rotate(${item.rotate}) ${item.transform || ''}`,
              opacity: 0.2,
              zIndex: 0,
              userSelect: 'none',
              pointerEvents: 'none',
            }}
          >
            {item.emoji}
          </div>
        ))}
      </div>

      {/* Main content */}
      <div style={styles.container}>
        <motion.div
          style={styles.card}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div style={styles.header}>
            <motion.div
              style={styles.logo}
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatType: "reverse",
              }}
            >
              📚
            </motion.div>
            <h1 style={styles.title}>QuizMaster</h1>
            <p style={styles.subtitle}>
              {isSignup ? "Create your account" : "Welcome back!"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleFormSubmit} style={styles.form}>
            {isSignup && (
              <div style={styles.inputGroup}>
                <FaUserGraduate style={styles.inputIcon} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a username"
                  style={styles.input}
                  required
                />
              </div>
            )}

            <div style={styles.inputGroup}>
              <FaChalkboardTeacher style={styles.inputIcon} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email"
                style={styles.input}
                required
              />
            </div>

            <div style={styles.inputGroup}>
              <FaPuzzlePiece style={styles.inputIcon} />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isSignup ? "Create a password" : "Your password"}
                style={styles.input}
                required
                minLength={isSignup ? 6 : 1}
              />
              <div 
                style={styles.eyeIcon} 
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </div>
            </div>

            {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}

            <motion.button
              type="submit"
              style={styles.button}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : (isSignup ? 'Sign Up' : 'Sign In')}
              <FaTrophy style={{ marginLeft: 10 }} />
            </motion.button>

            <p style={styles.toggleText}>
              {isSignup ? "Already have an account?" : "Don't have an account?"}
              <span
                style={styles.toggleLink}
                onClick={() => {
                  setIsSignup(!isSignup);
                  setError('');
                }}
              >
                {isSignup ? ' Sign In' : ' Sign Up'}
              </span>
            </p>
          </form>
        </motion.div>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    minHeight: "100vh",
    width: "100vw",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #6e8efb, #a777e3)",
    padding: "20px",
    position: "relative",
    overflow: "hidden",
    '@keyframes float': {
      '0%, 100%': {
        transform: 'translateY(0) rotate(0deg)',
      },
      '50%': {
        transform: 'translateY(-20px) rotate(5deg)',
      },
    },
  },

  decorativeElements: {
    position: "absolute",
    width: "100%",
    height: "100%",
    top: 0,
    left: 0,
    pointerEvents: "none",
  },

  staticElement: {
    position: 'absolute',
    userSelect: 'none',
    zIndex: 0,
    opacity: 0.15,
    pointerEvents: 'none',
    transition: 'opacity 0.3s ease',
    ':hover': {
      opacity: 0.3,
    },
  },

  /* 🔥 FIXED FOR LAPTOP */
  container: {
    width: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },

  card: {
    background: "var(--card-bg)",
    borderRadius: "20px",
    padding: "40px 30px",
    boxShadow: "var(--shadow)",
    backdropFilter: "blur(15px)",
    border: "1px solid var(--border-color)",
    maxWidth: "450px",
    width: "100%",
    position: "relative",
    zIndex: 10,
    overflow: 'hidden',
  },

  header: {
    textAlign: "center",
    marginBottom: "30px",
  },

  logo: {
    fontSize: "50px",
    marginBottom: "15px",
    display: "inline-block",
  },

  title: {
    fontSize: "2.2rem",
    color: "#2c3e50",
    margin: "0 0 10px 0",
    background: "linear-gradient(45deg, #6e8efb, #a777e3)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    fontWeight: 800,
  },

  subtitle: {
    color: "#7f8c8d",
    fontSize: "1.1rem",
    margin: 0,
  },

  form: {
    display: "flex",
    flexDirection: "column",
    gap: "15px",
  },

  inputGroup: {
    position: "relative",
    marginBottom: "5px",
  },

  inputIcon: {
    position: "absolute",
    left: "15px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "#a777e3",
    fontSize: "1.1rem",
    zIndex: 1,
  },
  eyeIcon: {
    position: 'absolute',
    right: '15px',
    top: '50%',
    transform: 'translateY(-50%)',
    cursor: 'pointer',
    color: '#a777e3',
    zIndex: 2,
  },

  input: {
    width: "100%",
    padding: "15px 45px 15px 45px",
    borderRadius: "10px",
    border: "2px solid var(--border-color)",
    fontSize: "1rem",
    backgroundColor: "var(--card-bg)",
    color: "var(--text)",
    boxSizing: "border-box",
    transition: 'all 0.3s ease',
    ':focus': {
      borderColor: 'var(--accent)',
      boxShadow: '0 0 0 3px rgba(124, 58, 237, 0.12)',
      outline: 'none',
    },
  },

  button: {
    width: "100%",
    padding: "15px",
    background: "linear-gradient(45deg, var(--accent), #a777e3)",
    color: "var(--button-text)",
    border: "none",
    borderRadius: "10px",
    fontSize: "1.1rem",
    fontWeight: "600",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginTop: "10px",
    boxShadow: "0 4px 15px rgba(110, 142, 251, 0.3)",
  },

  forgotPassword: {
    textAlign: "right",
    margin: "-5px 0 10px",
  },

  forgotLink: {
    color: "#718096",
    fontSize: "0.85rem",
    textDecoration: "none",
  },

  toggleText: {
    textAlign: "center",
    color: "#7f8c8d",
    fontSize: "0.95rem",
    marginTop: "20px",
  },

  toggleLink: {
    color: "#6e8efb",
    cursor: "pointer",
    marginLeft: "5px",
    fontWeight: "bold",
    textDecoration: "underline",
  },
  orDivider: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    margin: '20px 0',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    backgroundColor: '#e0e0e0',
  },
  orText: {
    margin: '0 15px',
    color: '#666',
    fontSize: '14px',
  },
  googleButtonContainer: {
    width: '100%',
    marginBottom: '20px',
    display: 'flex',
    justifyContent: 'center',
  },
  usernameModal: {
    backgroundColor: 'var(--card-bg)',
    padding: '25px 30px',
    borderRadius: '0 0 12px 12px',
    boxShadow: 'var(--shadow)',
    width: 'calc(100% + 60px)',
    margin: '30px -30px -40px -30px',
    textAlign: 'center',
    position: 'relative',
    zIndex: 20,
    borderTop: '1px solid var(--border-color)',
  },
  usernameForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    marginTop: '20px',
    padding: '0',
  },
  submitButton: {
    backgroundColor: 'var(--accent)',
    color: 'var(--button-text)',
    border: 'none',
    padding: '15px 20px',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    marginTop: '10px',
    width: '100%',
    ':hover': {
      backgroundColor: '#5a7df4',
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 12px rgba(110, 142, 251, 0.3)',
    },
  },
  backButton: {
    background: 'none',
    border: 'none',
    color: '#6e8efb',
    cursor: 'pointer',
    fontSize: '0.9rem',
    marginTop: '15px',
    padding: '8px 0',
    transition: 'all 0.2s ease',
    ':hover': {
      color: '#5a7df4',
      textDecoration: 'underline',
    },
  },
};

export default Login;