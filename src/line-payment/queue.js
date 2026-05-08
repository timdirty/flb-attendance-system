// Uses Node.js built-in node:sqlite (Node 18+ experimental, stable in Node 22.5+)
// No native module build required.
const { DatabaseSync } = require('node:sqlite');

const SCHEMA = `
PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fingerprint TEXT UNIQUE NOT NULL,
  job_type TEXT NOT NULL,
  payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  last_error TEXT,
  next_retry_at INTEGER,
  lease_until INTEGER,
  created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER))
);
CREATE INDEX IF NOT EXISTS idx_jobs_pending ON jobs(status, next_retry_at) WHERE status='pending';
CREATE TABLE IF NOT EXISTS quarantine (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  raw_payload TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER))
);
CREATE TABLE IF NOT EXISTS used_nonces (
  nonce TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_nonces_expires ON used_nonces(expires_at);
`;

const BACKOFF_SECONDS = [60, 120, 300, 600, 1800, 1800, 1800, 1800, 1800, 1800];
const MAX_ATTEMPTS = 10;

class LinePaymentQueue {
  constructor(dbPath) {
    this.db = new DatabaseSync(dbPath);
    this.db.exec(SCHEMA);
  }

  enqueue(jobType, payload, fingerprint) {
    const stmt = this.db.prepare(`
      INSERT INTO jobs (fingerprint, job_type, payload, status, next_retry_at)
      VALUES (?, ?, ?, 'pending', CAST(strftime('%s','now') AS INTEGER))
      ON CONFLICT(fingerprint) DO NOTHING
      RETURNING id
    `);
    const result = stmt.get(fingerprint, jobType, JSON.stringify(payload));
    if (result) return result.id;
    return this.db.prepare('SELECT id FROM jobs WHERE fingerprint=?').get(fingerprint).id;
  }

  leaseNext(limit, leaseSeconds) {
    const now = Math.floor(Date.now() / 1000);
    return this.db.prepare(`
      UPDATE jobs SET lease_until = ?
      WHERE id IN (
        SELECT id FROM jobs
        WHERE status='pending'
          AND (next_retry_at IS NULL OR next_retry_at <= ?)
          AND (lease_until IS NULL OR lease_until < ?)
        ORDER BY id LIMIT ?
      )
      RETURNING *
    `).all(now + leaseSeconds, now, now, limit);
  }

  completeJob(id) {
    this.db.prepare(`UPDATE jobs SET status='sent', lease_until=NULL WHERE id=?`).run(id);
  }

  failJob(id, errorMessage) {
    const job = this.db.prepare('SELECT * FROM jobs WHERE id=?').get(id);
    if (!job) return;
    const newAttempts = (job.attempts || 0) + 1;
    if (newAttempts >= MAX_ATTEMPTS) {
      this.db.prepare(`
        UPDATE jobs SET status='failed_permanent', attempts=?, last_error=?, lease_until=NULL
        WHERE id=?`).run(newAttempts, errorMessage, id);
    } else {
      const backoff = BACKOFF_SECONDS[newAttempts - 1] || 1800;
      const nextRetry = Math.floor(Date.now() / 1000) + backoff;
      this.db.prepare(`
        UPDATE jobs SET status='pending', attempts=?, last_error=?,
                       next_retry_at=?, lease_until=NULL
        WHERE id=?`).run(newAttempts, errorMessage, nextRetry, id);
    }
  }

  getById(id) {
    return this.db.prepare('SELECT * FROM jobs WHERE id=?').get(id);
  }

  getByFingerprint(fp) {
    return this.db.prepare('SELECT * FROM jobs WHERE fingerprint=?').get(fp);
  }

  quarantine(rawPayload, reason) {
    return this.db.prepare(`
      INSERT INTO quarantine (raw_payload, reason) VALUES (?, ?) RETURNING id
    `).get(rawPayload, reason).id;
  }

  listQuarantine(limit = 100) {
    return this.db.prepare('SELECT * FROM quarantine ORDER BY id DESC LIMIT ?').all(limit);
  }

  replayQuarantine(quarantineId, jobType, fingerprint) {
    const item = this.db.prepare('SELECT * FROM quarantine WHERE id=?').get(quarantineId);
    if (!item) throw new Error(`quarantine ${quarantineId} not found`);
    const id = this.enqueue(jobType, JSON.parse(item.raw_payload), fingerprint);
    this.db.prepare('DELETE FROM quarantine WHERE id=?').run(quarantineId);
    return id;
  }

  isNonceUsed(nonce) {
    return this.db.prepare('SELECT 1 FROM used_nonces WHERE nonce=?').get(nonce) != null;
  }

  recordNonce(nonce, expiresAt) {
    this.db.prepare(`
      INSERT INTO used_nonces (nonce, expires_at) VALUES (?, ?)
      ON CONFLICT(nonce) DO NOTHING
    `).run(nonce, expiresAt);
    this.db.prepare('DELETE FROM used_nonces WHERE expires_at < ?')
      .run(Math.floor(Date.now() / 1000));
  }
}

module.exports = { LinePaymentQueue };
