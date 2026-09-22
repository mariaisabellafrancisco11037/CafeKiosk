const mysql = require('mysql2/promise');
const config = require('./dbConfig');

const pool = mysql.createPool({
  ...config,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
});

module.exports = pool;
