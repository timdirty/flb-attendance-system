const crypto = require('crypto');

function canonicalRequestString(method, path, queryString, body) {
  const sorted = queryString
    ? new URLSearchParams([...new URLSearchParams(queryString)].sort()).toString()
    : '';
  return `${method.toUpperCase()}:${path}:${sorted}:${body || ''}`;
}

function signRequest(secret, kid, canonical) {
  const ts = Math.floor(Date.now() / 1000);
  const msg = `${ts}:${canonical}`;
  const sig = crypto.createHmac('sha256', secret).update(msg).digest('hex');
  return `t=${ts},v1=${sig},kid=${kid}`;
}

class BotHmac {
  constructor({ current, current_kid, previous, previous_kid }) {
    this.current = current;
    this.current_kid = current_kid || 'v1';
    this.previous = previous;
    this.previous_kid = previous_kid || 'v0';
  }

  signOutbound(method, path, queryString, body) {
    const canonical = canonicalRequestString(method, path, queryString, body);
    return signRequest(this.current, this.current_kid, canonical);
  }

  signWithKid(kid, method, path, queryString, body) {
    const canonical = canonicalRequestString(method, path, queryString, body);
    if (kid === this.current_kid) return signRequest(this.current, kid, canonical);
    if (kid === this.previous_kid && this.previous) {
      return signRequest(this.previous, kid, canonical);
    }
    throw new Error(`unknown_kid: ${kid}`);
  }
}

module.exports = { signRequest, canonicalRequestString, BotHmac };
