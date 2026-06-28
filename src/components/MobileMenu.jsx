import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import './MobileMenu.css';

const MobileMenu = ({ isOpen, onClose }) => {
  // Lock body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Overlay */}
      <div
        className={`mobile-menu-overlay ${isOpen ? 'open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Menu Panel */}
      <aside
        className={`mobile-menu ${isOpen ? 'open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <div className="mobile-menu__header">
          <span className="mobile-menu__brand">PurviSurbhi</span>
          <button
            className="mobile-menu__close"
            onClick={onClose}
            aria-label="Close menu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <nav className="mobile-menu__nav">
          <ul>
            <li>
              <Link to="/" onClick={onClose}>Home</Link>
            </li>
            <li>
              <a href="/#sarees" onClick={onClose}>Sarees</a>
            </li>
            <li>
              <a href="/#suits" onClick={onClose}>Ladies Suits</a>
            </li>
            <li>
              <a href="/#about" onClick={onClose}>About</a>
            </li>
          </ul>
        </nav>

        <div className="mobile-menu__footer">
          <p>&copy; {new Date().getFullYear()} House of PurviSurbhi</p>
        </div>
      </aside>
    </>
  );
};

export default MobileMenu;
