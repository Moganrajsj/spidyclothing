import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import bcrypt from 'bcryptjs';
import { createPool } from './db.js';

const pool = createPool();
const rl = readline.createInterface({ input: stdin, output: stdout });
async function secret(prompt) {
  if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') {
    const value = process.env.ADMIN_PASSWORD;
    if (!value) throw new Error('Use an interactive terminal or set ADMIN_PASSWORD securely for this one-time command.');
    return value;
  }
  stdout.write(prompt);
  stdin.setRawMode(true); stdin.resume();
  let value = '';
  return new Promise((resolve, reject) => {
    const onData = (chunk) => {
      for (const char of chunk.toString()) {
        if (char === '\u0003') { cleanup(); reject(new Error('Cancelled.')); return; }
        if (char === '\r' || char === '\n') { cleanup(); stdout.write('\n'); resolve(value); return; }
        if (char === '\u007f' || char === '\b') value = value.slice(0, -1);
        else if (char >= ' ') value += char;
      }
    };
    const cleanup = () => { stdin.off('data', onData); stdin.setRawMode(false); };
    stdin.on('data', onData);
  });
}

try {
  const name = (await rl.question('Admin name: ')).trim();
  const email = (await rl.question('Admin email: ')).trim().toLowerCase();
  const password = await secret('New password (min 12 characters): ');
  if (name.length < 2 || name.length > 120) throw new Error('Name must be 2–120 characters.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new Error('Enter a valid email address.');
  if (password.length < 12 || password.length > 128) throw new Error('Password must be 12–128 characters.');
  const hash = await bcrypt.hash(password, 12);
  await pool.execute(`INSERT INTO admins (name,email,password_hash,role,is_active) VALUES (?,?,?,'owner',TRUE)
    ON DUPLICATE KEY UPDATE name=VALUES(name),password_hash=VALUES(password_hash),role='owner',is_active=TRUE`, [name,email,hash]);
  console.log('Administrator created or password reset successfully.');
} finally { rl.close(); await pool.end(); }
