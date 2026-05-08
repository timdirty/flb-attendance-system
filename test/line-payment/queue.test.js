const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { LinePaymentQueue } = require('../../src/line-payment/queue');

const TEST_DB = '/tmp/test_line_queue.sqlite';

function freshQueue() {
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  if (fs.existsSync(TEST_DB + '-wal')) fs.unlinkSync(TEST_DB + '-wal');
  if (fs.existsSync(TEST_DB + '-shm')) fs.unlinkSync(TEST_DB + '-shm');
  return new LinePaymentQueue(TEST_DB);
}

test('enqueue creates job with status=pending', () => {
  const q = freshQueue();
  const id = q.enqueue('forward_event', { line_user_id: 'Uxxx', amount: 1500 }, 'fp_a');
  assert.ok(id > 0);
  const job = q.getById(id);
  assert.equal(job.status, 'pending');
  assert.equal(job.fingerprint, 'fp_a');
  assert.equal(JSON.parse(job.payload).line_user_id, 'Uxxx');
});

test('enqueue with duplicate fingerprint is idempotent', () => {
  const q = freshQueue();
  const id1 = q.enqueue('forward_event', { x: 1 }, 'fp_dup');
  const id2 = q.enqueue('forward_event', { x: 2 }, 'fp_dup');
  assert.equal(id1, id2);
});

test('lease respects pending+next_retry_at+lease_until', () => {
  const q = freshQueue();
  q.enqueue('forward_event', { a: 1 }, 'fp_1');
  q.enqueue('forward_event', { a: 2 }, 'fp_2');
  const leased = q.leaseNext(2, 60);
  assert.equal(leased.length, 2);
  const second = q.leaseNext(2, 60);
  assert.equal(second.length, 0);
});

test('completeJob marks status=sent and clears lease', () => {
  const q = freshQueue();
  q.enqueue('forward_event', { x: 1 }, 'fp_complete');
  const [job] = q.leaseNext(1, 60);
  q.completeJob(job.id);
  const reloaded = q.getById(job.id);
  assert.equal(reloaded.status, 'sent');
});

test('failJob increments attempts and sets next_retry_at', () => {
  const q = freshQueue();
  q.enqueue('forward_event', { x: 1 }, 'fp_fail');
  const [job] = q.leaseNext(1, 60);
  q.failJob(job.id, 'network_error');
  const reloaded = q.getById(job.id);
  assert.equal(reloaded.status, 'pending');
  assert.equal(reloaded.attempts, 1);
  assert.ok(reloaded.next_retry_at > Math.floor(Date.now() / 1000));
});

test('failJob marks failed_permanent after 10 attempts', () => {
  const q = freshQueue();
  q.enqueue('forward_event', { x: 1 }, 'fp_fail2');
  const [job] = q.leaseNext(1, 60);
  for (let i = 0; i < 10; i++) {
    q.failJob(job.id, `attempt_${i}`);
  }
  const reloaded = q.getById(job.id);
  assert.equal(reloaded.status, 'failed_permanent');
  assert.equal(reloaded.attempts, 10);
});

test('quarantineJob moves to quarantine table', () => {
  const q = freshQueue();
  q.quarantine('{invalid_json', 'parse_error');
  const items = q.listQuarantine();
  assert.equal(items.length, 1);
  assert.equal(items[0].reason, 'parse_error');
});

test('replay quarantine moves back to jobs', () => {
  const q = freshQueue();
  q.quarantine(JSON.stringify({ x: 1 }), 'manual_test');
  const items = q.listQuarantine();
  q.replayQuarantine(items[0].id, 'forward_event', 'fp_replay');
  const job = q.getByFingerprint('fp_replay');
  assert.equal(job.status, 'pending');
});

test('nonce LRU records and detects', () => {
  const q = freshQueue();
  const exp = Math.floor(Date.now() / 1000) + 300;
  assert.equal(q.isNonceUsed('nonce1'), false);
  q.recordNonce('nonce1', exp);
  assert.equal(q.isNonceUsed('nonce1'), true);
});
