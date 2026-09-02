const nodemailer = require("nodemailer");

let cachedTransporter;

const getTransporter = () => {
  if (cachedTransporter !== undefined) {
    return cachedTransporter;
  }

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    cachedTransporter = null;
    return cachedTransporter;
  }

  cachedTransporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  return cachedTransporter;
};

// Falls back to logging the link when SMTP isn't configured (local/dev use)
// instead of failing the request, since forgot-password must not error out.
const sendPasswordResetEmail = async ({ to, resetUrl }) => {
  const transporter = getTransporter();

  if (!transporter) {
    console.warn(`[mailer] SMTP is not configured. Password reset link for ${to}: ${resetUrl}`);
    return;
  }

  await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject: "Reset your Handdy password",
    text: `We received a request to reset your password. This link expires in 1 hour.\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
    html: `<p>We received a request to reset your password. This link expires in 1 hour.</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you did not request this, you can ignore this email.</p>`,
  });
};

module.exports = { sendPasswordResetEmail };
