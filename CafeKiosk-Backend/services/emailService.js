const nodemailer = require('nodemailer');

let cachedTransporter = null;
let cachedFingerprint = '';

function clean(value) {
  return String(value ?? '').trim();
}

function envBool(value, fallback = false) {
  const text = clean(value).toLowerCase();
  if (!text) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(text);
}

function getEmailConfig() {
  const host = clean(process.env.SMTP_HOST);
  const port = Number(process.env.SMTP_PORT || 465);
  const user = clean(process.env.SMTP_USER);
  const pass = String(process.env.SMTP_PASS || '');
  const secure = envBool(process.env.SMTP_SECURE, port === 465);
  const fromEmail = clean(process.env.SMTP_FROM_EMAIL) || user;
  const fromName = clean(process.env.SMTP_FROM_NAME) || 'CafeKiosk';
  const replyTo = clean(process.env.SMTP_REPLY_TO);

  return {
    host,
    port: Number.isFinite(port) && port > 0 ? port : 465,
    secure,
    user,
    pass,
    fromEmail,
    fromName,
    replyTo,
    configured: Boolean(host && user && pass && fromEmail)
  };
}

function getTransporter() {
  const config = getEmailConfig();
  if (!config.configured) return null;

  const fingerprint = [
    config.host,
    config.port,
    config.secure,
    config.user,
    config.pass,
    config.fromEmail
  ].join('|');

  if (cachedTransporter && cachedFingerprint === fingerprint) return cachedTransporter;

  cachedTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000
  });
  cachedFingerprint = fingerprint;
  return cachedTransporter;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildInvitationEmail({ cafeName, role, inviteUrl, expiresHours, inviterName }) {
  const safeCafe = clean(cafeName) || 'your cafe';
  const safeRole = role === 'Manager' ? 'Manager' : 'Staff';
  const safeInviter = clean(inviterName) || 'your cafe owner';
  const hours = Math.max(1, Number(expiresHours) || 48);

  const subject = `${safeCafe} invited you to join CafeKiosk as ${safeRole}`;
  const text = [
    `You have been invited by ${safeInviter} to join ${safeCafe} on CafeKiosk as ${safeRole}.`,
    '',
    'Create your account using this secure invitation link:',
    inviteUrl,
    '',
    `This invitation expires in ${hours} hours and can only be used once.`,
    'If you were not expecting this invitation, you can ignore this email.'
  ].join('\n');

  const html = `<!doctype html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f5f1e8;font-family:Arial,Helvetica,sans-serif;color:#2f2a24">
  <div style="max-width:620px;margin:0 auto;padding:28px 16px">
    <div style="background:#ffffff;border:1px solid #e4dac8;border-radius:16px;overflow:hidden;box-shadow:0 10px 28px rgba(65,50,31,.08)">
      <div style="background:#234a3b;color:#ffffff;padding:24px 28px">
        <div style="font-size:13px;letter-spacing:.14em;text-transform:uppercase;opacity:.82">CafeKiosk Invitation</div>
        <div style="font-size:25px;font-weight:700;margin-top:6px">${escapeHtml(safeCafe)}</div>
      </div>
      <div style="padding:28px">
        <p style="font-size:16px;line-height:1.65;margin:0 0 16px">You have been invited by <strong>${escapeHtml(safeInviter)}</strong> to join <strong>${escapeHtml(safeCafe)}</strong> as <strong>${escapeHtml(safeRole)}</strong>.</p>
        <p style="font-size:15px;line-height:1.6;margin:0 0 24px">Use the button below to create your CafeKiosk account. The email address receiving this message is the email that will be linked to the account.</p>
        <div style="text-align:center;margin:28px 0">
          <a href="${escapeHtml(inviteUrl)}" style="display:inline-block;background:#234a3b;color:#ffffff;text-decoration:none;font-weight:700;padding:13px 22px;border-radius:10px">Create ${escapeHtml(safeRole)} Account</a>
        </div>
        <p style="font-size:13px;line-height:1.55;color:#6f675f;margin:0 0 8px">This invitation expires in ${hours} hours and can only be used once.</p>
        <p style="font-size:12px;line-height:1.55;color:#817970;margin:0">If the button does not open, copy this link into your browser:<br><span style="word-break:break-all">${escapeHtml(inviteUrl)}</span></p>
      </div>
    </div>
    <p style="text-align:center;font-size:12px;color:#8b8378;margin:16px 0 0">If you were not expecting this invitation, you can safely ignore this email.</p>
  </div>
</body>
</html>`;

  return { subject, text, html };
}

async function sendStaffInvitation(options) {
  const config = getEmailConfig();
  if (!config.configured) {
    return {
      sent: false,
      configured: false,
      error: 'Email delivery is not configured. Add SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and SMTP_FROM_EMAIL in Railway Variables.'
    };
  }

  const transporter = getTransporter();
  const content = buildInvitationEmail(options);

  try {
    const info = await transporter.sendMail({
      from: { name: config.fromName, address: config.fromEmail },
      to: options.to,
      replyTo: config.replyTo || undefined,
      subject: content.subject,
      text: content.text,
      html: content.html
    });

    return {
      sent: true,
      configured: true,
      messageId: info?.messageId || ''
    };
  } catch (error) {
    console.error('Staff invitation email delivery failed:', error?.code || error?.message || error);
    return {
      sent: false,
      configured: true,
      error: clean(error?.response || error?.message || 'Email provider rejected the invitation message.').slice(0, 900)
    };
  }
}

module.exports = {
  getEmailConfig,
  sendStaffInvitation,
  buildInvitationEmail
};
