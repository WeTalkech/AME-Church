const fs = require('fs');
const path = require('path');

const DB_PATH  = path.join(__dirname, '..', 'church.db');
const BACKUP_DIR = path.join(__dirname, '..', 'backups');

if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

// Keep only the last 30 backups
const existing = fs.readdirSync(BACKUP_DIR)
  .filter(f => f.endsWith('.db'))
  .sort();
while (existing.length >= 30) {
  fs.unlinkSync(path.join(BACKUP_DIR, existing.shift()));
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const dest  = path.join(BACKUP_DIR, `church_${stamp}.db`);
fs.copyFileSync(DB_PATH, dest);
console.log(`Backup saved: ${dest}`);
