import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';

const API_BASE = import.meta.env.MODE === 'development' ? 'http://localhost:3001' : '';

const formatPrice = (price) => {
  if (price == null) return 'N/A';
  const num = typeof price === 'string' ? parseFloat(price) : price;
  return num.toLocaleString('en-IN');
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const validateSelectedImageFiles = (files) => {
  if (files.length > 5) {
    return 'Maximum 5 images per product.';
  }

  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];

  for (const f of files) {
    if (f.size > 5 * 1024 * 1024) {
      return `"${f.name}" exceeds the 5 MB limit.`;
    }
    const ext = f.name.substring(f.name.lastIndexOf('.')).toLowerCase();
    if (!allowedExtensions.includes(ext) || !allowedMimes.includes(f.type)) {
      return `"${f.name}" is not an allowed image type. Use JPG, PNG, or WebP.`;
    }
  }
  return null;
};

// ─── Products Tab ───────────────────────────────────────────────
const ProductsTab = ({ token }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/products`, { credentials: 'include' });
      if (res.ok) setProducts(await res.json());
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);


  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await fetch(`${API_BASE}/api/products/${deleteTarget.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
    } catch (err) {
      console.error('Failed to delete product:', err);
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleEditSave = async (formData) => {
    const res = await fetch(`${API_BASE}/api/products/${editTarget.id}`, {
      method: 'PUT',
      credentials: 'include',
      body: formData,
    });
    if (res.ok) {
      await fetchProducts();
      setEditTarget(null);
    } else {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || data.error || 'Failed to update product.');
    }
  };

  if (loading) {
    return (
      <div className="admin-empty">
        <p>Loading products...</p>
      </div>
    );
  }

  const imgUrl = (url) =>
    url?.startsWith('http') ? url : `${API_BASE}${url}`;

  return (
    <>
      {products.length === 0 ? (
        <div className="admin-empty">
          <h3>No products yet</h3>
          <p>Add your first product in the "Add Product" tab.</p>
        </div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>
                    <img
                      className="admin-table-thumb"
                      src={imgUrl(p.image_url)}
                      alt={p.name}
                    />
                  </td>
                  <td>
                    <span className="admin-table-name">{p.name}</span>
                  </td>
                  <td>
                    <span className="admin-table-category">{p.category}</span>
                  </td>
                  <td>
                    <span className="admin-table-price">
                      ₹{formatPrice(p.price)}
                    </span>
                  </td>
                  <td>
                    <span className={`admin-table-stock ${p.stock <= 0 ? 'out-of-stock' : ''}`}>
                      {p.stock || 0}
                    </span>
                  </td>
                  <td>
                    <div className="admin-actions-cell">
                      <button
                        className="admin-action-btn edit"
                        onClick={() => setEditTarget(p)}
                        title="Edit"
                        aria-label={`Edit ${p.name}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        className="admin-action-btn delete"
                        onClick={() => setDeleteTarget(p)}
                        title="Delete"
                        aria-label={`Delete ${p.name}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="admin-confirm-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="admin-confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Product</h3>
            <p>
              Are you sure you want to delete <strong>{deleteTarget.name}</strong>?
              This action cannot be undone.
            </p>
            <div className="admin-confirm-actions">
              <button className="admin-confirm-cancel" onClick={() => setDeleteTarget(null)}>
                Cancel
              </button>
              <button className="admin-confirm-delete" onClick={handleDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editTarget && (
        <EditProductModal
          product={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={handleEditSave}
        />
      )}
    </>
  );
};

// ─── Edit Product Modal ─────────────────────────────────────────
const EditProductModal = ({ product, onClose, onSave }) => {
  const [name, setName] = useState(product.name);
  const [category, setCategory] = useState(product.category);
  const [price, setPrice] = useState(product.price);
  const [stock, setStock] = useState(product.stock || 0);
  const [description, setDescription] = useState(product.description || '');
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const errorMsg = validateSelectedImageFiles(files);
    if (errorMsg) {
      setUploadError(errorMsg);
      e.target.value = '';
      return;
    }
    setUploadError('');
    if (files.length > 0) {
      setImageFiles(files);
      setImagePreviews(files.map(f => URL.createObjectURL(f)));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setUploadError('');
    const formData = new FormData();
    formData.append('name', name);
    formData.append('category', category);
    formData.append('price', price);
    formData.append('stock', stock);
    formData.append('description', description);
    if (imageFiles && imageFiles.length > 0) {
      imageFiles.forEach(f => formData.append('images', f));
    }
    try {
      await onSave(formData);
    } catch (err) {
      setUploadError(err.message || 'Failed to update product.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-edit-overlay" onClick={onClose}>
      <div className="admin-edit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-edit-header">
          <h2>Edit Product</h2>
          <button className="admin-edit-close" onClick={onClose} aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form className="admin-form" onSubmit={handleSubmit}>
          <div className="admin-form-group">
            <label>Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="admin-form-row">
            <div className="admin-form-group">
              <label>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="saree">Saree</option>
                <option value="suit">Suit</option>
              </select>
            </div>
            <div className="admin-form-group">
              <label>Price (₹)</label>
              <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} required min="0" />
            </div>
            <div className="admin-form-group">
              <label>Stock</label>
              <input type="number" value={stock} onChange={(e) => setStock(e.target.value)} required min="0" />
            </div>
          </div>
          <div className="admin-form-group">
            <label>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows="3" />
          </div>
          <div className="admin-form-group">
            <label>Change Images</label>
            <div className="admin-image-upload">
              <input type="file" accept=".jpg,.jpeg,.png,.webp" multiple onChange={handleImageChange} />
              <div className="admin-image-upload-icon">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                </svg>
              </div>
              <p>Click to upload new images</p>
              <p className="upload-hint">JPG, PNG, or WebP · Max 5 MB per file · Up to 5 images</p>
            </div>
            {uploadError && <p style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '8px' }}>{uploadError}</p>}
            {imagePreviews && imagePreviews.length > 0 && (
              <div className="admin-image-preview-container" style={{ display: 'flex', gap: '10px', marginTop: '15px', overflowX: 'auto' }}>
                {imagePreviews.map((preview, idx) => (
                  <div key={idx} className="admin-image-preview" style={{ position: 'relative', width: '100px', height: '100px' }}>
                    <img src={preview} alt={`Preview ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }} />
                  </div>
                ))}
                <button
                  type="button"
                  className="admin-image-preview-remove"
                  style={{ position: 'static', margin: 'auto 10px' }}
                  onClick={() => {
                    setImageFiles([]);
                    setImagePreviews([]);
                  }}
                >
                  Clear All
                </button>
              </div>
            )}
          </div>
          <button type="submit" className="admin-form-submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
};

// ─── Orders Tab ─────────────────────────────────────────────────
const OrdersTab = ({ token }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editOrder, setEditOrder] = useState(null);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/orders`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setOrders(data);
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleEditOrderSave = async (orderId, updates) => {
    try {
      await fetch(`${API_BASE}/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updates),
      });
      await fetchOrders(); // refresh orders
      setEditOrder(null);
    } catch (err) {
      console.error('Failed to update order:', err);
    }
  };

  if (loading) {
    return (
      <div className="admin-empty">
        <p>Loading orders...</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="admin-empty">
        <h3>No orders yet</h3>
        <p>Orders will appear here when customers place them.</p>
      </div>
    );
  }

  return (
    <div className="admin-table-wrapper">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Order #</th>
            <th>Customer</th>
            <th>Phone</th>
            <th>Product</th>
            <th>Price</th>
            <th>Status</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td>#{order.id}</td>
              <td>{order.customer_name}</td>
              <td>{order.customer_phone}</td>
              <td>
                <span className="admin-table-name">{order.product_name}</span>
              </td>
              <td>
                <span className="admin-table-price">
                  ₹{formatPrice(order.product_price)}
                </span>
              </td>
              <td>
                <span className={`admin-status-badge ${order.status || 'new'}`}>
                  {(order.status || 'new').toUpperCase()}
                </span>
              </td>
              <td>{formatDate(order.created_at)}</td>
              <td>
                <button
                  className="admin-action-btn edit"
                  onClick={() => setEditOrder(order)}
                  title="Edit Order"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editOrder && (
        <EditOrderModal
          order={editOrder}
          onClose={() => setEditOrder(null)}
          onSave={handleEditOrderSave}
        />
      )}
    </div>
  );
};

// ─── Edit Order Modal ───────────────────────────────────────────
const EditOrderModal = ({ order, onClose, onSave }) => {
  const [status, setStatus] = useState(order.status || 'new');
  const [paymentStatus, setPaymentStatus] = useState(order.payment_status || 'pending');
  const [paymentMode, setPaymentMode] = useState(order.payment_mode || '');
  const [paymentRef, setPaymentRef] = useState(order.payment_reference || '');
  const [tracking, setTracking] = useState(order.tracking_details || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave(order.id, {
      status,
      payment_status: paymentStatus,
      payment_mode: paymentMode,
      payment_reference: paymentRef,
      tracking_details: tracking,
    });
    setSaving(false);
  };

  return (
    <div className="admin-edit-overlay" onClick={onClose}>
      <div className="admin-edit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-edit-header">
          <h2>Update Order #{order.id}</h2>
          <button className="admin-edit-close" onClick={onClose} aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form className="admin-form" onSubmit={handleSubmit}>
          <div className="admin-form-group">
            <label>Order Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="new">New</option>
              <option value="confirmed">Confirmed (Payment Received)</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          
          <div className="admin-form-group">
            <label>Payment Status</label>
            <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>

          <div className="admin-form-group">
            <label>Payment Mode</label>
            <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
              <option value="">Select mode...</option>
              <option value="UPI">UPI</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cash">Cash / COD</option>
            </select>
          </div>
          
          <div className="admin-form-group">
            <label>Payment Reference / Notes</label>
            <input 
              type="text" 
              placeholder="e.g. UPI Ref: 1234567890" 
              value={paymentRef} 
              onChange={(e) => setPaymentRef(e.target.value)} 
            />
          </div>

          <div className="admin-form-group">
            <label>Courier Tracking Details</label>
            <input 
              type="text" 
              placeholder="e.g. DTDC Tracking ID: D1234" 
              value={tracking} 
              onChange={(e) => setTracking(e.target.value)} 
            />
          </div>

          <button type="submit" className="admin-form-submit" disabled={saving}>
            {saving ? 'Saving...' : 'Update Order'}
          </button>
        </form>
      </div>
    </div>
  );
};

// ─── Add Product Tab ────────────────────────────────────────────
const AddProductTab = ({ token, onAdded }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('saree');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState(1);
  const [description, setDescription] = useState('');
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const errorMsg = validateSelectedImageFiles(files);
    if (errorMsg) {
      setMessage({ type: 'error', text: errorMsg });
      e.target.value = '';
      return;
    }
    setMessage({ type: '', text: '' });
    if (files.length > 0) {
      setImageFiles(files);
      setImagePreviews(files.map(f => URL.createObjectURL(f)));
    }
  };

  const resetForm = () => {
    setName('');
    setCategory('saree');
    setPrice('');
    setStock(1);
    setDescription('');
    setImageFiles([]);
    setImagePreviews([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ type: '', text: '' });

    const formData = new FormData();
    formData.append('name', name);
    formData.append('category', category);
    formData.append('price', price);
    formData.append('stock', stock);
    formData.append('description', description);
    if (imageFiles && imageFiles.length > 0) {
      imageFiles.forEach(f => formData.append('images', f));
    }

    try {
      const res = await fetch(`${API_BASE}/api/products`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Product added successfully!' });
        resetForm();
        if (onAdded) onAdded();
        setTimeout(() => setMessage({ type: '', text: '' }), 4000);
      } else {
        const data = await res.json();
        setMessage({
          type: 'error',
          text: data.message || data.error || 'Failed to add product.',
        });
      }
    } catch (err) {
      console.error('Failed to add product:', err);
      setMessage({ type: 'error', text: 'Unable to connect to server.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-form-card">
      <h2>Add New Product</h2>
      <p className="form-subtitle">Fill in the details to add a new product to your store.</p>

      <form className="admin-form" onSubmit={handleSubmit}>
        <div className="admin-form-group">
          <label htmlFor="add-name">Product Name</label>
          <input
            id="add-name"
            type="text"
            placeholder="e.g., Royal Blue Banarasi Silk Saree"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="admin-form-row">
          <div className="admin-form-group">
            <label htmlFor="add-category">Category</label>
            <select
              id="add-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="saree">Saree</option>
              <option value="suit">Suit</option>
            </select>
          </div>
          <div className="admin-form-group">
            <label htmlFor="add-price">Price (₹)</label>
            <input
              id="add-price"
              type="number"
              placeholder="12999"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              min="0"
            />
          </div>
          <div className="admin-form-group">
            <label htmlFor="add-stock">Stock</label>
            <input
              id="add-stock"
              type="number"
              placeholder="5"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              required
              min="0"
            />
          </div>
        </div>

        <div className="admin-form-group">
          <label htmlFor="add-desc">Description</label>
          <textarea
            id="add-desc"
            placeholder="Describe the product — material, design, occasion..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows="4"
          />
        </div>

        <div className="admin-form-group">
          <label>Product Images (First image is main)</label>
          <div className="admin-image-upload">
            <input type="file" accept=".jpg,.jpeg,.png,.webp" multiple onChange={handleImageChange} />
            <div className="admin-image-upload-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <p>Click to select multiple images</p>
            <p className="upload-hint">JPG, PNG, or WebP · Max 5 MB per file · Select up to 5 images</p>
          </div>
          {imagePreviews && imagePreviews.length > 0 && (
            <div className="admin-image-preview-container" style={{ display: 'flex', gap: '10px', marginTop: '15px', overflowX: 'auto' }}>
              {imagePreviews.map((preview, idx) => (
                <div key={idx} className="admin-image-preview" style={{ position: 'relative', width: '100px', height: '100px' }}>
                  <img src={preview} alt={`Preview ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }} />
                </div>
              ))}
              <button
                type="button"
                className="admin-image-preview-remove"
                style={{ position: 'static', margin: 'auto 10px' }}
                onClick={() => {
                  setImageFiles([]);
                  setImagePreviews([]);
                }}
              >
                Clear All
              </button>
            </div>
          )}
        </div>

        {message.text && (
          <div className={message.type === 'success' ? 'admin-success-msg' : 'admin-error-msg'}>
            {message.text}
          </div>
        )}

        <button type="submit" className="admin-form-submit" disabled={submitting}>
          {submitting ? 'Adding Product...' : 'Add Product'}
        </button>
      </form>
    </div>
  );
};

// ─── Main Dashboard ─────────────────────────────────────────────
const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('products');
  const [token, setToken] = useState('');
  const [summary, setSummary] = useState(null);

  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Fetch summary
    fetch(`${API_BASE}/api/summary`, {
      credentials: 'include'
    })
    .then(res => {
      if (res.status === 401) {
        navigate('/admin');
        throw new Error('Unauthorized');
      }
      return res.json();
    })
    .then(data => {
      setSummary(data);
      setIsAuthenticated(true);
    })
    .catch(err => console.error('Failed to fetch summary:', err));
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch (e) {
      console.error(e);
    }
    navigate('/');
  };

  if (!isAuthenticated) return null;

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <header className="admin-header">
        <div className="admin-header-inner">
          <div className="admin-header-left">
            <span className="admin-header-brand">PurviSurbhi</span>
            <span className="admin-header-badge">Admin</span>
          </div>
          <button className="admin-logout-btn" onClick={handleLogout}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="admin-tabs">
        <div className="admin-tabs-inner">
          <button
            className={`admin-tab-btn ${activeTab === 'products' ? 'active' : ''}`}
            onClick={() => setActiveTab('products')}
          >
            Products
          </button>
          <button
            className={`admin-tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            Orders
          </button>
          <button
            className={`admin-tab-btn ${activeTab === 'add' ? 'active' : ''}`}
            onClick={() => setActiveTab('add')}
          >
            Add Product
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="admin-content">
        {summary && (
          <div className="admin-summary-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
            <div className="summary-card" style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#666', fontSize: '0.9rem', textTransform: 'uppercase' }}>Total Products</h3>
              <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>{summary.totalProducts}</p>
            </div>
            <div className="summary-card" style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#666', fontSize: '0.9rem', textTransform: 'uppercase' }}>Out of Stock</h3>
              <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent-color)' }}>{summary.outOfStock}</p>
            </div>
            <div className="summary-card" style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#666', fontSize: '0.9rem', textTransform: 'uppercase' }}>New Orders</h3>
              <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', color: '#f59e0b' }}>{summary.newOrders}</p>
            </div>
            <div className="summary-card" style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#666', fontSize: '0.9rem', textTransform: 'uppercase' }}>Confirmed Orders</h3>
              <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>{summary.confirmedOrders}</p>
            </div>
          </div>
        )}
        {activeTab === 'products' && <ProductsTab token={token} />}
        {activeTab === 'orders' && <OrdersTab token={token} />}
        {activeTab === 'add' && (
          <AddProductTab
            token={token}
            onAdded={() => setActiveTab('products')}
          />
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
