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
  const [orderId, setOrderId] = useState(null);

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
        setOrderId(result.id);
        // Do not auto-close, so user can see Order ID and click WhatsApp
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
            <h3>Order #{orderId} Placed Successfully!</h3>
            <p>We have received your request and will contact you shortly to confirm payment and delivery.</p>
            {import.meta.env.VITE_WHATSAPP_NUMBER ? (
              <a 
                href={`https://wa.me/${import.meta.env.VITE_WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi, I placed Order #${orderId} for ${product.name}. My name is ${formData.name}.`)}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '20px', backgroundColor: '#25D366', borderColor: '#25D366' }}
              >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.441-1.273.6-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.099.824z"/>
              </svg>
              Send Order Details on WhatsApp
              </a>
            ) : (
              <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '20px', textAlign: 'center' }}>
                WhatsApp not configured
              </div>
            )}
            <div style={{ marginTop: '20px' }}>
              <button onClick={onClose} className="btn" style={{ background: 'transparent', border: 'none', textDecoration: 'underline' }}>Close window</button>
            </div>
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
