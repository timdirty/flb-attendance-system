const axios = require('axios');

class StudentManagerClient {
  constructor({ baseUrl, hmac, timeoutMs = 15000 }) {
    if (!baseUrl) throw new Error('StudentManagerClient: baseUrl required');
    if (!hmac) throw new Error('StudentManagerClient: hmac instance required');
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.hmac = hmac;
    this.timeoutMs = timeoutMs;
  }

  async _request(method, path, { query, body } = {}) {
    const queryString = query
      ? new URLSearchParams(Object.entries(query).filter(([, v]) => v != null && v !== '')).toString()
      : '';
    const bodyStr = body ? JSON.stringify(body) : '';
    const sig = this.hmac.signOutbound(method, path, queryString, bodyStr);
    const url = queryString ? `${this.baseUrl}${path}?${queryString}` : `${this.baseUrl}${path}`;
    try {
      const res = await axios({
        method, url,
        headers: { 'X-Bot-Signature': sig, 'Content-Type': 'application/json' },
        data: bodyStr || undefined,
        timeout: this.timeoutMs,
        validateStatus: () => true,  // we handle status manually
      });
      if (res.status >= 200 && res.status < 300) {
        return { ok: true, data: res.data, status: res.status };
      }
      // Try previous-secret fallback on 401 (HMAC rotation grace)
      if (res.status === 401 && this.hmac.previous) {
        const oldSig = this.hmac.signWithKid(this.hmac.previous_kid, method, path, queryString, bodyStr);
        const res2 = await axios({
          method, url,
          headers: { 'X-Bot-Signature': oldSig, 'Content-Type': 'application/json' },
          data: bodyStr || undefined,
          timeout: this.timeoutMs,
          validateStatus: () => true,
        });
        if (res2.status >= 200 && res2.status < 300) {
          return { ok: true, data: res2.data, status: res2.status };
        }
        return { ok: false, error: `auth_failed_after_rotation`, status: res2.status, data: res2.data };
      }
      return { ok: false, error: `http_${res.status}`, status: res.status, data: res.data };
    } catch (e) {
      return { ok: false, error: e.message, status: 0 };
    }
  }

  getCandidates(line_user_id, hint_amount, hint_account_last5) {
    return this._request('GET', '/api/payments/candidates-for-line',
      { query: { line_user_id, hint_amount, hint_account_last5 } });
  }

  getCandidatesPage(candidate_set_id, line_user_id, page) {
    return this._request('GET', '/api/payments/candidates-for-line/page',
      { query: { candidate_set_id, line_user_id, page } });
  }

  lineBind(payload) {
    return this._request('POST', '/api/payments/verifications/line-bind',
      { body: payload });
  }

  createManualEvent(payload) {
    return this._request('POST', '/api/payments/manual-events', { body: payload });
  }
}

module.exports = { StudentManagerClient };
