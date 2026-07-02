import { Resend } from 'resend';
import { config } from './config.js';

let _resend;
function getResend() {
  if (!_resend) _resend = new Resend(config.resendApiKey);
  return _resend;
}

function escapeHtml(unsafe) {
  if (unsafe == null) return '';
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function stripCrLf(unsafe) {
  if (unsafe == null) return '';
  return String(unsafe).replace(/[\r\n]+/g, ' ').trim();
}

export async function sendOrderNotification(order) {
  if (config.emailEnabled !== 'true') return;

  try {
    const cleanProductName = stripCrLf(order.product_name);
    const { error } = await getResend().emails.send({
      from: config.emailFrom,
      to: [config.orderNotificationTo],
      replyTo: config.orderNotificationReplyTo || undefined,
      subject: `New Order #${order.id} — ${cleanProductName}`,
      text: `
New order received!

Order ID:  ${order.id}
Product:   ${order.product_name}
Price:     ₹${order.product_price ? order.product_price.toLocaleString('en-IN') : 'N/A'}

Customer Details:
  Name:    ${order.customer_name}
  Email:   ${order.customer_email || 'Not provided'}
  Phone:   ${order.customer_phone}
  Address: ${order.customer_address}

Placed at: ${order.created_at}
      `.trim(),
      html: `
        <h2>New order received!</h2>
        <p><strong>Order ID:</strong> ${escapeHtml(order.id)}</p>
        <p><strong>Product:</strong> ${escapeHtml(order.product_name)}</p>
        <p><strong>Price:</strong> ₹${escapeHtml(order.product_price ? order.product_price.toLocaleString('en-IN') : 'N/A')}</p>

        <h3>Customer Details:</h3>
        <ul>
          <li><strong>Name:</strong> ${escapeHtml(order.customer_name)}</li>
          <li><strong>Email:</strong> ${escapeHtml(order.customer_email || 'Not provided')}</li>
          <li><strong>Phone:</strong> ${escapeHtml(order.customer_phone)}</li>
          <li><strong>Address:</strong> ${escapeHtml(order.customer_address)}</li>
        </ul>

        <p><small>Placed at: ${escapeHtml(order.created_at)}</small></p>
      `
    });

    if (error) {
      console.error('Order notification email failed', {
        orderId: order.id,
        provider: 'resend',
        message: error?.message || 'Unknown provider error',
      });
    } else {
      console.log(`Order email sent for order #${order.id}`);
    }
  } catch (err) {
    console.error('Order notification email threw', {
      orderId: order.id,
      provider: 'resend',
      message: err?.message || 'Unknown error',
    });
  }
}
