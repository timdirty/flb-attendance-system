/** 集中所有 line-payment integration wiring，給 server.js 用單一 require + init 即可整合。
 *
 *  Usage in server.js:
 *    const linePayment = require('./src/line-payment/integration');
 *    linePayment.init({ env: process.env, lineSendFn: sendLineMessageWithBot });
 *    // ... 在 webhook handler 加 linePayment.handleWebhookEvent(event)
 *    // ... 在 postback handler 加 linePayment.handlePostback(event)
 */
const path = require('path');
const crypto = require('crypto');
const { LinePaymentQueue } = require('./queue');
const { BotHmac } = require('./hmac');
const { signActionToken, verifyActionToken } = require('./postback-token');
const { StudentManagerClient } = require('./api-client');
const { LinePaymentWorker } = require('./worker');
const flexBuilder = require('./flex-builder');
const adminGate = require('./admin-gate');
const { extractAccountLast5 } = require('./extract-account-last5');

let _state = null;

function isInitialized() {
  return _state !== null;
}

function init({ env, lineSendFn, queuePath }) {
  if (_state) return _state;

  const required = ['UNIFIED_STUDENT_API_URL', 'LINE_INTEGRATION_SECRET_CURRENT'];
  const missing = required.filter(k => !env[k]);
  if (missing.length > 0) {
    console.warn(`[line-payment] disabled — missing env: ${missing.join(', ')}`);
    return null;
  }

  const queue = new LinePaymentQueue(queuePath || path.join(__dirname, '../../src/data/line-payment-queue.sqlite'));

  const hmac = new BotHmac({
    current: env.LINE_INTEGRATION_SECRET_CURRENT,
    current_kid: env.LINE_INTEGRATION_KID_CURRENT || 'v1',
    previous: env.LINE_INTEGRATION_SECRET_PREVIOUS,
    previous_kid: env.LINE_INTEGRATION_KID_PREVIOUS || 'v0',
  });

  const smClient = new StudentManagerClient({
    baseUrl: env.UNIFIED_STUDENT_API_URL,
    hmac,
  });

  const postbackSecret = env.BOT_POSTBACK_SECRET_CURRENT || env.LINE_INTEGRATION_SECRET_CURRENT;
  const postbackKid = env.BOT_POSTBACK_SECRET_KID || 'v1';
  const postbackSecretPrev = env.BOT_POSTBACK_SECRET_PREVIOUS;
  const postbackKidPrev = env.BOT_POSTBACK_SECRET_PREVIOUS_KID || 'v0';

  const signFn = (payload) => signActionToken(payload, postbackSecret, postbackKid);

  const worker = new LinePaymentWorker({
    queue, smClient,
    lineSendFn,
    adminGate, flexBuilder,
    signFn,
  });
  worker.start();

  _state = {
    queue, hmac, smClient, worker, signFn,
    postbackSecret, postbackKid, postbackSecretPrev, postbackKidPrev,
  };
  console.log('✅ [line-payment] integration started');
  return _state;
}

/** 偵測「可能是匯款」的訊息（粗略 keyword check，由 worker 做完整 candidate 查詢）。 */
function isRemittancePotential(messageText) {
  if (!messageText) return false;
  const keywords = ['匯款', '轉帳', '轉了', '已轉', '已匯', '匯了', 'ATM', '付款完成', '已付款'];
  const t = String(messageText);
  return keywords.some(kw => t.includes(kw));
}

function computeFingerprint(channelId, lineUserId, messageId) {
  return crypto.createHash('sha256')
    .update(`${channelId || 'default'}:${lineUserId}:${messageId}`)
    .digest('hex');
}

/** Webhook 進來，判斷是否需要 enqueue line-payment event。
 *  Returns true 如果 event 已 enqueue（呼叫者可選擇 skip 既有 remittance 處理避免雙寫）。
 */
function handleWebhookEvent(event, opts = {}) {
  if (!_state) return false;
  if (event.type !== 'message') return false;
  const msg = event.message;
  if (!msg || (msg.type !== 'text' && msg.type !== 'image')) return false;

  const messageText = msg.type === 'text' ? (msg.text || '') : '';
  const ocrText = opts.ocrText || '';

  // 只處理可能是匯款訊息（避免每個訊息都 enqueue）
  if (!isRemittancePotential(messageText) && !isRemittancePotential(ocrText)) return false;

  const lineUserId = event.source && event.source.userId;
  const messageId = msg.id;
  const channelId = (event.source && event.source.channelId) || event.destination || 'default';
  if (!lineUserId || !messageId) return false;

  const fingerprint = computeFingerprint(channelId, lineUserId, messageId);
  const amount = opts.amount || extractAmount(messageText) || extractAmount(ocrText);
  const accountLast5 = extractAccountLast5(messageText) || extractAccountLast5(ocrText);

  try {
    _state.queue.enqueue('detect_event', {
      line_user_id: lineUserId,
      line_message_id: messageId,
      channel_id: channelId,
      amount: amount || null,
      account_last5: accountLast5 || null,
      raw_message_text: messageText,
      ocr_text: ocrText,
      image_url: opts.imageUrl || null,
      fingerprint,
    }, fingerprint);
    return true;
  } catch (e) {
    console.error('[line-payment] webhook enqueue failed:', e);
    return false;
  }
}

/** Postback handler — 驗 HMAC token，durable enqueue，由 worker 處理。 */
function handlePostback(event) {
  if (!_state) return false;
  const data = event.postback && event.postback.data;
  if (!data) return false;

  const secrets = { [_state.postbackKid]: _state.postbackSecret };
  if (_state.postbackSecretPrev) {
    secrets[_state.postbackKidPrev] = _state.postbackSecretPrev;
  }

  const verifyResult = verifyActionToken(data, secrets,
    (nonce) => _state.queue.isNonceUsed(nonce));
  if (!verifyResult.valid) {
    // 不是我們的 postback 或無效 token — 讓既有 handler 處理
    return false;
  }

  // Record nonce
  if (verifyResult.payload.nonce) {
    _state.queue.recordNonce(verifyResult.payload.nonce,
      verifyResult.payload.exp + 60);
  }

  // Durable enqueue
  const adminUserId = event.source && event.source.userId;
  const fingerprintRef = `${verifyResult.payload.action || 'act'}_${verifyResult.payload.nonce || verifyResult.payload.fingerprint || Date.now()}`;
  const jobType = verifyResult.payload.action === 'undo' ? 'undo_action' : 'bind_action';
  try {
    _state.queue.enqueue(jobType, {
      ...verifyResult.payload,
      admin_user_id: adminUserId,
    }, fingerprintRef);
    return true;
  } catch (e) {
    console.error('[line-payment] postback enqueue failed:', e);
    return false;
  }
}

// 既有 server.js 通常已有 extractAmount，但這裡 fallback 一份
function extractAmount(text) {
  if (!text) return null;
  const patterns = [
    /NT\$\s*([\d,]+)/,
    /([\d,]+)\s*元/,
    /([\d,]+)\s*塊/,
    /(?:轉|匯|付).*?([\d,]+)/,
    /\b(\d{3,6})\b/,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const n = parseInt(m[1].replace(/,/g, ''), 10);
      if (!isNaN(n) && n >= 100 && n <= 9999999) return n;
    }
  }
  return null;
}

module.exports = {
  init, isInitialized,
  handleWebhookEvent, handlePostback,
  // Exposed for testing or advanced usage
  isRemittancePotential, computeFingerprint, extractAmount,
};
