import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const logFile = path.join(__dirname, '../logs/audit.log');

function auditLogger(req, res, next) {
  const user = req.user ? req.user.id : 'anonymous';
  const logEntry = `${new Date().toISOString()} | User: ${user} | ${req.method} ${req.originalUrl}\n`;
  fs.appendFile(logFile, logEntry, err => {
    if (err) console.error('Audit log error:', err);
  });
  next();
}

export default auditLogger;
