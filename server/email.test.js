import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendOrderNotification } from './email.js';
import { config } from './config.js';
import { Resend } from 'resend';

// Mock resend
vi.mock('resend', () => {
  const sendMock = vi.fn();
  return {
    Resend: vi.fn().mockImplementation(() => ({
      emails: {
        send: sendMock
      }
    }))
  };
});

describe('Email Service', () => {
  let sendMock;

  beforeEach(() => {
    vi.clearAllMocks();
    config.emailEnabled = 'true';
    // Get the mocked instance
    const resendInstance = new Resend();
    sendMock = resendInstance.emails.send;
    sendMock.mockResolvedValue({ data: { id: '123' }, error: null });
  });

  const dummyOrder = {
    id: 1,
    product_name: 'Test Saree',
    product_price: 1000,
    customer_name: 'John Doe',
    customer_email: 'john@example.com',
    customer_phone: '1234567890',
    customer_address: '123 Street',
    created_at: '2026-01-01T00:00:00Z'
  };

  it('success path calls emails.send', async () => {
    await sendOrderNotification(dummyOrder);
    expect(sendMock).toHaveBeenCalledTimes(1);
    const callArg = sendMock.mock.calls[0][0];
    expect(callArg.subject).toContain('Test Saree');
    expect(callArg.to).toContain(config.orderNotificationTo);
  });

  it('provider error/failure does not throw', async () => {
    sendMock.mockResolvedValue({ data: null, error: new Error('Provider error') });
    // Should not throw
    await expect(sendOrderNotification(dummyOrder)).resolves.not.toThrow();
  });

  it('EMAIL_ENABLED=false skips sending', async () => {
    config.emailEnabled = 'false';
    await sendOrderNotification(dummyOrder);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('HTML escaping prevents raw HTML/script injection', async () => {
    const maliciousOrder = {
      ...dummyOrder,
      customer_name: '<script>alert(1)</script>',
      customer_address: '<b>Bold</b>'
    };
    await sendOrderNotification(maliciousOrder);
    const callArg = sendMock.mock.calls[0][0];
    expect(callArg.html).not.toContain('<script>');
    expect(callArg.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(callArg.html).toContain('&lt;b&gt;Bold&lt;/b&gt;');
  });

  it('subject strips CR/LF', async () => {
    const orderWithCrLf = {
      ...dummyOrder,
      product_name: 'Test\r\nSaree\nNew'
    };
    await sendOrderNotification(orderWithCrLf);
    const callArg = sendMock.mock.calls[0][0];
    expect(callArg.subject).toContain('Test Saree New');
    expect(callArg.subject).not.toContain('\n');
    expect(callArg.subject).not.toContain('\r');
  });
});
