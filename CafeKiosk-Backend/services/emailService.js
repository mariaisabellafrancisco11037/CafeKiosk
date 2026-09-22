const net = require('net');
const tls = require('tls');
const crypto = require('crypto');

function text(value) {
  return String(value ?? '').trim();
}

function bool(value, fallback = false) {
  const raw = text(value).toLowerCase();
  if (!raw) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(raw);
}

function headerSafe(value) {
  return text(value).replace(/[\r\n]+/g, ' ');
}

function htmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function wrapBase64(value) {
  const encoded = Buffer.from(String(value ?? ''), 'utf8').toString('base64');
  return encoded.match(/.{1,76}/g)?.join('\r\n') || '';
}

function smtpConfig() {
  const host = text(process.env.SMTP_HOST);
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = bool(process.env.SMTP_SECURE, port === 465);
  const user = text(process.env.SMTP_USER);
  const pass = String(process.env.SMTP_PASS || '').trim();
  const fromEmail = text(process.env.SMTP_FROM_EMAIL) || user;
  const fromName = text(process.env.SMTP_FROM_NAME) || 'CafeKiosk';

  if (!host || !user || !pass || !fromEmail) {
    const error = new Error(
      'Email delivery is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, and SMTP_FROM_EMAIL in .env or run CONFIGURE_EMAIL_INVITATIONS.bat.'
    );
    error.code = 'SMTP_NOT_CONFIGURED';
    throw error;
  }

  return { host, port, secure, user, pass, fromEmail, fromName };
}

function createResponseReader(socket) {
  let buffer = '';
  let current = [];
  const queued = [];
  const waiters = [];

  function deliver(response) {
    const waiter = waiters.shift();
    if (waiter) waiter.resolve(response);
    else queued.push(response);
  }

  function onData(chunk) {
    buffer += chunk.toString('utf8');
    let index;
    while ((index = buffer.indexOf('\n')) !== -1) {
      const rawLine = buffer.slice(0, index + 1);
      buffer = buffer.slice(index + 1);
      const line = rawLine.replace(/\r?\n$/, '');
      current.push(line);
      if (/^\d{3} /.test(line)) {
        const response = {
          code: Number(line.slice(0, 3)),
          lines: current.slice(),
          text: current.join('\n')
        };
        current = [];
        deliver(response);
      }
    }
  }

  function onError(error) {
    while (waiters.length) waiters.shift().reject(error);
  }

  socket.on('data', onData);
  socket.on('error', onError);

  return {
    read(timeoutMs = 12000) {
      if (queued.length) return Promise.resolve(queued.shift());
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          const index = waiters.findIndex((item) => item.resolve === wrappedResolve);
          if (index >= 0) waiters.splice(index, 1);
          reject(new Error('SMTP server timed out.'));
        }, timeoutMs);
        const wrappedResolve = (value) => {
          clearTimeout(timer);
          resolve(value);
        };
        const wrappedReject = (error) => {
          clearTimeout(timer);
          reject(error);
        };
        waiters.push({ resolve: wrappedResolve, reject: wrappedReject });
      });
    },
    cleanup() {
      socket.off('data', onData);
      socket.off('error', onError);
    }
  };
}

async function connectSocket(config) {
  if (config.secure) {
    const socket = tls.connect({
      host: config.host,
      port: config.port,
      servername: config.host,
      rejectUnauthorized: true
    });
    await new Promise((resolve, reject) => {
      socket.once('secureConnect', resolve);
      socket.once('error', reject);
    });
    return socket;
  }

  const plain = net.connect({ host: config.host, port: config.port });
  await new Promise((resolve, reject) => {
    plain.once('connect', resolve);
    plain.once('error', reject);
  });

  let reader = createResponseReader(plain);
  const greeting = await reader.read();
  if (greeting.code !== 220) throw new Error(`SMTP connection rejected: ${greeting.text}`);

  plain.write(`EHLO cafekiosk\r\n`);
  const ehlo = await reader.read();
  if (ehlo.code !== 250) throw new Error(`SMTP EHLO failed: ${ehlo.text}`);

  plain.write('STARTTLS\r\n');
  const startTls = await reader.read();
  if (startTls.code !== 220) throw new Error(`SMTP STARTTLS failed: ${startTls.text}`);

  reader.cleanup();
  const secureSocket = tls.connect({ socket: plain, servername: config.host, rejectUnauthorized: true });
  await new Promise((resolve, reject) => {
    secureSocket.once('secureConnect', resolve);
    secureSocket.once('error', reject);
  });
  return secureSocket;
}

async function sendCommand(socket, reader, command, expectedCodes) {
  socket.write(`${command}\r\n`);
  const response = await reader.read();
  const expected = Array.isArray(expectedCodes) ? expectedCodes : [expectedCodes];
  if (!expected.includes(response.code)) {
    throw new Error(`SMTP command failed (${response.code}): ${response.text}`);
  }
  return response;
}

function buildMessage({ config, to, subject, textBody, htmlBody }) {
  const boundary = `cafekiosk_${crypto.randomBytes(12).toString('hex')}`;
  const fromName = headerSafe(config.fromName).replace(/"/g, "'");
  const sender = headerSafe(config.fromEmail);
  const recipient = headerSafe(to);
  const safeSubject = headerSafe(subject);
  const messageId = `<${Date.now()}.${crypto.randomBytes(8).toString('hex')}@cafekiosk>`;

  return [
    `From: "${fromName}" <${sender}>`,
    `To: <${recipient}>`,
    `Subject: ${safeSubject}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: ${messageId}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    wrapBase64(textBody),
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    wrapBase64(htmlBody),
    `--${boundary}--`,
    ''
  ].join('\r\n');
}

async function sendSmtpMail({ to, subject, textBody, htmlBody }) {
  const config = smtpConfig();
  if (!/^\S+@\S+\.\S+$/.test(text(to))) throw new Error('Invalid invitation recipient email address.');

  let socket;
  let reader;
  try {
    socket = await connectSocket(config);
    reader = createResponseReader(socket);

    if (config.secure) {
      const greeting = await reader.read();
      if (greeting.code !== 220) throw new Error(`SMTP connection rejected: ${greeting.text}`);
    }

    await sendCommand(socket, reader, 'EHLO cafekiosk', 250);
    await sendCommand(socket, reader, 'AUTH LOGIN', 334);
    await sendCommand(socket, reader, Buffer.from(config.user, 'utf8').toString('base64'), 334);
    await sendCommand(socket, reader, Buffer.from(config.pass, 'utf8').toString('base64'), 235);
    await sendCommand(socket, reader, `MAIL FROM:<${config.fromEmail}>`, 250);
    await sendCommand(socket, reader, `RCPT TO:<${headerSafe(to)}>`, [250, 251]);
    await sendCommand(socket, reader, 'DATA', 354);

    const message = buildMessage({ config, to, subject, textBody, htmlBody });
    socket.write(`${message}\r\n.\r\n`);
    const queued = await reader.read();
    if (queued.code !== 250) throw new Error(`SMTP message was not accepted: ${queued.text}`);

    try { await sendCommand(socket, reader, 'QUIT', 221); } catch (_) {}
    return { accepted: true, response: queued.text };
  } finally {
    try { reader?.cleanup(); } catch (_) {}
    try { socket?.end(); } catch (_) {}
  }
}

async function sendStaffInvitationEmail({ to, inviteUrl, cafeName, role, expiresHours, invitedByName }) {
  const safeCafe = text(cafeName) || 'CafeKiosk Cafe';
  const safeRole = text(role) || 'Staff';
  const hours = Number(expiresHours) || 48;
  const inviter = text(invitedByName) || 'your cafe administrator';

  const subject = `${safeCafe} invited you to CafeKiosk`;
  const textBody = [
    `You have been invited to join ${safeCafe} on CafeKiosk as ${safeRole}.`,
    '',
    `Invitation sent by: ${inviter}`,
    `This invitation expires in ${hours} hours.`,
    '',
    `Create your account: ${inviteUrl}`,
    '',
    'If you were not expecting this invitation, you can ignore this email.'
  ].join('\n');

  const htmlBody = `<!doctype html>
<html><body style="font-family:Arial,sans-serif;background:#f6f1e8;padding:28px;color:#3f342d">
  <div style="max-width:620px;margin:0 auto;background:#fff;border:1px solid #e7ded1;border-radius:16px;padding:28px">
    <h2 style="margin:0 0 10px;color:#4f6548">CafeKiosk Staff Invitation</h2>
    <p>You have been invited to join <strong>${htmlEscape(safeCafe)}</strong> as <strong>${htmlEscape(safeRole)}</strong>.</p>
    <p style="color:#75685f">Invitation sent by ${htmlEscape(inviter)}. This link expires in ${hours} hours.</p>
    <p style="margin:28px 0"><a href="${htmlEscape(inviteUrl)}" style="display:inline-block;background:#5d7355;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700">Create My CafeKiosk Account</a></p>
    <p style="font-size:13px;color:#75685f">If the button does not work, copy this link into your browser:<br><span style="word-break:break-all">${htmlEscape(inviteUrl)}</span></p>
    <p style="font-size:12px;color:#9a8d84;margin-top:24px">If you were not expecting this invitation, you can ignore this email.</p>
  </div>
</body></html>`;

  return sendSmtpMail({ to, subject, textBody, htmlBody });
}

module.exports = {
  sendStaffInvitationEmail,
  smtpConfig
};
