const fs = require('fs');
const path = require('path');
const readline = require('readline');
const mysql = require('mysql2/promise');

const root = path.resolve(__dirname, '..');
const envPath = path.join(root, '.env');

function parseEnv(text) {
  const result = {};
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx < 0) continue;
    result[line.slice(0, idx).trim()] = line.slice(idx + 1);
  }
  return result;
}

function ask(rl, prompt, fallback = '') {
  return new Promise(resolve => {
    const suffix = fallback ? ` [${fallback}]` : '';
    rl.question(`${prompt}${suffix}: `, answer => resolve(String(answer || '').trim() || fallback));
  });
}

function askPassword(prompt) {
  return new Promise(resolve => {
    if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function') {
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      rl.question(`${prompt}: `, answer => { rl.close(); resolve(String(answer || '')); });
      return;
    }

    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdout.write(`${prompt}: `);
    let value = '';

    const onKeypress = (str, key = {}) => {
      if (key.ctrl && key.name === 'c') {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdout.write('\n');
        process.exit(130);
      }
      if (key.name === 'return' || key.name === 'enter') {
        process.stdin.removeListener('keypress', onKeypress);
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdout.write('\n');
        resolve(value);
        return;
      }
      if (key.name === 'backspace') {
        if (value.length) {
          value = value.slice(0, -1);
          process.stdout.write('\b \b');
        }
        return;
      }
      if (str && !key.ctrl && !key.meta && str >= ' ') {
        value += str;
        process.stdout.write('*');
      }
    };

    process.stdin.on('keypress', onKeypress);
  });
}

function serializeEnv(values) {
  return [
    `DB_HOST=${values.DB_HOST}`,
    `DB_PORT=${values.DB_PORT}`,
    `DB_USER=${values.DB_USER}`,
    `DB_PASSWORD=${values.DB_PASSWORD}`,
    `DB_NAME=${values.DB_NAME}`,
    `DB_CONNECT_TIMEOUT=${values.DB_CONNECT_TIMEOUT || '10000'}`,
    '',
    `JWT_SECRET=${values.JWT_SECRET || 'supersecretkey'}`,
    `PORT=${values.PORT || '5000'}`,
    '',
    `SESSION_TIMEOUT_MINUTES=${values.SESSION_TIMEOUT_MINUTES || '5'}`,
    `MAX_LOGIN_ATTEMPTS=${values.MAX_LOGIN_ATTEMPTS || '5'}`,
    `LOCK_TIME_MINUTES=${values.LOCK_TIME_MINUTES || '15'}`,
    ''
  ].join('\r\n');
}

async function main() {
  const current = fs.existsSync(envPath) ? parseEnv(fs.readFileSync(envPath, 'utf8')) : {};
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log('');
  console.log('======================================================');
  console.log(' CafeKiosk - Configure MySQL Connection');
  console.log('======================================================');
  console.log('Use the same values you use in MySQL Workbench.');
  console.log('');

  const host = await ask(rl, 'MySQL host', current.DB_HOST || '127.0.0.1');
  const portText = await ask(rl, 'MySQL port', current.DB_PORT || '3306');
  const user = await ask(rl, 'MySQL username', current.DB_USER || 'root');
  const database = await ask(rl, 'Database name', current.DB_NAME || 'cafekiosk');
  rl.close();
  const password = await askPassword('MySQL password (hidden while typing)');

  const port = Number(portText || 3306);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('Invalid MySQL port.');
  }

  console.log('');
  console.log('Testing MySQL connection...');

  let connection;
  try {
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
      connectTimeout: 10000
    });
    await connection.query('SELECT 1');
    const [[tables]] = await connection.query(
      `SELECT COUNT(*) AS c FROM information_schema.tables WHERE table_schema = DATABASE()`
    );
    if (Number(tables.c || 0) === 0) {
      throw new Error(`Database "${database}" exists but contains no tables.`);
    }
  } finally {
    if (connection) await connection.end();
  }

  const next = {
    ...current,
    DB_HOST: host,
    DB_PORT: String(port),
    DB_USER: user,
    DB_PASSWORD: password,
    DB_NAME: database,
    DB_CONNECT_TIMEOUT: current.DB_CONNECT_TIMEOUT || '10000'
  };

  fs.writeFileSync(envPath, serializeEnv(next), 'utf8');
  console.log('');
  console.log('Connection successful.');
  console.log(`Saved: ${envPath}`);
  console.log('You can now run START_CAFEKIOSK_LAN.bat');
}

main().catch(error => {
  console.error('');
  console.error('Connection was NOT saved.');
  console.error(`${error.code || 'ERROR'}: ${error.message}`);
  console.error('');
  if (error.code === 'ER_ACCESS_DENIED_ERROR') {
    console.error('Check the root password you created in MySQL Installer / Workbench.');
  } else if (error.code === 'ER_BAD_DB_ERROR') {
    console.error('Import CafeKiosk-DataBase/schema.sql into MySQL Workbench first.');
  } else if (error.code === 'ECONNREFUSED') {
    console.error('Make sure the MySQL80 Windows service is running on port 3306.');
  }
  process.exitCode = 1;
});
