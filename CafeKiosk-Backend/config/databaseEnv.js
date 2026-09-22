'use strict';

function clean(value) {
  return String(value ?? '').trim();
}

function first(...values) {
  for (const value of values) {
    const candidate = clean(value);
    if (candidate) return candidate;
  }
  return '';
}

function isRailway() {
  return Boolean(
    clean(process.env.RAILWAY_ENVIRONMENT) ||
    clean(process.env.RAILWAY_ENVIRONMENT_NAME) ||
    clean(process.env.RAILWAY_PROJECT_ID) ||
    clean(process.env.RAILWAY_SERVICE_ID)
  );
}

function parseMysqlUrl(rawValue) {
  const raw = clean(rawValue);
  if (!raw) return null;

  let parsed;
  try {
    parsed = new URL(raw);
  } catch (_) {
    return null;
  }

  if (!['mysql:', 'mariadb:'].includes(parsed.protocol)) return null;

  const database = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
  if (!parsed.hostname || !parsed.username || !database) return null;

  return {
    host: parsed.hostname,
    port: Number(parsed.port || 3306),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password || ''),
    database,
    source: 'url'
  };
}

function urlConfig() {
  const candidates = [
    ['MYSQL_URL', process.env.MYSQL_URL],
    ['MYSQL_PRIVATE_URL', process.env.MYSQL_PRIVATE_URL],
    ['DATABASE_URL', process.env.DATABASE_URL],
    ['DATABASE_PRIVATE_URL', process.env.DATABASE_PRIVATE_URL],
    ['RAILWAY_MYSQL_URL', process.env.RAILWAY_MYSQL_URL],
    ['MYSQL_PUBLIC_URL', process.env.MYSQL_PUBLIC_URL]
  ];

  for (const [name, value] of candidates) {
    const config = parseMysqlUrl(value);
    if (config) return { ...config, source: name };
  }
  return null;
}

function fieldConfig() {
  const host = first(process.env.MYSQLHOST, process.env.MYSQL_HOST, process.env.DB_HOST);
  const port = first(process.env.MYSQLPORT, process.env.MYSQL_PORT, process.env.DB_PORT, '3306');
  const user = first(process.env.MYSQLUSER, process.env.MYSQL_USER, process.env.DB_USER);
  const password = first(process.env.MYSQLPASSWORD, process.env.MYSQL_PASSWORD, process.env.DB_PASSWORD);
  const database = first(process.env.MYSQLDATABASE, process.env.MYSQL_DATABASE, process.env.DB_NAME, process.env.DB_DATABASE);

  if (!host || !user || !database) return null;
  return {
    host,
    port: Number(port || 3306),
    user,
    password,
    database,
    source: 'individual variables'
  };
}

function localConfig() {
  if (isRailway()) return null;
  return {
    host: first(process.env.DB_HOST, '127.0.0.1'),
    port: Number(first(process.env.DB_PORT, '3306')),
    user: first(process.env.DB_USER, 'root'),
    password: clean(process.env.DB_PASSWORD),
    database: first(process.env.DB_NAME, 'cafekiosk'),
    source: 'local defaults'
  };
}

function resolveDatabaseConfig() {
  return urlConfig() || fieldConfig() || localConfig();
}

function applyDatabaseEnvironment(config = resolveDatabaseConfig()) {
  if (!config) return null;
  process.env.DB_HOST = config.host;
  process.env.DB_PORT = String(config.port || 3306);
  process.env.DB_USER = config.user;
  process.env.DB_PASSWORD = config.password || '';
  process.env.DB_NAME = config.database;
  return config;
}

function missingRailwayMessage() {
  return [
    'Railway MySQL is not connected to the CafeKiosk service.',
    'Add a Railway MySQL database, then add this variable to the CafeKiosk service:',
    'MYSQL_URL=${{MySQL.MYSQL_URL}}',
    'If your database service is not named MySQL, replace MySQL with its exact Railway service name.',
    'CafeKiosk also accepts DATABASE_URL, MYSQL_PRIVATE_URL, or the MYSQLHOST/MYSQLPORT/MYSQLUSER/MYSQLPASSWORD/MYSQLDATABASE variables.'
  ].join(' ');
}

function safeDescription(config = resolveDatabaseConfig()) {
  if (!config) return 'not configured';
  return `${config.user}@${config.host}:${config.port}/${config.database} (${config.source})`;
}

module.exports = {
  isRailway,
  parseMysqlUrl,
  resolveDatabaseConfig,
  applyDatabaseEnvironment,
  missingRailwayMessage,
  safeDescription
};
