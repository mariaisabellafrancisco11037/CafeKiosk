function clean(value) {
  return String(value ?? '').trim();
}

function getEmailConfig() {
  const apiKey = clean(process.env.RESEND_API_KEY);
  const fromEmail = clean(process.env.RESEND_FROM_EMAIL);
  const fromName = clean(process.env.RESEND_FROM_NAME) || 'CafeKiosk';

  return {
    provider: 'resend',
    apiKey,
    fromEmail,
    fromName,
    configured: Boolean(apiKey && fromEmail)
  };
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function isEmail(value) {
  return /^\S+@\S+\.\S+$/.test(clean(value));
}

function buildInvitationEmail({ cafeName, role, inviteUrl, expiresHours }) {
  const safeCafe = clean(cafeName) || 'your cafe';
  const safeRole = role === 'Manager' ? 'Manager' : 'Staff';
  const hours = Math.max(1, Number(expiresHours) || 48);

  const subject = `You're invited to join ${safeCafe} as ${safeRole}`;
  const text = [
    'Hello!',
    '',
    `You've been invited by the owner of ${safeCafe} to join their ${safeCafe} team.`,
    '',
    `Click the link below to accept your ${safeRole.toLowerCase()} invitation and set up your account:`,
    inviteUrl,
    '',
    `This invitation was sent to you because the administrator of ${safeCafe} added you as a ${safeRole.toLowerCase()} member.`,
    '',
    `This secure invitation expires in ${hours} hours and can only be used once.`,
    '',
    "If you weren't expecting this invitation, you can safely ignore this email.",
    '',
    'Thank you,',
    safeCafe,
    'Powered by CafeKiosk'
  ].join('\n');

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f5f1e8;font-family:Arial,Helvetica,sans-serif;color:#2f2a24">
  <div style="max-width:620px;margin:0 auto;padding:28px 16px">
    <div style="background:#ffffff;border:1px solid #e4dac8;border-radius:16px;overflow:hidden;box-shadow:0 10px 28px rgba(65,50,31,.08)">
      <div style="background:#234a3b;color:#ffffff;padding:24px 28px">
        <div style="font-size:13px;letter-spacing:.14em;text-transform:uppercase;opacity:.82">CafeKiosk Invitation</div>
        <div style="font-size:25px;font-weight:700;margin-top:6px">${escapeHtml(safeCafe)}</div>
      </div>

      <div style="padding:30px 28px">
        <p style="font-size:20px;font-weight:700;margin:0 0 18px">Hello!</p>

        <p style="font-size:16px;line-height:1.7;margin:0 0 18px">
          You've been invited by the owner of <strong>${escapeHtml(safeCafe)}</strong>
          to join their <strong>${escapeHtml(safeCafe)}</strong> team.
        </p>

        <p style="font-size:15px;line-height:1.65;margin:0 0 24px">
          Click the button below to accept your <strong>${escapeHtml(safeRole)}</strong> invitation and set up your account:
        </p>

        <div style="text-align:center;margin:30px 0">
          <a href="${escapeHtml(inviteUrl)}"
             style="display:inline-block;background:#234a3b;color:#ffffff;text-decoration:none;font-weight:700;padding:14px 24px;border-radius:10px;font-size:15px">
            Accept ${escapeHtml(safeRole)} Invitation
          </a>
        </div>

        <p style="font-size:15px;line-height:1.65;margin:0 0 18px">
          This invitation was sent to you because the administrator of
          <strong>${escapeHtml(safeCafe)}</strong> added you as a
          <strong>${escapeHtml(safeRole.toLowerCase())}</strong> member.
        </p>

        <p style="font-size:14px;line-height:1.6;color:#6f675f;margin:0 0 12px">
          This secure invitation expires in ${hours} hours and can only be used once.
        </p>

        <p style="font-size:14px;line-height:1.6;color:#6f675f;margin:0 0 22px">
          If you weren't expecting this invitation, you can safely ignore this email.
        </p>

        <div style="border-top:1px solid #eee5d8;padding-top:20px;margin-top:6px">
          <p style="font-size:14px;line-height:1.6;margin:0">
            Thank you,<br>
            <strong>${escapeHtml(safeCafe)}</strong><br>
            <span style="color:#8b8378">Powered by CafeKiosk</span>
          </p>
        </div>

        <p style="font-size:12px;line-height:1.55;color:#817970;margin:24px 0 0">
          If the button does not open, copy this secure link into your browser:<br>
          <span style="word-break:break-all">${escapeHtml(inviteUrl)}</span>
        </p>
      </div>
    </div>
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
      error: 'Resend email delivery is not configured. Add RESEND_API_KEY and RESEND_FROM_EMAIL in Railway Variables.'
    };
  }

  const to = clean(options?.to).toLowerCase();
  if (!isEmail(to)) {
    return {
      sent: false,
      configured: true,
      error: 'The invited Staff/Manager email address is invalid.'
    };
  }

  const content = buildInvitationEmail(options || {});
  const cafeName = clean(options?.cafeName) || config.fromName || 'CafeKiosk';
  const senderName = `${cafeName} via CafeKiosk`;
  const inviterEmail = clean(options?.inviterEmail).toLowerCase();

  const payload = {
    from: `${senderName} <${config.fromEmail}>`,
    to: [to],
    subject: content.subject,
    html: content.html,
    text: content.text
  };

  if (isEmail(inviterEmail)) {
    payload.reply_to = inviterEmail;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    let response;
    try {
      response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }

    let result = {};
    const raw = await response.text();
    if (raw) {
      try { result = JSON.parse(raw); } catch (_) { result = { message: raw }; }
    }

    if (!response.ok) {
      const providerMessage = clean(result?.message || result?.error || `Resend returned HTTP ${response.status}`);
      console.error('Staff invitation Resend delivery failed:', response.status, providerMessage);
      return {
        sent: false,
        configured: true,
        error: providerMessage.slice(0, 900)
      };
    }

    return {
      sent: true,
      configured: true,
      provider: 'resend',
      messageId: clean(result?.id)
    };
  } catch (error) {
    const message = error?.name === 'AbortError'
      ? 'Resend request timed out. Please try again.'
      : clean(error?.message || 'Unable to contact Resend.');
    console.error('Staff invitation Resend request failed:', message);
    return {
      sent: false,
      configured: true,
      error: message.slice(0, 900)
    };
  }
}

module.exports = {
  getEmailConfig,
  sendStaffInvitation,
  buildInvitationEmail
};
