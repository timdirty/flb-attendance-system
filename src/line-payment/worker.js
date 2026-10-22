/** Background worker — leases jobs from queue, calls student-manager API,
 *  pushes result back to admin LINE.
 *  Job types: 'detect_event' (bot detected payment) → query candidates → push Flex
 *             'bind_action' (admin clicked Flex button) → call line-bind → push result
 *             'undo_action' (admin clicked 1-min undo) → call undo endpoint
 */
const POLL_INTERVAL_MS = 5000;
const LEASE_SECONDS = 300;
const BATCH_SIZE = 5;

class LinePaymentWorker {
  constructor({ queue, smClient, lineSendFn, adminGate, flexBuilder, signFn, logger }) {
    if (!queue) throw new Error('worker: queue required');
    if (!smClient) throw new Error('worker: smClient required');
    if (!lineSendFn) throw new Error('worker: lineSendFn required');
    this.queue = queue;
    this.smClient = smClient;
    this.lineSendFn = lineSendFn;
    this.adminGate = adminGate;
    this.flexBuilder = flexBuilder;
    this.signFn = signFn;
    this.logger = logger || console;
    this._timer = null;
    this._stopped = false;
  }

  start() {
    if (this._timer) return this;
    this._stopped = false;
    this._timer = setInterval(() => {
      if (!this._stopped) {
        this.tick().catch(e => this.logger.error('[line-payment-worker] tick err:', e));
      }
    }, POLL_INTERVAL_MS);
    return this;
  }

  stop() {
    this._stopped = true;
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  async tick() {
    const jobs = this.queue.leaseNext(BATCH_SIZE, LEASE_SECONDS);
    for (const job of jobs) {
      try {
        await this.processJob(job);
        this.queue.completeJob(job.id);
      } catch (e) {
        this.logger.warn(`[line-payment-worker] job ${job.id} failed: ${e.message}`);
        this.queue.failJob(job.id, e.message);
      }
    }
  }

  async processJob(job) {
    let payload;
    try {
      payload = JSON.parse(job.payload);
    } catch (e) {
      throw new Error(`malformed_payload: ${e.message}`);
    }

    switch (job.job_type) {
      case 'detect_event':
        return this._processDetectEvent(payload);
      case 'bind_action':
        return this._processBindAction(payload);
      case 'undo_action':
        return this._processUndoAction(payload);
      default:
        throw new Error(`unknown_job_type: ${job.job_type}`);
    }
  }

  async _processDetectEvent(payload) {
    // Phase 9.3：上傳截圖（如有）
    if (payload.image_url || payload.image_buffer_b64) {
      try {
        const axios = require('axios');
        let buf, mime;
        if (payload.image_buffer_b64) {
          buf = Buffer.from(payload.image_buffer_b64, 'base64');
          mime = payload.image_mime || 'image/jpeg';
        } else {
          const dl = await axios.get(payload.image_url, { responseType: 'arraybuffer', timeout: 15000 });
          buf = Buffer.from(dl.data);
          mime = dl.headers['content-type'] || 'image/jpeg';
        }
        const up = await this.smClient.uploadScreenshot(payload.fingerprint, buf, mime);
        if (up.ok && up.data) {
          payload.screenshot_url = up.data.screenshot_url;
          payload.media_status = up.data.media_status;
        }
      } catch (e) {
        this.logger.warn(`[line-payment-worker] screenshot upload failed: ${e.message}`);
      }
    }

    // 偵測到匯款 → 取候選 → 推 Flex 給 enabled admins
    const cands = await this.smClient.getCandidates(
      payload.line_user_id, payload.amount, payload.account_last5);
    if (!cands.ok) throw new Error(`get_candidates_failed: ${cands.error}`);

    const flexMsg = this.flexBuilder.buildCandidateCarousel({
      candidates: cands.data.candidates,
      candidate_set_id: cands.data.candidate_set_id,
      total_candidates: cands.data.total_candidates,
      moreInDashboardUrl: cands.data.more_in_dashboard_url,
      signFn: (pl) => this.signFn({
        ...pl,
        fingerprint: (payload.fingerprint || '').slice(0, 32),  // truncate for postback size
        channel_id: payload.channel_id,
        line_user_id: payload.line_user_id,
      }),
    });

    const enabledAdmins = this.adminGate ? this.adminGate.getEnabledAdmins() : [];
    if (enabledAdmins.length === 0) {
      this.logger.warn('[line-payment-worker] no enabled admins; skipping flex push');
      return;
    }
    // Phase 9.4：第一次推給某 admin 前，先推 tutorial
    let tutorialFn = null;
    try {
      tutorialFn = require('./admin-tutorial').maybeShowTutorial;
    } catch (e) { /* tutorial module 可選 */ }

    for (const admin of enabledAdmins) {
      try {
        if (tutorialFn) {
          await tutorialFn(admin.userId, this.lineSendFn);
        }
        await this.lineSendFn(admin.userId, flexMsg);
      } catch (e) {
        this.logger.warn(`[line-payment-worker] flex push failed admin=${admin.userId}: ${e.message}`);
      }
    }
  }

  async _processBindAction(payload) {
    // admin 點 button → 呼叫 student-manager → push 結果回 admin
    const result = await this.smClient.lineBind({
      fingerprint: payload.fingerprint,
      target_type: payload.target_type,
      target_id: payload.target_id,
      amount: payload.amount,
      action: payload.action === 'verify' ? 'bind_and_verify'
              : payload.action === 'reject' ? 'reject_with_reason'
              : payload.action,
      reason: payload.reason,
      line_user_id: payload.line_user_id,
      line_message_id: payload.line_message_id || payload.fingerprint,
      line_channel_id: payload.channel_id || 'default',
      admin_user_id: payload.admin_user_id,
    });

    let messageToSend;
    if (result.ok) {
      if (result.data && result.data.status === 'duplicate') {
        messageToSend = { type: 'text', text: `ℹ️ 此 LINE 訊息已處理過` };
      } else if (result.data && result.data.verification_id && payload.action === 'verify') {
        // Phase 9.4: 1 分鐘撤銷按鈕
        const undoToken = this.signFn({
          verification_id: result.data.verification_id,
          action: 'undo',
        });
        messageToSend = {
          type: 'flex',
          altText: `✅ 已綁定 ${payload.target_type || ''}`,
          contents: {
            type: 'bubble', size: 'kilo',
            body: {
              type: 'box', layout: 'vertical', spacing: 'sm',
              contents: [
                { type: 'text', weight: 'bold',
                  text: `✅ 已綁定 ${payload.student_name || payload.target_type || ''}`,
                  wrap: true },
                { type: 'text', size: 'xs', color: '#888888',
                  text: '1 分鐘內可撤銷' },
              ],
            },
            footer: {
              type: 'box', layout: 'vertical',
              contents: [{
                type: 'button', style: 'link',
                action: { type: 'postback', label: '⏪ 撤銷', data: undoToken },
              }],
            },
          },
        };
      } else {
        messageToSend = { type: 'text',
          text: `✅ 已綁定 ${payload.target_type || ''} #${payload.target_id || ''}`.trim() };
      }
    } else {
      messageToSend = { type: 'text',
        text: `⚠️ 處理失敗：${result.error || (result.data && result.data.error) || 'unknown'}` };
    }
    if (payload.admin_user_id) {
      try {
        await this.lineSendFn(payload.admin_user_id, messageToSend);
      } catch (e) {
        this.logger.warn(`[line-payment-worker] result push failed: ${e.message}`);
      }
    }
  }

  async _processUndoAction(payload) {
    // admin 點 1 分鐘撤銷 → call student-manager undo endpoint
    const res = await this.smClient._request('POST',
      `/api/payments/verifications/${payload.verification_id}/undo`,
      { body: {} });
    const text = res.ok ? '⏪ 已撤銷' : `撤銷失敗：${res.error}`;
    if (payload.admin_user_id) {
      try {
        await this.lineSendFn(payload.admin_user_id, { type: 'text', text });
      } catch (e) {
        this.logger.warn(`[line-payment-worker] undo push failed: ${e.message}`);
      }
    }
  }
}

module.exports = { LinePaymentWorker };
