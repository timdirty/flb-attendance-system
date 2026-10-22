/** 家長提醒專用入口：原始 LINE 驗簽 → 既有系統儲存 → 同帳號 Flex 回條。 */
const crypto = require('node:crypto');

const ACTION = 'class_reminder_response';
const REPLY_URL = 'https://api.line.me/v2/bot/message/reply';
const PARENT_PORTAL_URL = 'https://course-viewer.funlearnbar.synology.me/parent-info-edit/';
const BRAND_LOGO_URL = `${PARENT_PORTAL_URL}logo.jpg?v=20260811-c390dd59`;

function captureRawBody(req, res, buffer) {
  req.rawBody = Buffer.from(buffer);
}

function reminderParams(event) {
  if (event?.type !== 'postback' || typeof event.postback?.data !== 'string') return null;
  const params = new URLSearchParams(event.postback.data);
  return params.getAll('action').includes(ACTION) ? params : null;
}

function hasValidSignature(req, secret) {
  const signature = req.headers?.['x-line-signature'];
  if (!secret || !Buffer.isBuffer(req.rawBody) || typeof signature !== 'string' ||
      !/^[A-Za-z0-9+/]{43}=$/.test(signature)) return false;
  const expected = crypto.createHmac('sha256', secret).update(req.rawBody).digest();
  const actual = Buffer.from(signature, 'base64');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function apiUrl(base) {
  try {
    const url = new URL(base);
    if (url.username || url.password || url.search || url.hash) return null;
    // Same NAS private Docker network and stable blue/green service alias only.
    const internalService = url.hostname === 'funlearnbar-student-api' &&
      url.port === '5004' && url.pathname === '/';
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' &&
        (['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || internalService))) return null;
    return `${url.href.replace(/\/$/, '')}/api/internal/class-reminder-responses`;
  } catch { return null; }
}

function notice(title, detail, saved = false, state = 'not_submitted') {
  // 與課程系統白底收據一致；未驗證的 token 不可用來顯示姓名或組合深連結。
  const label = saved ? '回覆已儲存' : state === 'unknown' ? '儲存結果待確認'
    : state === 'stale' ? '尚未確認登記' : '尚未提交回覆';
  const accent = saved ? '#2E745E' : '#8C611B';
  return {
    type: 'flex', altText: title,
    contents: {
      type: 'bubble', size: 'kilo',
      header: { type: 'box', layout: 'vertical', backgroundColor: '#FFFFFF', paddingAll: '20px', paddingBottom: '12px', contents: [
        { type: 'box', layout: 'horizontal', alignItems: 'center', spacing: 'sm', contents: [
          { type: 'text', text: '上課提醒 · 回覆結果', size: 'xs', color: '#765827', wrap: true, flex: 1 },
          { type: 'image', url: BRAND_LOGO_URL, size: '52px', aspectRatio: '2:1', aspectMode: 'fit', flex: 0 },
        ] },
        { type: 'text', text: title, size: 'lg', color: '#151A19', weight: 'bold', wrap: true, margin: 'lg' },
        { type: 'text', text: label, size: 'xs', color: accent, weight: 'bold', wrap: true, margin: 'sm' },
      ] },
      body: { type: 'box', layout: 'vertical', backgroundColor: '#FFFFFF', paddingAll: '20px', paddingTop: '0px', paddingBottom: '16px', contents: [
        { type: 'text', text: detail, size: 'sm', color: '#68716D', wrap: true, lineSpacing: '5px' },
      ] },
      footer: { type: 'box', layout: 'vertical', backgroundColor: '#FFFFFF', paddingAll: '12px', paddingTop: '0px', contents: [
        { type: 'separator', color: '#E8E4DC' },
        { type: 'button', style: 'link', height: 'sm', margin: 'sm', color: '#765827',
          action: { type: 'uri', label: '開啟家長入口', uri: PARENT_PORTAL_URL } },
      ] },
    },
  };
}

function validFlex(message) {
  return message?.type === 'flex' && typeof message.altText === 'string' &&
    message.altText.trim().length > 0 && message.altText.length <= 400 &&
    ['bubble', 'carousel'].includes(message.contents?.type) && JSON.stringify(message).length < 50000;
}

function createReminderWebhook({ post, env = process.env, logger = console, now = Date.now }) {
  // 短期去重只防 LINE 同事件重送，不攔截家長新的實際點擊。
  const seen = new Map();
  const userQueues = new Map();
  const ttl = 60 * 60 * 1000;

  async function respond(event, message) {
    try {
      const result = await post(REPLY_URL, { replyToken: event.replyToken, messages: [message] }, {
        headers: { Authorization: `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}` },
        timeout: 8000, maxRedirects: 0, maxContentLength: 65536, validateStatus: () => true,
      });
      if (result.status < 200 || result.status >= 300) logger.warn('[class-reminder] reply_failed', { status: result.status });
      else logger.info('[class-reminder] reply_sent');
    } catch {
      // reply 結果不確定不能再 push，否則家長會收到兩次；不印 axios error 裡的憑證。
      logger.warn('[class-reminder] reply_failed', { status: 'unknown' });
    }
  }

  async function processEvent(event, params) {
    if (typeof event.replyToken !== 'string' || !event.replyToken || !env.LINE_CHANNEL_ACCESS_TOKEN) {
      logger.warn('[class-reminder] reply_unavailable');
      return;
    }
    if (event.source?.type !== 'user' || !/^U[0-9a-f]{32}$/i.test(event.source?.userId || '')) {
      await respond(event, notice('請從個人聊天回覆', '請在樂程坊官方帳號的一對一聊天室，使用原本收到的課程提醒。'));
      return;
    }
    const response = params.get('response');
    const token = params.get('token');
    if (['action', 'response', 'token'].some(key => params.getAll(key).length !== 1) ||
        !['attend', 'pending'].includes(response) || !token?.trim() || token.length > 512) {
      await respond(event, notice('這個按鈕無法使用', '請使用最新課程提醒，或從原卡片的「家長入口」查看課程。此次未提交回覆。'));
      return;
    }
    const url = apiUrl(env.CLASS_REMINDER_API_BASE_URL ?? env.UNIFIED_STUDENT_API_URL);
    if (!url || !env.STUDENT_API_KEY || !env.INTERNAL_GATEWAY_SECRET) {
      logger.warn('[class-reminder] configuration_missing');
      await respond(event, notice('回覆服務暫時無法使用', '此次尚未提交回覆。請從原卡片的「家長入口」查看課程，或聯繫樂程坊。'));
      return;
    }
    let result;
    try {
      result = await post(url, { token, response, source_line_user_id: event.source.userId }, {
        headers: { 'Content-Type': 'application/json', 'X-API-Key': env.STUDENT_API_KEY,
          'X-Internal-Gateway-Secret': env.INTERNAL_GATEWAY_SECRET },
        timeout: 8000, maxRedirects: 0, maxContentLength: 65536, validateStatus: () => true,
      });
    } catch {
      logger.warn('[class-reminder] persistence_unknown');
      await respond(event, notice('尚未確認儲存結果', '連線暫時中斷，暫時無法確認是否已儲存。請先查看家長入口的課程狀態。', false, 'unknown'));
      return;
    }
    const record = result?.data?.data;
    const status = result?.status;
    if (status !== 200 || result?.data?.success !== true || !record ||
        !Number.isSafeInteger(record.target_id) || record.target_id <= 0 || record.response !== response) {
      logger.warn('[class-reminder] persistence_unconfirmed', { status });
      const stale = [400, 409, 410].includes(status);
      await respond(event, stale
        ? notice('請查看最新課程', '這張提醒可能已過期，或課程已有異動。請開啟家長入口，確認目前安排。', false, 'stale')
        : notice('尚未確認儲存結果', '暫時無法確認是否已儲存。請先查看家長入口；若仍有疑問，請聯繫樂程坊。', false, 'unknown'));
      return;
    }
    logger.info('[class-reminder] response_saved', { target_id: record.target_id, response });
    const message = validFlex(record.flex_message) ? record.flex_message : notice(
      response === 'attend' ? '已登記會到' : '已登記待確認',
      response === 'attend' ? '這是到課意願，實際出席以老師點名為準。' : '您可以再透過原提醒更新回覆；實際出席以老師點名為準。', true);
    await respond(event, message);
  }

  return async function reminderWebhook(req, res, next) {
    const events = Array.isArray(req.body?.events) ? req.body.events : [];
    if (!events.some(reminderParams)) return next();
    if (!hasValidSignature(req, env.LINE_CHANNEL_SECRET)) {
      logger.warn('[class-reminder] signature_rejected');
      return res.status(403).send('Forbidden');
    }
    const remaining = events.filter(event => !reminderParams(event));
    const current = now();
    for (const [key, entry] of seen) if (entry.expires <= current && entry.done) seen.delete(key);
    // 不留原始 token、UID 或整包請求日誌，也不讓 legacy 再解析新 postback。
    req.body = { ...req.body, events: remaining };
    const processing = Promise.all(events.filter(reminderParams).map(event => {
      const key = crypto.createHash('sha256').update(String(event.webhookEventId || event.replyToken || '')).digest('hex');
      if (seen.has(key)) return seen.get(key).promise;
      if (seen.size >= 10000) {
        logger.warn('[class-reminder] dedup_capacity');
        return event.replyToken && env.LINE_CHANNEL_ACCESS_TOKEN
          ? respond(event, notice('回覆服務忙碌中', '此次尚未提交回覆，請稍後再點原提醒。')) : undefined;
      }
      const entry = { expires: current + ttl, done: false };
      // 同一家長依接收順序執行，避免慢的舊回覆覆蓋新的選擇。
      const userKey = crypto.createHash('sha256').update(String(event.source?.userId || key)).digest('hex');
      const previous = userQueues.get(userKey) || Promise.resolve();
      entry.promise = previous.then(() => processEvent(event, reminderParams(event))).catch(() => {
        logger.warn('[class-reminder] processing_failed');
      }).finally(() => {
        entry.done = true;
        if (userQueues.get(userKey) === entry.promise) userQueues.delete(userKey);
      });
      userQueues.set(userKey, entry.promise);
      seen.set(key, entry);
      return entry.promise;
    }));
    // 舊付款事件仍立即進入既有 pre-ACK enqueue，不等提醒 API 或 LINE。
    if (remaining.length) next();
    await processing;
    if (remaining.length) return undefined;
    return res.status(200).send('OK');
  };
}

module.exports = { captureRawBody, createReminderWebhook };
