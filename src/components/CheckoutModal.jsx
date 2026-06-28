import { useState } from 'react';
import './CheckoutModal.css';

const CheckoutModal = ({ isOpen, onClose, product }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });
  const [status, setStatus] = useState('');

  if (!isOpen || !product) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('submitting');

    try {
      // Save order to database via backend API
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: product.id,
          product_name: product.name,
          product_price: product.rawPrice !== undefined ? product.rawPrice : (typeof product.price === 'string' ? Number(product.price.replace(/,/g, '')) : product.price),
          customer_name: formData.name,
          customer_email: formData.email,
          customer_phone: formData.phone,
          customer_address: formData.address,
        }),
      });

      const result = await response.json();
      if (response.ok) {
        setStatus('success');
        setFormData({ name: '', email: '', phone: '', address: '' });
        setTimeout(() => {
          setStatus('');
          onClose();
        }, 3000);
      } else {
        setStatus('error');
      }
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  };

  const formattedPrice = typeof product.price === 'number'
    ? product.price.toLocaleString('en-IN')
    : product.price;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>&times;</button>
        <h2>Complete Your Purchase</h2>
        
        {status === 'success' ? (
          <div className="success-message" style={{textAlign: 'center', padding: '2rem 0', color: 'var(--primary-color)'}}>
            <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" fill="none" viewBox="0 0 24 24" stroke="var(--primary-color)" style={{margin: '0 auto 1rem', display: 'block'}}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3>Order Placed Successfully!</h3>
            <p>We have received your request and will contact you shortly.</p>
          </div>
        ) : (
          <>
            <div className="modal-product-summary">
              <img src={product.image_url || product.image} alt={product.name} />
              <div>
                <h3>{product.name}</h3>
                <p className="price">₹{formattedPrice}</p>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="checkout-form">
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" name="name" required value={formData.name} onChange={handleChange} disabled={status === 'submitting'} placeholder="Enter your full name" />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input type="email" name="email" required value={formData.email} onChange={handleChange} disabled={status === 'submitting'} placeholder="your.email@example.com" />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input type="tel" name="phone" required value={formData.phone} onChange={handleChange} disabled={status === 'submitting'} placeholder="e.g. 98765 43210" />
              </div>
              <div className="form-group">
                <label>Delivery Address</label>
                <textarea name="address" required rows="3" value={formData.address} onChange={handleChange} disabled={status === 'submitting'} placeholder="Full delivery address with pincode"></textarea>
              </div>
              {status === 'error' && <p style={{color: '#e04040', fontSize: '0.9rem', marginBottom: '1rem'}}>Something went wrong. Please try again.</p>}
              <button type="submit" className="btn btn-primary full-width" disabled={status === 'submitting'}>
                {status === 'submitting' ? 'Placing Order...' : 'Confirm Order'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default CheckoutModal;
