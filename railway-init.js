'use strict';

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { resolveDatabaseConfig, applyDatabaseEnvironment } = require('./CafeKiosk-Backend/config/databaseEnv');

function railwaySafeSchema(sql) {
  let output = String(sql || '');
  output = output.replace(/^\s*DROP\s+DATABASE\s+IF\s+EXISTS\s+[^;]+;\s*$/gim, '');
  output = output.replace(/^\s*CREATE\s+DATABASE[\s\S]*?;\s*$/gim, '');
  output = output.replace(/^\s*USE\s+[^;]+;\s*$/gim, '');

  // DELIMITER is a mysql CLI command, not SQL understood by mysql2. The
  // triggers are optional guards; application logic remains functional without
  // them, so omit this block during first-time Railway bootstrap.
  output = output.replace(/DELIMITER\s+\$\$[\s\S]*?DELIMITER\s*;/gi, '');
  return output.trim();
}

async function tableExists(connection, tableName) {
  const [rows] = await connection.execute(
    'SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1',
    [tableName]
  );
  return rows.length > 0;
}

module.exports = async function initializeRailwayDatabase() {
  const config = applyDatabaseEnvironment(resolveDatabaseConfig());
  if (!config) return { skipped: true, reason: 'database-not-configured' };

  const connection = await mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT || 10000),
    multipleStatements: true,
    charset: 'utf8mb4'
  });

  try {
    await connection.query('SELECT 1');
    if (await tableExists(connection, 'cafes')) {
      return { initialized: false, database: config.database };
    }

    if (String(process.env.AUTO_INIT_DB || 'true').toLowerCase() === 'false') {
      return { initialized: false, database: config.database, reason: 'AUTO_INIT_DB=false' };
    }

    const schemaPath = path.resolve(__dirname, 'CafeKiosk-DataBase', 'schema.sql');
    const schema = railwaySafeSchema(fs.readFileSync(schemaPath, 'utf8'));
    await connection.query(schema);
    return { initialized: true, database: config.database };
  } finally {
    await connection.end().catch(() => {});
  }
};

if (require.main === module) {
  module.exports()
    .then(result => {
      console.log('Railway database initialization:', result);
    })
    .catch(error => {
      console.error('Railway database initialization failed:', error);
      process.exitCode = 1;
    });
}
