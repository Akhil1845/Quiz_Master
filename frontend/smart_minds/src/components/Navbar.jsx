import { useState, useRef, useEffect } from 'react';
import { FaUserCircle, FaSignOutAlt, FaBell, FaMoon, FaSun } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

function Navbar({ user }) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const navigate = useNavigate();

  // Close profile dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    if (typeof onLogout === 'function') onLogout();
    else navigate('/login');
  };

  const toggleTheme = () => {
    const current = localStorage.getItem('theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
  };

  const applyTheme = (theme) => {
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  };

  useEffect(() => {
    const t = localStorage.getItem('theme') || 'light';
    applyTheme(t);
  }, []);

  return (
    <nav style={styles.nav}>
      <div style={styles.logo}>
        <span style={styles.logoText}>QuizMaster</span>
      </div>
      
      <div style={styles.navRight}>
        <button style={styles.notificationButton}>
          <FaBell />
        </button>
        
        <div style={styles.profileContainer} ref={profileRef}>
          <button 
            style={styles.profileButton}
            onClick={() => setIsProfileOpen(!isProfileOpen)}
          >
            <FaUserCircle style={styles.avatar} />
            <span style={styles.userName}>{user?.username || user?.name || 'User'}</span>
          </button>
          
          <AnimatePresence>
            {isProfileOpen && (
              <motion.div
                style={styles.dropdown}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <div style={styles.dropdownHeader}>
                  <FaUserCircle style={styles.dropdownAvatar} />
                  <div>
                    <div style={styles.dropdownName}>{user?.username || user?.name || 'User'}</div>
                    <div style={styles.dropdownEmail}>{user?.email || ''}</div>
                  </div>
                </div>
                <div style={styles.dropdownDivider} />
                <button style={styles.dropdownItem} onClick={() => { setIsProfileOpen(false); navigate('/profile'); }}>
                  <FaUserCircle style={styles.dropdownIcon} />
                  Profile
                </button>
                <div style={styles.dropdownDivider} />
                <div style={{ display: 'flex', gap: 8, padding: 12, alignItems: 'center' }}>
                  <button
                    title="Toggle theme"
                    style={{ ...styles.iconBtn }}
                    onClick={() => { toggleTheme(); setIsProfileOpen(false); }}
                  >
                    {document.documentElement.getAttribute('data-theme') === 'dark' ? <FaSun/> : <FaMoon/>}
                  </button>
                  <button 
                    style={{ ...styles.dropdownItem, color: '#ef4444', flex: 1 }}
                    onClick={handleLogout}
                  >
                    <FaSignOutAlt style={styles.dropdownIcon} />
                    Logout
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    height: '70px',
    background: 'var(--nav-bg)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 30px',
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  logoText: {
    fontSize: '1.7rem',
    fontWeight: '800',
    color: 'var(--text)',
    fontFamily: '"Poppins", sans-serif',
  },
  logoDot: {
    color: '#6e8efb',
    fontSize: '2rem',
    lineHeight: '1',
  },
  navRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  notificationButton: {
    background: 'none',
    border: 'none',
    color: 'var(--muted)',
    fontSize: '1.4rem',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '50%',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ':hover': {
      color: 'var(--accent)',
      transform: 'scale(1.1)',
    },
  },
  iconBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 8,
    borderRadius: 8,
    fontSize: '1rem',
    color: 'var(--muted)'
  },
  notificationBadge: {
    position: 'absolute',
    top: '2px',
    right: '2px',
    backgroundColor: '#ef4444',
    color: 'var(--button-text)',
    borderRadius: '50%',
    width: '18px',
    height: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.7rem',
    fontWeight: 'bold',
    border: '2px solid var(--card-bg)',
  },
  profileContainer: {
    position: 'relative',
  },
  profileButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: 'rgba(255, 255, 255, 0.1)',
    border: 'none',
    borderRadius: '30px',
    padding: '6px 12px 6px 6px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    ':hover': {
      background: 'rgba(255, 255, 255, 0.2)',
    },
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    color: '#6e8efb',
  },
  userName: {
    color: 'var(--text)',
    fontWeight: '500',
    fontSize: '0.9rem',
  },
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 10px)',
    right: '0',
    width: '280px',
    background: 'var(--card-bg)',
    borderRadius: '12px',
    boxShadow: 'var(--shadow)',
    overflow: 'hidden',
    zIndex: 1000,
  },
  dropdownHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    background: 'var(--card-bg)',
  },
  dropdownAvatar: {
    width: '40px',
    height: '40px',
    color: '#6e8efb',
  },
  dropdownName: {
    fontWeight: '600',
    color: 'var(--text)',
  },
  dropdownEmail: {
    fontSize: '0.85rem',
    color: 'var(--muted)',
    marginTop: '2px',
  },
  dropdownDivider: {
    height: '1px',
    backgroundColor: 'var(--border-color)',
    margin: '4px 0',
  },
  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    padding: '12px 16px',
    background: 'none',
    border: 'none',
    textAlign: 'left',
    cursor: 'pointer',
    color: 'var(--muted)',
    fontSize: '0.95rem',
    transition: 'all 0.2s ease',
    ':hover': {
      backgroundColor: 'rgba(255,255,255,0.03)',
      color: 'var(--text)',
    },
  },
  dropdownIcon: {
    color: 'var(--muted)',
    fontSize: '1rem',
  },
};

export default Navbar;
