import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import Hero from '../components/Hero';
import ProductCard from '../components/ProductCard';
import './Home.css';

const API_BASE = '';

const Home = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchDebounce, setSearchDebounce] = useState(null);
  const [activeFilter, setActiveFilter] = useState('All');
  const location = useLocation();

  // Fetch all products
  const fetchProducts = useCallback(async (search = '') => {
    setLoading(true);
    try {
      const url = search
        ? `${API_BASE}/api/products?search=${encodeURIComponent(search)}`
        : `${API_BASE}/api/products`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const query = params.get('search') || '';
    if (query !== searchTerm) {
      setSearchTerm(query);
      fetchProducts(query);
    } else if (products.length === 0) {
      fetchProducts(query);
    }
    document.title = 'House of PurviSurbhi | Premium Sarees & Suits';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, fetchProducts]);

  // Debounced search
  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (searchDebounce) clearTimeout(searchDebounce);
    const timeout = setTimeout(() => {
      fetchProducts(value);
    }, 350);
    setSearchDebounce(timeout);
  };

  const clearSearch = () => {
    setSearchTerm('');
    fetchProducts('');
  };

  const sarees = products.filter((p) => p.category === 'saree');
  const suits = products.filter((p) => p.category === 'suit');

  return (
    <div className="home-page">
      <Hero />

      {/* Search */}
      <div className="home-search-section container">
        <div className="home-search-wrapper">
          <div className="home-search-input-group">
            <span className="home-search-icon" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              className="home-search-input"
              type="text"
              placeholder="Search our collection..."
              value={searchTerm}
              onChange={handleSearch}
              aria-label="Search products"
            />
            <button
              className={`home-search-clear ${searchTerm ? 'visible' : ''}`}
              onClick={clearSearch}
              aria-label="Clear search"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="home-filters" style={{ display: 'flex', gap: '10px', marginTop: '15px', justifyContent: 'center' }}>
            {['All', 'saree', 'suit'].map(filter => (
              <button 
                key={filter}
                onClick={() => setActiveFilter(filter)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  border: '1px solid var(--primary-light)',
                  backgroundColor: activeFilter === filter ? 'var(--primary-light)' : 'transparent',
                  color: activeFilter === filter ? '#fff' : 'var(--text-main)',
                  cursor: 'pointer',
                  textTransform: 'capitalize'
                }}
              >
                {filter === 'All' ? 'All Collections' : filter + 's'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="home-loading">
          <div className="home-spinner" />
          <p>Loading collection...</p>
        </div>
      )}

      {/* Products */}
      {!loading && (
        <>
          {/* Sarees Section */}
          {(activeFilter === 'All' || activeFilter === 'saree') && sarees.length > 0 && (
            <section id="sarees" className="home-product-section">
              <div className="container">
                <div className="home-section-header">
                  <h2 className="section-title">Premium Sarees</h2>
                  <p className="home-section-subtitle">
                    Handcrafted elegance woven in tradition
                  </p>
                </div>
                <div className="home-product-grid">
                  {sarees.map((product, i) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      style={{ animationDelay: `${i * 0.1}s` }}
                    />
                  ))}
                </div>
              </div>
            </section>
          )}

          {(activeFilter === 'All' || activeFilter === 'saree') && sarees.length > 0 && suits.length > 0 && (
            <hr className="home-divider" />
          )}

          {/* Suits Section */}
          {(activeFilter === 'All' || activeFilter === 'suit') && suits.length > 0 && (
            <section id="suits" className="home-product-section">
              <div className="container">
                <div className="home-section-header">
                  <h2 className="section-title">Designer Ladies Suits</h2>
                  <p className="home-section-subtitle">
                    Contemporary designs meet timeless grace
                  </p>
                </div>
                <div className="home-product-grid">
                  {suits.map((product, i) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      style={{ animationDelay: `${i * 0.1}s` }}
                    />
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Empty State */}
          {sarees.length === 0 && suits.length === 0 && (
            <div className="home-empty">
              <div className="home-empty-icon">✨</div>
              <h3>No products found</h3>
              <p>
                {searchTerm
                  ? `No results for "${searchTerm}". Try a different search.`
                  : 'Our collection is being updated. Check back soon!'}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Home;
