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

  /** Phase 9.3 — upload LINE image binary to student-manager.
   *  Multipart body 不能用 canonical body 簽（boundary 不確定性）— 改用 fingerprint
   *  作為簽名 token (UPLOAD:<fingerprint>) 以保 idempotency。
   */
  async uploadScreenshot(fingerprint, imageBuffer, mimeType) {
    const FormData = require('form-data');
    const form = new FormData();
    form.append('image', imageBuffer, {
      filename: 'image.jpg',
      contentType: mimeType || 'image/jpeg',
    });
    form.append('fingerprint', fingerprint);
    // 簡化簽名：path + fingerprint，body 不參與
    const sigCanonical = `POST:/api/payments/line-screenshot::UPLOAD:${fingerprint}`;
    const ts = Math.floor(Date.now() / 1000);
    const crypto = require('crypto');
    const sig = crypto.createHmac('sha256', this.hmac.current)
      .update(`${ts}:${sigCanonical}`).digest('hex');
    const sigHeader = `t=${ts},v1=${sig},kid=${this.hmac.current_kid}`;

    try {
      const res = await axios.post(
        `${this.baseUrl}/api/payments/line-screenshot`,
        form,
        {
          headers: { ...form.getHeaders(), 'X-Bot-Signature': sigHeader },
          timeout: 30000,
          maxContentLength: 15 * 1024 * 1024,
          validateStatus: () => true,
        });
      if (res.status >= 200 && res.status < 300) {
        return { ok: true, data: res.data };
      }
      return { ok: false, error: `http_${res.status}`, status: res.status, data: res.data };
    } catch (e) {
      return { ok: false, error: e.message, status: 0 };
    }
  }

  /** Phase 9.4 — undo verify within 1 min window. */
  undoVerify(verification_id) {
    return this._request('POST',
      `/api/payments/verifications/${verification_id}/undo`,
      { body: {} });
  }
}

module.exports = { StudentManagerClient };
