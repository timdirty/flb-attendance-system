#!/usr/bin/env node
/** Bot-side ops CLI for line-payment queue.
 *  Usage: node scripts/line-payment-ops.js <command> [arg]
 */
const path = require('path');
const fs = require('fs');
const { LinePaymentQueue } = require('../src/line-payment/queue');

const QUEUE_PATH = process.env.LINE_PAYMENT_QUEUE_PATH ||
                   path.join(__dirname, '../src/data/line-payment-queue.sqlite');
const PAUSE_FLAG = path.join(__dirname, '../src/data/line-payment-paused.flag');

const cmd = process.argv[2];
const arg = process.argv[3];

function usage() {
    console.log(`Usage: line-payment-ops <command> [arg]

Commands:
  pause-ingest             Set pause flag — bot stops enqueuing new events
  resume                   Remove pause flag
  drain                    Wait until status='pending' count reaches 0
  retry-job <id>           Reset a failed job back to pending
  force-fail <id>          Mark job as failed_permanent
  release-lease <id>       Release a stuck lease
  quarantine-list          List quarantine entries
  quarantine-replay <id>   Move quarantine entry back to jobs queue
  stats                    Print queue counts (pending/sent/failed/quarantine)
  list-failed              List failed_permanent jobs
`);
}

if (!cmd || cmd === '--help' || cmd === '-h') { usage(); process.exit(0); }

const queue = new LinePaymentQueue(QUEUE_PATH);

try {
    switch (cmd) {
        case 'pause-ingest':
            fs.writeFileSync(PAUSE_FLAG, new Date().toISOString());
            console.log('✅ ingest paused');
            break;
        case 'resume':
            try { fs.unlinkSync(PAUSE_FLAG); } catch (e) { /* not exists is OK */ }
            console.log('✅ ingest resumed');
            break;
        case 'drain': {
            const stmt = queue.db.prepare("SELECT COUNT(*) AS c FROM jobs WHERE status='pending'");
            let pending = stmt.get().c;
            console.log(`pending=${pending}`);
            if (pending === 0) console.log('✅ already drained');
            else console.log(`⚠️ ${pending} pending jobs remaining; rerun this command to monitor`);
            break;
        }
        case 'retry-job':
            if (!arg) { console.error('id required'); process.exit(1); }
            queue.db.prepare(`UPDATE jobs SET status='pending', next_retry_at=CAST(strftime('%s','now') AS INTEGER), lease_until=NULL WHERE id=?`).run(arg);
            console.log(`✅ job ${arg} queued for retry`);
            break;
        case 'force-fail':
            if (!arg) { console.error('id required'); process.exit(1); }
            queue.db.prepare(`UPDATE jobs SET status='failed_permanent', lease_until=NULL WHERE id=?`).run(arg);
            console.log(`✅ job ${arg} marked failed_permanent`);
            break;
        case 'release-lease':
            if (!arg) { console.error('id required'); process.exit(1); }
            queue.db.prepare(`UPDATE jobs SET lease_until=NULL WHERE id=?`).run(arg);
            console.log(`✅ lease released for job ${arg}`);
            break;
        case 'quarantine-list':
            console.log(JSON.stringify(queue.listQuarantine(), null, 2));
            break;
        case 'quarantine-replay': {
            if (!arg) { console.error('id required'); process.exit(1); }
            const id = queue.replayQuarantine(parseInt(arg, 10), 'detect_event', `replay_${arg}`);
            console.log(`✅ replayed as job ${id}`);
            break;
        }
        case 'stats': {
            const counts = {
                pending: queue.db.prepare("SELECT COUNT(*) AS c FROM jobs WHERE status='pending'").get().c,
                sent: queue.db.prepare("SELECT COUNT(*) AS c FROM jobs WHERE status='sent'").get().c,
                failed: queue.db.prepare("SELECT COUNT(*) AS c FROM jobs WHERE status='failed_permanent'").get().c,
                quarantine: queue.db.prepare('SELECT COUNT(*) AS c FROM quarantine').get().c,
                paused: fs.existsSync(PAUSE_FLAG),
            };
            console.log(JSON.stringify(counts, null, 2));
            break;
        }
        case 'list-failed':
            console.log(JSON.stringify(
                queue.db.prepare(`SELECT id, fingerprint, job_type, attempts, last_error, created_at
                                   FROM jobs WHERE status='failed_permanent'
                                   ORDER BY id DESC LIMIT 50`).all(),
                null, 2));
            break;
        default:
            console.error(`unknown command: ${cmd}`);
            usage();
            process.exit(1);
    }
} catch (e) {
    console.error(`ERROR: ${e.message}`);
    process.exit(1);
}
