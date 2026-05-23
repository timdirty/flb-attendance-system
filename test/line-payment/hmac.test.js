const { test } = require('node:test');
const assert = require('node:assert/strict');
const { signRequest, canonicalRequestString, BotHmac } = require('../../src/line-payment/hmac');

test('canonicalRequestString sorts query and includes method+path+body', () => {
  const c = canonicalRequestString('GET', '/api/x', 'b=2&a=1', '');
  assert.equal(c, 'GET:/api/x:a=1&b=2:');
  const c2 = canonicalRequestString('POST', '/api/y', '', '{"foo":"bar"}');
  assert.equal(c2, 'POST:/api/y::{"foo":"bar"}');
});

test('signRequest produces parseable header', () => {
  const header = signRequest('test_secret', 'v1', 'GET:/x::');
  assert.match(header, /^t=\d+,v1=[a-f0-9]{64},kid=v1$/);
});

test('BotHmac.signOutbound uses current secret + current kid', () => {
  const bh = new BotHmac({ current: 's_curr', current_kid: 'v1' });
  const header = bh.signOutbound('POST', '/api/x', '', '{"a":1}');
  assert.match(header, /kid=v1/);
});

test('BotHmac.signWithKid falls back to previous secret', () => {
  const bh = new BotHmac({
    current: 's_new', current_kid: 'v2',
    previous: 's_old', previous_kid: 'v1'
  });
  const header = bh.signWithKid('v1', 'POST', '/x', '', 'body');
  assert.match(header, /kid=v1/);
});

test('BotHmac.signWithKid throws for unknown kid', () => {
  const bh = new BotHmac({ current: 's', current_kid: 'v1' });
  assert.throws(() => bh.signWithKid('v9', 'GET', '/x', '', ''), /unknown_kid/);
});
