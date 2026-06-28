import './ProductGrid.css';

const ProductGrid = ({ title, id, products, onBuyClick }) => {
  return (
    <section id={id} className="section product-section">
      <div className="container text-center">
        <h2 className="section-title">{title}</h2>
        <div className="product-grid">
          {products.map((product, index) => (
            <div key={index} className="product-card">
              <div className="product-image-container">
                <img src={product.image} alt={product.name} className="product-image" />
                <div className="product-overlay">
                  <button 
                    className="btn btn-primary add-to-cart"
                    onClick={() => onBuyClick(product)}
                  >
                    Buy Now
                  </button>
                </div>
              </div>
              <div className="product-info">
                <h3>{product.name}</h3>
                <p className="price">₹{product.price}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProductGrid;
