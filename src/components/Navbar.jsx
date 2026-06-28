import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import MobileMenu from './MobileMenu';
import SearchBar from './SearchBar';
import './Navbar.css';

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearch = (term) => {
    if (term && location.pathname !== '/') {
      window.location.href = `/?search=${encodeURIComponent(term)}`;
    }
    // If on home page, the Home component will handle search via URL params
  };

  return (
    <>
      <nav className={`navbar ${scrolled ? 'glass' : ''}`}>
        <div className="container nav-container">
          <div className="nav-logo">
            <Link to="/">
              <img src="/images/logo.png" alt="House of PurviSurbhi" className="navbar-logo-img" />
            </Link>
          </div>
          <ul className="nav-links">
            <li><Link to="/">Home</Link></li>
            <li><a href="/#sarees">Sarees</a></li>
            <li><a href="/#suits">Ladies Suits</a></li>
            <li><a href="/#about">About</a></li>
          </ul>
          <div className="nav-actions">
            <button className="icon-btn" aria-label="Search" onClick={() => setSearchOpen(true)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <button className="icon-btn hamburger" aria-label="Menu" onClick={() => setMobileMenuOpen(true)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      <SearchBar isOpen={searchOpen} onClose={() => setSearchOpen(false)} onSearch={handleSearch} />
      <MobileMenu isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
    </>
  );
};

export default Navbar;
