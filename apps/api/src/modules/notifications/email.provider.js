const nodemailer = require('nodemailer');
const logger = require('../../config/logger');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!process.env.SMTP_HOST) {
    return null; // unconfigured — caller falls back to logging
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
  });

  return transporter;
}

/**
 * Sends an email if SMTP is configured; otherwise logs it. This means
 * the whole app runs and is testable with zero email setup, and becomes
 * "real" the moment SMTP_HOST etc. are set — no code changes needed,
 * consistent with the "any provider via standard SMTP" approach (works
 * with SES, Postmark, Mailgun, Zoho, etc.).
 */
async function sendEmail({ to, subject, text, html }) {
  const client = getTransporter();

  if (!client) {
    logger.info('Email not sent — SMTP not configured (stub)', { to, subject });
    return { sent: false, stub: true };
  }

  try {
    await client.sendMail({
      from: process.env.SMTP_FROM || 'AdStream <no-reply@adstream.example.com>',
      to,
      subject,
      text,
      html: html || undefined,
    });
    return { sent: true };
  } catch (err) {
    logger.error('Failed to send email', { to, subject, error: err.message });
    return { sent: false, error: err.message };
  }
}

module.exports = { sendEmail };
