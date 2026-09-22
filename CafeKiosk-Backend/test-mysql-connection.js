const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');
const config = require('./config/dbConfig');

function safeConfig() {
  return {
    host: config.host,
    port: config.port,
    user: config.user,
    database: config.database
  };
}

async function main() {
  let connection;
  try {
    connection = await mysql.createConnection(config);
    const [[server]] = await connection.query(
      'SELECT DATABASE() AS database_name, VERSION() AS mysql_version, NOW() AS server_time'
    );
    const [[tableCount]] = await connection.query(
      `SELECT COUNT(*) AS table_count
         FROM information_schema.tables
        WHERE table_schema = DATABASE()
          AND table_type = 'BASE TABLE'`
    );

    let userCount = null;
    try {
      const [[row]] = await connection.query('SELECT COUNT(*) AS user_count FROM users');
      userCount = Number(row.user_count || 0);
    } catch (_) {}

    console.log('');
    console.log('======================================================');
    console.log(' CafeKiosk MySQL connection: OK');
    console.log('======================================================');
    console.log(` Host:       ${config.host}`);
    console.log(` Port:       ${config.port}`);
    console.log(` User:       ${config.user}`);
    console.log(` Database:   ${server.database_name || config.database}`);
    console.log(` MySQL:      ${server.mysql_version}`);
    console.log(` Tables:     ${Number(tableCount.table_count || 0)}`);
    if (userCount !== null) console.log(` Users:      ${userCount}`);
    console.log('======================================================');
    process.exitCode = 0;
  } catch (error) {
    console.error('');
    console.error('======================================================');
    console.error(' CafeKiosk MySQL connection: FAILED');
    console.error('======================================================');
    console.error(' Connection settings:', safeConfig());
    console.error('');
    console.error(`${error.code || 'ERROR'}: ${error.message}`);
    console.error('');
    if (error.code === 'ECONNREFUSED') {
      console.error('MySQL Server is not running or is not listening on this host/port.');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('The MySQL username/password is incorrect. Run CONFIGURE_MYSQL_CONNECTION.bat again.');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('The cafekiosk database was not found. Import CafeKiosk-DataBase/schema.sql in MySQL Workbench.');
    }
    console.error('======================================================');
    process.exitCode = 1;
  } finally {
    if (connection) await connection.end();
  }
}

main();
