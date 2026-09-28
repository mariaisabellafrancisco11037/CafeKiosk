const crypto = require("crypto");

function isProduction() {
  return Boolean(
    process.env.RAILWAY_ENVIRONMENT ||
    process.env.RAILWAY_PROJECT_ID ||
    String(process.env.NODE_ENV || "").toLowerCase() === "production"
  );
}

function strongEnough(value) {
  const text = String(value || "");
  return text.length >= 32 && !/cafekiosk-demo-secret|changeme|password|secret123/i.test(text);
}

let jwtSecret = String(process.env.JWT_SECRET || "").trim();

if (!jwtSecret) {
  if (isProduction()) {
    // Fail-safe fallback: never use a published/default secret in production.
    // This keeps forged JWTs impossible even before JWT_SECRET is configured,
    // although sessions will be invalidated whenever the process restarts.
    jwtSecret = crypto.randomBytes(48).toString("hex");
    console.warn("SECURITY WARNING: JWT_SECRET is not configured. A random per-process secret is being used; set a persistent 32+ character JWT_SECRET in Railway.");
  } else {
    jwtSecret = "cafekiosk-local-development-secret-only";
  }
} else if (isProduction() && !strongEnough(jwtSecret)) {
  console.error("SECURITY ERROR: JWT_SECRET is too weak for production. Use a random value of at least 32 characters.");
  process.exit(1);
}

module.exports = {
  JWT_SECRET: jwtSecret,
  isProduction,
  strongEnough
};
