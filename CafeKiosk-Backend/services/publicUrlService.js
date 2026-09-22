const os = require('os');

function clean(value) {
  return String(value ?? '').trim();
}

function stripTrailingSlash(value) {
  return clean(value).replace(/\/+$/, '');
}

function isLoopbackHost(hostname) {
  const host = clean(hostname).toLowerCase().replace(/^\[|\]$/g, '');
  return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '0.0.0.0';
}

function normalizeHttpUrl(value) {
  const raw = stripTrailingSlash(value);
  if (!raw) return '';
  try {
    const parsed = new URL(raw);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    if (isLoopbackHost(parsed.hostname)) return '';
    return stripTrailingSlash(parsed.href);
  } catch (_) {
    return '';
  }
}

function railwayUrl() {
  const explicit = normalizeHttpUrl(
    process.env.PUBLIC_APP_URL ||
    process.env.APP_PUBLIC_URL ||
    process.env.KIOSK_BASE_URL ||
    process.env.RAILWAY_STATIC_URL
  );
  if (explicit) return explicit;

  const domain = clean(process.env.RAILWAY_PUBLIC_DOMAIN);
  if (domain) return normalizeHttpUrl(`https://${domain}`);
  return '';
}

function firstLanIpv4() {
  const candidates = [];
  const interfaces = os.networkInterfaces();
  for (const entries of Object.values(interfaces)) {
    for (const entry of entries || []) {
      const family = typeof entry.family === 'string' ? entry.family : String(entry.family);
      if ((family === 'IPv4' || family === '4') && !entry.internal && entry.address && !entry.address.startsWith('169.254.')) {
        candidates.push(entry.address);
      }
    }
  }
  const score = address => /^192\.168\./.test(address) ? 0 : /^10\./.test(address) ? 1 : 2;
  candidates.sort((a, b) => score(a) - score(b));
  return candidates[0] || '';
}

function requestBaseUrl(req) {
  const forwardedHost = clean(req?.headers?.['x-forwarded-host']).split(',')[0];
  const hostHeader = forwardedHost || clean(req?.headers?.host);
  if (!hostHeader) return '';

  const hostname = hostHeader.startsWith('[')
    ? hostHeader.slice(1, hostHeader.indexOf(']'))
    : hostHeader.split(':')[0];
  if (isLoopbackHost(hostname)) return '';

  const forwardedProto = clean(req?.headers?.['x-forwarded-proto']).split(',')[0];
  const protocol = forwardedProto || req?.protocol || 'http';
  return normalizeHttpUrl(`${protocol}://${hostHeader}`);
}

function getPublicAppUrl(req) {
  const deployed = railwayUrl();
  if (deployed) return deployed;

  const fromRequest = requestBaseUrl(req);
  if (fromRequest) return fromRequest;

  const lanIp = firstLanIpv4();
  if (lanIp) {
    const port = Number(process.env.PORT) || 5000;
    return `http://${lanIp}:${port}`;
  }

  const error = new Error('CafeKiosk could not determine its public URL. Set PUBLIC_APP_URL to the Railway HTTPS domain or a reachable LAN address.');
  error.code = 'PUBLIC_APP_URL_REQUIRED';
  throw error;
}

function buildPublicUrl(req, relativePath) {
  const base = getPublicAppUrl(req);
  const route = String(relativePath || '').startsWith('/') ? String(relativePath) : `/${String(relativePath || '')}`;
  return new URL(route, `${base}/`).href;
}

module.exports = {
  getPublicAppUrl,
  buildPublicUrl,
  firstLanIpv4,
  isLoopbackHost,
  railwayUrl
};
