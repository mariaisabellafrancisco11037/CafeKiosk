const { resolveDatabaseConfig, applyDatabaseEnvironment } = require('./databaseEnv');

const resolved = applyDatabaseEnvironment(resolveDatabaseConfig());

// Do not crash while the module is loading. railway-start.js prints a clear
// setup message when Railway MySQL is not attached. This short timeout keeps
// API failures responsive instead of hanging when the database is unavailable.
module.exports = resolved ? {
  host: resolved.host,
  port: Number(resolved.port || 3306),
  user: resolved.user,
  password: resolved.password || '',
  database: resolved.database,
  connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT || 10000)
} : {
  host: '127.0.0.1',
  port: 3306,
  user: '__cafekiosk_database_not_configured__',
  password: '',
  database: 'cafekiosk',
  connectTimeout: 1500
};
