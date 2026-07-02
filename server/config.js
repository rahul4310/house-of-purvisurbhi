import dotenv from 'dotenv';
dotenv.config();

function requireEnv(key) {
  const value = process.env[key];
  if (!value) {
    if (process.env.NODE_ENV === 'test') {
      // In test environment, return a dummy value to prevent crashing
      return `test-${key.toLowerCase()}`;
    }
    console.error(`FATAL ERROR: Environment variable ${key} is not set.`);
    process.exit(1);
  }
  return value;
}

export const config = {
  adminPassword: requireEnv('ADMIN_PASSWORD'),
  adminToken: requireEnv('ADMIN_TOKEN'),
  sessionSecret: requireEnv('SESSION_SECRET'),
  resendApiKey: requireEnv('RESEND_API_KEY'),
  emailFrom: requireEnv('EMAIL_FROM'),
  orderNotificationTo: requireEnv('ORDER_NOTIFICATION_TO'),
  orderNotificationReplyTo: process.env.ORDER_NOTIFICATION_REPLY_TO || null,
  emailEnabled: process.env.EMAIL_ENABLED || 'true',
  allowedOrigin: process.env.NODE_ENV === 'production' ? requireEnv('ALLOWED_ORIGIN') : (process.env.ALLOWED_ORIGIN || null),
};
