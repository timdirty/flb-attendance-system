const crypto = require('crypto');

const TTL_SECONDS = 300;

function b64url(buf) {
  return Buffer.from(buf).toString('base64url');
}

function fromB64url(str) {
  return Buffer.from(str, 'base64url');
}

function signActionToken(payload, secret, kid, opts = {}) {
  const fullPayload = {
    ...payload,
    exp: opts.skipExpStamp ? payload.exp : (Math.floor(Date.now() / 1000) + TTL_SECONDS),
    nonce: payload.nonce || crypto.randomBytes(8).toString('hex'),
    kid,
  };
  const payloadB64 = b64url(JSON.stringify(fullPayload));
  const sig = crypto.createHmac('sha256', secret).update(payloadB64).digest();
  return `${payloadB64}.${b64url(sig)}`;
}

function verifyActionToken(token, secrets, nonceCheck = null) {
  const dot = token.indexOf('.');
  if (dot === -1) return { valid: false, reason: 'malformed' };
  const payloadB64 = token.slice(0, dot);
  const sigB64 = token.slice(dot + 1);

  let payload;
  try {
    payload = JSON.parse(fromB64url(payloadB64).toString());
  } catch (e) {
    return { valid: false, reason: 'invalid_json' };
  }

  const kid = payload.kid;
  if (!secrets[kid]) return { valid: false, reason: 'unknown_kid' };

  const expected = crypto.createHmac('sha256', secrets[kid]).update(payloadB64).digest();
  let provided;
  try {
    provided = fromB64url(sigB64);
  } catch (e) {
    return { valid: false, reason: 'malformed_sig' };
  }
  if (provided.length !== expected.length ||
      !crypto.timingSafeEqual(expected, provided)) {
    return { valid: false, reason: 'signature_mismatch' };
  }

  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    return { valid: false, reason: 'expired' };
  }

  if (nonceCheck && payload.nonce && nonceCheck(payload.nonce)) {
    return { valid: false, reason: 'nonce_replayed' };
  }

  return { valid: true, payload };
}

module.exports = { signActionToken, verifyActionToken, TTL_SECONDS };
