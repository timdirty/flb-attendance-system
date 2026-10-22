/** 顧店轉送與 webhook 守門：flbbot 固定接收 LINE webhook，顧店需要的事件帶簽章轉送過去。 */
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ENDPOINT_URL = 'https://api.line.me/v2/bot/channel/webhook/endpoint';
const DEFAULT_CANONICAL_URL = 'https://flbbot.funlearnbar.synology.me/webhook';
// 顧店 App 的 cloudflared quick tunnel；只接受這個形狀，存檔被改也不會變成任意轉送。
const TUNNEL_TARGET = /^https:\/\/[a-z0-9]+(?:-[a-z0-9]+)*\.trycloudflare\.com\/webhook\/default$/;
const MAX_IN_FLIGHT = 50;
// 顧店只在 tunnel 重啟時改 webhook；超過上限代表在互搶，暫停到一小時視窗過去再收回。
const RECLAIM_LIMIT_PER_HOUR = 12;
const HOUR = 60 * 60 * 1000;

function sign(raw, secret) {
  return crypto.createHmac('sha256', secret).update(raw).digest('base64');
}

function hasValidSignature(raw, signature, secret) {
  if (!secret || !Buffer.isBuffer(raw) || typeof signature !== 'string' ||
      !/^[A-Za-z0-9+/]{43}=$/.test(signature)) return false;
  const expected = crypto.createHmac('sha256', secret).update(raw).digest();
  const actual = Buffer.from(signature, 'base64');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

// 提醒回條、請假、付款等 postback 只由 flbbot 處理，避免兩邊搶用同一個 replyToken。
function gudianOwns(event) {
  if (event?.type !== 'postback') return true;
  return typeof event.postback?.data === 'string' && event.postback.data.startsWith('gudian:');
}

function hostOf(url) {
  try { return new URL(url).host; } catch { return 'invalid'; }
}

function isAllowedTarget(url, env) {
  if (typeof url !== 'string') return false;
  if (TUNNEL_TARGET.test(url)) return true;
  // 顧店改用固定網址時由部署環境明確指定，仍限 https。
  return Boolean(env.GUDIAN_RELAY_URL) && url === env.GUDIAN_RELAY_URL && url.startsWith('https://');
}

function createStateStore(file, logger = console) {
  let state = {};
  try {
    state = JSON.parse(fs.readFileSync(file, 'utf8')) || {};
  } catch (error) {
    if (error.code !== 'ENOENT') logger.warn('[gudian-relay] state_unreadable');
  }
  return {
    get: () => state,
    update(section, patch) {
      state = { ...state, [section]: { ...(state[section] || {}), ...patch } };
      try {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        const tmp = `${file}.tmp`;
        fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
        fs.renameSync(tmp, file);
      } catch {
        logger.warn('[gudian-relay] state_write_failed');
      }
    },
  };
}

function createGudianRelay({ post, store, env = process.env, logger = console, now = Date.now, defer = setImmediate }) {
  let inFlight = 0;

  function target() {
    const url = env.GUDIAN_RELAY_URL || store.get().target?.url;
    return isAllowedTarget(url, env) ? url : null;
  }

  function payload(req) {
    const signature = req.headers?.['x-line-signature'];
    if (!hasValidSignature(req.rawBody, signature, env.LINE_CHANNEL_SECRET)) return null;
    const events = Array.isArray(req.body?.events) ? req.body.events : [];
    const selected = events.filter(gudianOwns);
    if (!selected.length) return null;
    // 全部都給顧店時送原始 bytes，顧店用同一把 channel secret 驗得過原簽章。
    if (selected.length === events.length) return { raw: req.rawBody, signature, count: selected.length };
    const raw = Buffer.from(JSON.stringify({ ...req.body, events: selected }));
    return { raw, signature: sign(raw, env.LINE_CHANNEL_SECRET), count: selected.length };
  }

  async function send(url, data) {
    inFlight += 1;
    const at = new Date(now()).toISOString();
    try {
      const result = await post(url, data.raw, {
        headers: { 'Content-Type': 'application/json', 'X-Line-Signature': data.signature },
        timeout: 55000, maxRedirects: 0, maxContentLength: 65536, validateStatus: () => true,
        transformRequest: [body => body],
      });
      const ok = result?.status >= 200 && result?.status < 300;
      if (!ok) logger.warn('[gudian-relay] relay_rejected', { status: result?.status, host: hostOf(url) });
      const counts = store.get().relay || {};
      store.update('relay', { lastAt: at, lastStatus: result?.status ?? null, host: hostOf(url),
        okCount: (counts.okCount || 0) + (ok ? 1 : 0), failCount: (counts.failCount || 0) + (ok ? 0 : 1) });
    } catch (error) {
      // 不印 axios error 物件，裡面有請求內容與簽章。
      logger.warn('[gudian-relay] relay_failed', { code: error?.code || 'unknown', host: hostOf(url) });
      const counts = store.get().relay || {};
      store.update('relay', { lastAt: at, lastStatus: error?.code || 'error', host: hostOf(url),
        failCount: (counts.failCount || 0) + 1 });
    } finally {
      inFlight -= 1;
    }
  }

  function middleware(req, res, next) {
    try {
      const url = env.GUDIAN_RELAY === 'off' ? null : target();
      const data = url && payload(req);
      if (data && inFlight >= MAX_IN_FLIGHT) {
        logger.warn('[gudian-relay] in_flight_limit');
      } else if (data) {
        // 先讓 flbbot 照常 ACK 與處理，轉送在背景跑，不拖慢 LINE 回應。
        defer(() => { send(url, data); });
      }
    } catch {
      logger.warn('[gudian-relay] relay_skipped');
    }
    next();
  }

  return { middleware, target, inFlight: () => inFlight };
}

function createWebhookGuard({ http, store, env = process.env, logger = console, now = Date.now }) {
  const canonical = env.LINE_WEBHOOK_CANONICAL_URL || DEFAULT_CANONICAL_URL;
  const reclaims = [];
  let running = false;

  function record(patch) {
    store.update('guard', { lastCheckAt: new Date(now()).toISOString(), ...patch });
  }

  async function check() {
    if (running) return;
    running = true;
    const base = { timeout: 10000, maxRedirects: 0, maxContentLength: 65536, validateStatus: () => true };
    const auth = { Authorization: `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}` };
    try {
      const read = await http.get(ENDPOINT_URL, { ...base, headers: auth });
      const endpoint = read?.data?.endpoint;
      if (read?.status !== 200 || typeof endpoint !== 'string') {
        logger.warn('[webhook-guard] read_failed', { status: read?.status });
        record({ state: 'unknown', lastReadStatus: read?.status ?? null });
        return;
      }
      if (endpoint === canonical) {
        if (store.get().guard?.state !== 'owned') logger.info('[webhook-guard] owned');
        record({ state: 'owned', endpointHost: hostOf(endpoint), lastReadStatus: 200 });
        return;
      }
      if (!TUNNEL_TARGET.test(endpoint)) {
        // 不是顧店 tunnel 就不碰，可能是人工改的，只留紀錄。
        logger.warn('[webhook-guard] unexpected_endpoint', { host: hostOf(endpoint) });
        record({ state: 'unexpected', endpointHost: hostOf(endpoint), lastReadStatus: 200 });
        return;
      }
      // 顧店 tunnel 重啟會把 webhook 改成新網址：記成轉送目標，再收回 flbbot。
      store.update('target', { url: endpoint, recordedAt: new Date(now()).toISOString() });
      const current = now();
      while (reclaims.length && reclaims[0] <= current - HOUR) reclaims.shift();
      if (reclaims.length >= RECLAIM_LIMIT_PER_HOUR) {
        logger.warn('[webhook-guard] reclaim_limited', { host: hostOf(endpoint) });
        record({ state: 'contested', endpointHost: hostOf(endpoint), lastReadStatus: 200 });
        return;
      }
      reclaims.push(current);
      const write = await http.put(ENDPOINT_URL, { endpoint: canonical },
        { ...base, headers: { ...auth, 'Content-Type': 'application/json' } });
      if (write?.status === 200) {
        logger.warn('[webhook-guard] reclaimed', { from: hostOf(endpoint) });
        record({ state: 'owned', endpointHost: hostOf(canonical), lastReclaimAt: new Date(current).toISOString(),
          lastReclaimFrom: hostOf(endpoint), lastReadStatus: 200 });
      } else {
        logger.warn('[webhook-guard] reclaim_failed', { status: write?.status });
        record({ state: 'contested', endpointHost: hostOf(endpoint), lastReclaimStatus: write?.status ?? null });
      }
    } catch (error) {
      logger.warn('[webhook-guard] check_failed', { code: error?.code || 'unknown' });
      record({ state: 'unknown' });
    } finally {
      running = false;
    }
  }

  function start({ every = setInterval, after = setTimeout } = {}) {
    if (env.LINE_WEBHOOK_GUARD === 'off' || !env.LINE_CHANNEL_ACCESS_TOKEN) {
      logger.warn('[webhook-guard] disabled');
      return null;
    }
    // 顧店搶走到收回之間的事件不會到 flbbot，間隔越短遺失越少。
    const interval = Math.max(10000, Number(env.LINE_WEBHOOK_GUARD_INTERVAL_MS) || 15000);
    after(check, 3000)?.unref?.();
    const timer = every(check, interval);
    timer?.unref?.();
    return timer;
  }

  return { check, start, canonical };
}

function healthSummary(store) {
  const state = store.get();
  return {
    webhookOwner: state.guard?.state || 'unknown',
    gudianRelayTarget: Boolean(state.target?.url),
    gudianRelayLastStatus: state.relay?.lastStatus ?? null,
  };
}

module.exports = {
  createGudianRelay, createWebhookGuard, createStateStore, healthSummary,
  gudianOwns, sign, TUNNEL_TARGET, DEFAULT_CANONICAL_URL,
};
