import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import CheckoutModal from '../components/CheckoutModal';
import './ProductDetail.css';

const API_BASE = import.meta.env.MODE === 'development' ? 'http://localhost:3001' : '';

const formatPrice = (price) => {
  const num = typeof price === 'string' ? parseFloat(price) : price;
  return num.toLocaleString('en-IN');
};

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await fetch(`${API_BASE}/api/products/${id}`);
        if (!res.ok) throw new Error('Not found');
        const data = await res.json();
        setProduct(data);
      } catch (err) {
        console.error('Failed to fetch product:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  if (loading) {
    return (
      <div className="product-detail-page">
        <div className="container pd-loading">
          <div className="pd-spinner" />
          <p>Loading product details...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="product-detail-page">
        <div className="container pd-not-found">
          <h2>Product Not Found</h2>
          <p>The product you're looking for doesn't exist or has been removed.</p>
          <Link to="/" className="btn btn-primary">Back to Home</Link>
        </div>
      </div>
    );
  }

  const imageUrl = product.image_url?.startsWith('http')
    ? product.image_url
    : `${API_BASE}${product.image_url}`;

  const stock = product.stock || 0;
  const isAvailable = stock > 0;

  const whatsappText = encodeURIComponent(
    `Hi! I'm interested in ${product.name} (₹${formatPrice(product.price)})`
  );
  const whatsappUrl = `https://wa.me/918602237795?text=${whatsappText}`;

  // Build product object compatible with CheckoutModal
  const checkoutProduct = {
    name: product.name,
    price: formatPrice(product.price),
    image: imageUrl,
    // Additional fields for backend order
    id: product.id,
    rawPrice: product.price,
  };

  return (
    <div className="product-detail-page">
      <div className="container">
        <button className="pd-back" onClick={() => navigate(-1)}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="pd-layout animate-fade-in">
          {/* Image */}
          <div className="pd-image-section">
            {!isAvailable && (
              <span className="pd-sold-badge-large">Sold Out</span>
            )}
            <img
              className="pd-image"
              src={imageUrl}
              alt={product.name}
            />
          </div>

          {/* Details */}
          <div className="pd-info">
            <span className="pd-category-badge">
              {product.category === 'saree' ? 'Saree' : 'Ladies Suit'}
            </span>

            <h1 className="pd-name">{product.name}</h1>

            <p className="pd-price">₹{formatPrice(product.price)}</p>

            <div className={`pd-availability ${isAvailable ? 'in-stock' : 'sold-out'}`}>
              <span className="pd-availability-dot" />
              {isAvailable ? 'In Stock' : 'Sold Out'}
            </div>

            {isAvailable && stock <= 3 && (
              <p style={{ color: '#d97706', fontSize: '0.9rem', marginTop: '0.5rem', fontWeight: '500' }}>
                Only {stock} left in stock - order soon!
              </p>
            )}

            {product.description && (
              <>
                <hr className="pd-divider" />
                <p className="pd-description-label">Description</p>
                <p className="pd-description">{product.description}</p>
              </>
            )}

            <hr className="pd-divider" />

            <div className="pd-actions">
              <button
                className="pd-buy-btn"
                onClick={() => setShowCheckout(true)}
                disabled={!isAvailable}
              >
                {isAvailable ? 'Buy Now' : 'Sold Out'}
              </button>

              <a
                className="pd-whatsapp-btn"
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Chat on WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
        product={showCheckout ? checkoutProduct : null}
      />
    </div>
  );
};

export default ProductDetail;
