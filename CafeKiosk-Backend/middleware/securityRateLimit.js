const buckets = new Map();

function clientKey(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || req.ip || req.socket?.remoteAddress || "unknown";
}

function makeRateLimit({ windowMs = 60_000, max = 10, message = "Too many attempts. Please try again later." } = {}) {
  return (req, res, next) => {
    const now = Date.now();
    const key = `${req.baseUrl}|${req.path}|${clientKey(req)}`;
    let entry = buckets.get(key);
    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      buckets.set(key, entry);
    }
    entry.count += 1;
    res.setHeader("RateLimit-Limit", String(max));
    res.setHeader("RateLimit-Remaining", String(Math.max(0, max - entry.count)));
    res.setHeader("RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));
    if (entry.count > max) {
      return res.status(429).json({ success: false, message });
    }
    next();
  };
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of buckets.entries()) {
    if (now >= entry.resetAt) buckets.delete(key);
  }
}, 5 * 60_000).unref();

module.exports = { makeRateLimit };
