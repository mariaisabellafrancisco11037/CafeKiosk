const tls = require('tls');
function clean(value) {
  return String(value ?? '').trim();
}

function getEmailConfig() {
  const smtpHost = clean(process.env.SMTP_HOST);
  const smtpPort = Number(process.env.SMTP_PORT || 465);
  const smtpSecure = String(process.env.SMTP_SECURE || 'true').toLowerCase() !== 'false';
  const smtpUser = clean(process.env.SMTP_USER);
  const smtpPass = clean(process.env.SMTP_PASS).replace(/\s+/g, '');
  const smtpFromEmail = clean(process.env.SMTP_FROM_EMAIL || smtpUser);
  const smtpFromName = clean(process.env.SMTP_FROM_NAME) || 'CafeKiosk';
  const apiKey = clean(process.env.RESEND_API_KEY);
  const fromEmail = clean(process.env.RESEND_FROM_EMAIL);
  const fromName = clean(process.env.RESEND_FROM_NAME) || 'CafeKiosk';
  const smtpConfigured = Boolean(smtpHost && smtpUser && smtpPass && smtpFromEmail && smtpSecure && smtpPort === 465);
  return { provider: smtpConfigured ? 'smtp' : 'resend', smtpHost, smtpPort, smtpSecure, smtpUser, smtpPass, smtpFromEmail, smtpFromName, apiKey, fromEmail, fromName, configured: smtpConfigured || Boolean(apiKey && fromEmail) };
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

function buildPasswordResetEmail({ cafeName, fullName, role, resetUrl, expiresMinutes }) {
  const safeCafe = clean(cafeName) || 'CafeKiosk';
  const safeName = clean(fullName) || 'CafeKiosk user';
  const safeRole = clean(role) || 'User';
  const minutes = Math.max(5, Number(expiresMinutes) || 30);
  const subject = `Reset your ${safeCafe} CafeKiosk password`;

  const text = [
    `Hello ${safeName}!`,
    '',
    `We received a request to reset the password for your ${safeRole} account at ${safeCafe}.`,
    '',
    'Use the secure link below to create a new password:',
    resetUrl,
    '',
    `This link expires in ${minutes} minutes and can only be used once.`,
    '',
    'If you did not request a password reset, you can safely ignore this email. Your current password will remain unchanged.',
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
        <div style="font-size:13px;letter-spacing:.14em;text-transform:uppercase;opacity:.82">CafeKiosk Password Recovery</div>
        <div style="font-size:25px;font-weight:700;margin-top:6px">${escapeHtml(safeCafe)}</div>
      </div>
      <div style="padding:30px 28px">
        <p style="font-size:20px;font-weight:700;margin:0 0 18px">Hello ${escapeHtml(safeName)}!</p>
        <p style="font-size:15px;line-height:1.7;margin:0 0 18px">
          We received a request to reset the password for your
          <strong>${escapeHtml(safeRole)}</strong> account at <strong>${escapeHtml(safeCafe)}</strong>.
        </p>
        <p style="font-size:15px;line-height:1.65;margin:0 0 24px">
          Click the secure button below to create a new password:
        </p>
        <div style="text-align:center;margin:30px 0">
          <a href="${escapeHtml(resetUrl)}"
             style="display:inline-block;background:#234a3b;color:#ffffff;text-decoration:none;font-weight:700;padding:14px 24px;border-radius:10px;font-size:15px">
            Reset Password
          </a>
        </div>
        <p style="font-size:14px;line-height:1.65;color:#6f675f;margin:0 0 12px">
          This secure password-reset link expires in <strong>${minutes} minutes</strong> and can only be used once.
        </p>
        <p style="font-size:14px;line-height:1.65;color:#6f675f;margin:0 0 22px">
          If you did not request a password reset, you can safely ignore this email. Your current password will remain unchanged.
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
          <span style="word-break:break-all">${escapeHtml(resetUrl)}</span>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;

  return { subject, text, html };
}

function smtpDotStuff(value) { return String(value || '').replace(/\r?\n/g, '\r\n').replace(/^\./gm, '..'); }
async function sendSmtpEmail({ to, subject, html, text, senderName, replyTo }) {
  const c = getEmailConfig();
  if (c.provider !== 'smtp') return { sent:false, configured:false, error:'Gmail SMTP is not configured.' };
  const recipient=clean(to).toLowerCase(); if(!isEmail(recipient)) return {sent:false,configured:true,error:'The recipient email address is invalid.'};
  return new Promise(resolve => {
    let socket, buffer='', queue=[], settled=false;
    const finish=v=>{if(settled)return;settled=true;try{socket?.end()}catch(_){}resolve(v)};
    const next=(expect,cmd)=>new Promise((res,rej)=>{queue.push({expect,res,rej});if(cmd)socket.write(cmd+'\r\n')});
    function pump(){while(queue.length){const m=buffer.match(/(?:^|\r\n)(\d{3})([- ])([^\r\n]*)(?:\r\n|$)/g);if(!m||!m.length)return;const lines=buffer.split('\r\n');let last='';for(let i=0;i<lines.length;i++){if(/^\d{3} /.test(lines[i]))last=lines[i]}if(!last)return;const code=Number(last.slice(0,3));buffer='';const q=queue.shift();if(!q)return;if(q.expect.includes(code)){q.res(code)}else q.rej(new Error('SMTP '+last));}}
    try{socket=tls.connect({host:c.smtpHost,port:c.smtpPort,servername:c.smtpHost,rejectUnauthorized:true},()=>{});socket.setTimeout(20000);socket.on('data',d=>{buffer+=d.toString('utf8');pump()});socket.on('timeout',()=>finish({sent:false,configured:true,error:'SMTP connection timed out.'}));socket.on('error',e=>finish({sent:false,configured:true,error:e.message}));
      (async()=>{try{
        await next([220]); await next([250],`EHLO cafekiosk`); await next([334],'AUTH LOGIN'); await next([334],Buffer.from(c.smtpUser).toString('base64')); await next([235],Buffer.from(c.smtpPass).toString('base64')); await next([250],`MAIL FROM:<${c.smtpFromEmail}>`); await next([250,251],`RCPT TO:<${recipient}>`); await next([354],'DATA');
        const fromName=clean(senderName)||c.smtpFromName; const headers=[`From: ${fromName} <${c.smtpFromEmail}>`,`To: <${recipient}>`,`Subject: ${clean(subject)}`,`MIME-Version: 1.0`,`Content-Type: multipart/alternative; boundary=ck_${Date.now()}`]; if(isEmail(replyTo))headers.push(`Reply-To: ${clean(replyTo).toLowerCase()}`); const b='ck_'+Date.now(); headers[headers.length-1]=`Content-Type: multipart/alternative; boundary=${b}`;
        const msg=headers.join('\r\n')+'\r\n\r\n'+`--${b}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n${smtpDotStuff(text)}\r\n--${b}\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n${smtpDotStuff(html)}\r\n--${b}--\r\n.`;
        await next([250],msg); await next([221],'QUIT').catch(()=>{}); finish({sent:true,configured:true,provider:'gmail-smtp'});
      }catch(e){finish({sent:false,configured:true,error:e.message})}})();
    }catch(e){finish({sent:false,configured:true,error:e.message})}
  });
}

async function sendResendEmail({ to, subject, html, text, senderName, replyTo }) {
  const config = getEmailConfig();
  if (!config.configured) {
    return {
      sent: false,
      configured: false,
      error: 'Resend email delivery is not configured. Add RESEND_API_KEY and RESEND_FROM_EMAIL in Railway Variables.'
    };
  }

  const recipient = clean(to).toLowerCase();
  if (!isEmail(recipient)) {
    return { sent: false, configured: true, error: 'The recipient email address is invalid.' };
  }

  const payload = {
    from: `${clean(senderName) || config.fromName} <${config.fromEmail}>`,
    to: [recipient],
    subject: clean(subject),
    html: String(html || ''),
    text: String(text || '')
  };

  if (isEmail(replyTo)) payload.reply_to = clean(replyTo).toLowerCase();

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
      return { sent: false, configured: true, error: providerMessage.slice(0, 900) };
    }

    return { sent: true, configured: true, provider: 'resend', messageId: clean(result?.id) };
  } catch (error) {
    const message = error?.name === 'AbortError'
      ? 'Resend request timed out. Please try again.'
      : clean(error?.message || 'Unable to contact Resend.');
    return { sent: false, configured: true, error: message.slice(0, 900) };
  }
}

function buildCafeRegistrationNotification(options = {}) {
  const cafeName=clean(options.cafeName)||'New Cafe', ownerName=clean(options.ownerName)||'Cafe Owner', ownerEmail=clean(options.ownerEmail), ownerPhone=clean(options.ownerPhone), cafeId=clean(options.cafeId);
  const subject=`CafeKiosk approval required: ${cafeName}`;
  const text=['A new cafe owner registration is waiting for System Administrator approval.','',`Cafe: ${cafeName}`,`Cafe ID: ${cafeId}`,`Owner: ${ownerName}`,`Email: ${ownerEmail}`,`Phone: ${ownerPhone}`,'','Open the CafeKiosk System Administrator dashboard and review the Approvals section.','This email is a notification only. Registration is NOT approved automatically.'].join('\n');
  const html=`<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;background:#f5f1e8;padding:24px;color:#2f2a24"><div style="max-width:620px;margin:auto;background:white;border:1px solid #e4dac8;border-radius:16px;overflow:hidden"><div style="background:#234a3b;color:white;padding:22px 26px"><strong style="font-size:22px">New Cafe Registration</strong></div><div style="padding:26px"><p>A new cafe owner registration is waiting for <strong>System Administrator approval</strong>.</p><p><strong>Cafe:</strong> ${escapeHtml(cafeName)}<br><strong>Cafe ID:</strong> ${escapeHtml(cafeId)}<br><strong>Owner:</strong> ${escapeHtml(ownerName)}<br><strong>Email:</strong> ${escapeHtml(ownerEmail)}<br><strong>Phone:</strong> ${escapeHtml(ownerPhone)}</p><p>Open CafeKiosk → System Administrator → Approvals to review the request.</p><p style="color:#7a6e61;font-size:13px"><strong>Important:</strong> this email does not approve the cafe automatically.</p></div></div></body></html>`;
  return {subject,text,html};
}

async function sendCafeRegistrationNotification(options={}) {
  const recipient=clean(process.env.SYSTEM_ADMIN_NOTIFICATION_EMAIL||process.env.SYSTEM_ADMIN_EMAIL);
  if(!recipient) return {sent:false,configured:false,error:'SYSTEM_ADMIN_NOTIFICATION_EMAIL is not configured.'};
  const content=buildCafeRegistrationNotification(options);
  const config=getEmailConfig();
  if(config.provider==='smtp') return sendSmtpEmail({to:recipient,subject:content.subject,html:content.html,text:content.text,senderName:'CafeKiosk System'});
  return sendResendEmail({to:recipient,subject:content.subject,html:content.html,text:content.text,senderName:'CafeKiosk System'});
}

function buildCafeApprovalEmail(options = {}) {
  const cafeName = clean(options.cafeName) || 'Your Cafe';
  const ownerName = clean(options.ownerName) || 'Cafe Owner';
  const loginUrl = clean(options.loginUrl) || '';
  const subject = `Your CafeKiosk registration is approved - ${cafeName}`;
  const text = [
    `Hello ${ownerName},`, '',
    `Your CafeKiosk registration for ${cafeName} has been approved by the System Administrator.`,
    'You can now sign in using the account credentials you created during registration.',
    loginUrl ? `Sign in: ${loginUrl}` : '', '',
    'If you did not create this account, please contact the CafeKiosk administrator.', '',
    'Powered by CafeKiosk'
  ].filter(Boolean).join('\n');
  const loginButton = loginUrl ? `<p style="margin:24px 0"><a href="${escapeHtml(loginUrl)}" style="display:inline-block;background:#4f9872;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:700">Sign in to CafeKiosk</a></p>` : '';
  const html = `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;background:#f5f1e8;padding:24px;color:#2f2a24"><div style="max-width:620px;margin:auto;background:#fff;border:1px solid #e4dac8;border-radius:16px;overflow:hidden"><div style="background:#4f9872;color:#fff;padding:22px 26px"><strong style="font-size:22px">Cafe Account Approved</strong></div><div style="padding:26px"><p>Hello ${escapeHtml(ownerName)},</p><p>Your CafeKiosk registration for <strong>${escapeHtml(cafeName)}</strong> has been approved by the System Administrator.</p><p>You can now sign in using the account credentials you created during registration.</p>${loginButton}<p style="color:#7a6e61;font-size:13px">If you did not create this account, please contact the CafeKiosk administrator.</p><p style="margin-top:24px"><strong>Powered by CafeKiosk</strong></p></div></div></body></html>`;
  return { subject, text, html };
}

async function sendCafeApprovalEmail(options = {}) {
  const recipient = clean(options.to).toLowerCase();
  if (!isEmail(recipient)) return { sent:false, configured:getEmailConfig().configured, error:'The cafe owner email address is invalid.' };
  const content = buildCafeApprovalEmail(options);
  const config = getEmailConfig();
  if (config.provider === 'smtp') return sendSmtpEmail({to:recipient,subject:content.subject,html:content.html,text:content.text,senderName:'CafeKiosk System'});
  return sendResendEmail({to:recipient,subject:content.subject,html:content.html,text:content.text,senderName:'CafeKiosk System'});
}

async function sendStaffInvitation(options) {
  const content = buildInvitationEmail(options || {});
  const cafeName = clean(options?.cafeName) || 'CafeKiosk';
  const result = await sendResendEmail({
    to: options?.to,
    subject: content.subject,
    html: content.html,
    text: content.text,
    senderName: `${cafeName} via CafeKiosk`,
    replyTo: options?.inviterEmail
  });
  if (!result.sent && result.error) console.error('Staff invitation Resend delivery failed:', result.error);
  return result;
}

async function sendPasswordResetEmail(options) {
  const content = buildPasswordResetEmail(options || {});
  const cafeName = clean(options?.cafeName) || 'CafeKiosk';
  const result = await sendResendEmail({
    to: options?.to,
    subject: content.subject,
    html: content.html,
    text: content.text,
    senderName: `${cafeName} via CafeKiosk`
  });
  if (!result.sent && result.error) console.error('Password reset Resend delivery failed:', result.error);
  return result;
}

module.exports = {
  getEmailConfig,
  sendStaffInvitation,
  sendCafeRegistrationNotification,
  buildCafeRegistrationNotification,
  sendCafeApprovalEmail,
  buildCafeApprovalEmail,
  buildInvitationEmail,
  sendPasswordResetEmail,
  buildPasswordResetEmail
};
