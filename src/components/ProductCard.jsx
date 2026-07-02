import { Link } from 'react-router-dom';
import './ProductCard.css';

const API_BASE = import.meta.env.MODE === 'development' ? 'http://localhost:3001' : '';

const formatPrice = (price) => {
  const num = typeof price === 'string' ? parseFloat(price) : price;
  return num.toLocaleString('en-IN');
};

const ProductCard = ({ product, style }) => {
  const { id, name, price, image_url, stock, category } = product;

  const imageUrl = image_url?.startsWith('http')
    ? image_url
    : `${API_BASE}${image_url}`;

  return (
    <Link
      to={`/product/${id}`}
      className="product-card-link product-card-enter"
      style={style}
      aria-label={`View ${name}`}
    >
      <div className="product-card__image-wrapper">
        {category && (
          <span className="product-card__category">{category}</span>
        )}
        {(!stock || stock <= 0) && (
          <>
            <span className="product-card__sold-badge">Sold</span>
            <div className="product-card__sold-overlay" />
          </>
        )}
        <img
          className="product-card__image"
          src={imageUrl}
          alt={name}
          loading="lazy"
        />
      </div>
      <div className="product-card__info">
        <h3 className="product-card__name">{name}</h3>
        <p className="product-card__price">₹{formatPrice(price)}</p>
      </div>
    </Link>
  );
};

export default ProductCard;
