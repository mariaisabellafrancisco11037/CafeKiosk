const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'cafekiosk-demo-secret';
const SYSTEM_ADMIN_COOKIE = 'cafe_system_admin_token';

function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;

  String(cookieHeader).split(';').forEach((part) => {
    const index = part.indexOf('=');
    if (index === -1) return;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (!key) return;
    try {
      cookies[key] = decodeURIComponent(value);
    } catch (_) {
      cookies[key] = value;
    }
  });

  return cookies;
}

function getBearerToken(req) {
  const header = String(req.headers?.authorization || '');
  if (!header.toLowerCase().startsWith('bearer ')) return '';
  return header.slice(7).trim();
}

function decodeSystemAdmin(req) {
  const cookies = parseCookies(req.headers?.cookie);
  const token = getBearerToken(req) || cookies[SYSTEM_ADMIN_COOKIE] || '';
  if (!token) return null;

  try {
    const user = jwt.verify(token, JWT_SECRET);
    if (String(user?.role || '').toLowerCase() !== 'systemadmin') return null;
    return user;
  } catch (_) {
    return null;
  }
}

function requireSystemAdminApi(req, res, next) {
  const user = decodeSystemAdmin(req);
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'System Administrator login required.'
    });
  }

  req.systemAdmin = user;
  return next();
}

function requireSystemAdminPage(req, res, next) {
  const user = decodeSystemAdmin(req);
  if (!user) return res.redirect('/system-admin-login');
  req.systemAdmin = user;
  return next();
}

module.exports = {
  SYSTEM_ADMIN_COOKIE,
  decodeSystemAdmin,
  requireSystemAdminApi,
  requireSystemAdminPage
};
