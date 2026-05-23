const { test } = require('node:test');
const assert = require('node:assert/strict');
const { signActionToken, verifyActionToken } = require('../../src/line-payment/postback-token');

const SECRETS = { v1: 'curr', v0: 'old' };

test('round-trip sign + verify', () => {
  const payload = {
    fingerprint: 'fp1',
    target_type: 'normal_enrollment',
    target_id: '101',
    action: 'verify',
    candidate_set_id: 'cs_x',
    admin_user_id: 'Uadmin',
  };
  const token = signActionToken(payload, 'curr', 'v1');
  const r = verifyActionToken(token, SECRETS);
  assert.equal(r.valid, true);
  assert.equal(r.payload.fingerprint, 'fp1');
  assert.equal(r.payload.action, 'verify');
});

test('expired token rejected', () => {
  const payload = { fingerprint: 'fp', action: 'verify',
                    exp: Math.floor(Date.now()/1000) - 10 };
  const token = signActionToken(payload, 'curr', 'v1', { skipExpStamp: true });
  const r = verifyActionToken(token, SECRETS);
  assert.equal(r.valid, false);
  assert.match(r.reason, /expired/);
});

test('previous-kid fallback works', () => {
  const payload = { fingerprint: 'fp', action: 'verify' };
  const token = signActionToken(payload, 'old', 'v0');
  const r = verifyActionToken(token, SECRETS);
  assert.equal(r.valid, true);
});

test('tampered signature rejected', () => {
  const payload = { fingerprint: 'fp', action: 'verify' };
  const token = signActionToken(payload, 'curr', 'v1');
  const tampered = token.slice(0, -2) + 'XX';
  const r = verifyActionToken(tampered, SECRETS);
  assert.equal(r.valid, false);
});

test('token fits LINE 300 char postback limit (production-shape)', () => {
  // Production: fingerprint truncated to 32 hex chars (128-bit, still secure for
  // postback context); full fingerprint stays in queue. nonce is auto-generated
  // 16 hex chars. action_token references queue, not whole payload.
  const payload = {
    fingerprint: 'a'.repeat(32),
    target_type: 'normal_enrollment',
    target_id: '12345678',
    action: 'verify',
  };
  const token = signActionToken(payload, 'curr', 'v1');
  assert.ok(token.length <= 300, `token length ${token.length} > 300`);
});

test('nonce replay detected via callback', () => {
  const payload = { fingerprint: 'fp', action: 'verify' };
  const token = signActionToken(payload, 'curr', 'v1');
  let used = new Set();
  const r1 = verifyActionToken(token, SECRETS, n => used.has(n));
  assert.equal(r1.valid, true);
  used.add(r1.payload.nonce);
  const r2 = verifyActionToken(token, SECRETS, n => used.has(n));
  assert.equal(r2.valid, false);
  assert.match(r2.reason, /nonce_replayed/);
});

test('malformed token rejected gracefully', () => {
  assert.equal(verifyActionToken('not_a_token', SECRETS).valid, false);
  assert.equal(verifyActionToken('foo.bar', SECRETS).valid, false);
});

test('unknown kid rejected', () => {
  const token = signActionToken({ x: 1 }, 'somesecret', 'v9');
  const r = verifyActionToken(token, SECRETS);
  assert.equal(r.valid, false);
  assert.match(r.reason, /unknown_kid/);
});
