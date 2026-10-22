const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  createGudianRelay, createWebhookGuard, createStateStore, healthSummary, sign, DEFAULT_CANONICAL_URL,
} = require('../src/gudian-relay');

const SECRET = 'test-channel-secret';
const TUNNEL = 'https://computational-exploration-birds-animal.trycloudflare.com/webhook/default';
const silent = { info() {}, warn() {} };

function memoryStore(initial = {}) {
  let state = initial;
  return {
    get: () => state,
    update(section, patch) { state = { ...state, [section]: { ...(state[section] || {}), ...patch } }; },
  };
}

function webhookRequest(events, { secret = SECRET, signature } = {}) {
  const raw = Buffer.from(JSON.stringify({ destination: 'U0123456789abcdef0123456789abcdef', events }));
  return {
    rawBody: raw,
    body: JSON.parse(raw.toString('utf8')),
    headers: { 'x-line-signature': signature ?? sign(raw, secret) },
  };
}

const text = (id = '01HTEXT') => ({ type: 'message', webhookEventId: id, message: { type: 'text', text: '請問課程' },
  source: { type: 'user', userId: 'U' + 'a'.repeat(32) }, replyToken: 'r1', timestamp: 1 });
const reminder = { type: 'postback', webhookEventId: '01HPOST', postback: { data: 'action=class_reminder_response&response=attend&token=t' },
  source: { type: 'user', userId: 'U' + 'b'.repeat(32) }, replyToken: 'r2', timestamp: 1 };
const gudianPostback = { type: 'postback', webhookEventId: '01HGUD', postback: { data: 'gudian:menu' },
  source: { type: 'user', userId: 'U' + 'c'.repeat(32) }, replyToken: 'r3', timestamp: 1 };

function harness({ store = memoryStore({ target: { url: TUNNEL } }), env = {}, post } = {}) {
  const calls = [];
  const deferred = [];
  const relay = createGudianRelay({
    post: post || (async (url, data, options) => { calls.push({ url, data, options }); return { status: 200 }; }),
    store, env: { LINE_CHANNEL_SECRET: SECRET, ...env }, logger: silent, defer: fn => deferred.push(fn),
  });
  const run = async req => {
    let nextCalls = 0;
    relay.middleware(req, {}, () => { nextCalls += 1; });
    for (const fn of deferred.splice(0)) fn();
    await new Promise(resolve => setImmediate(resolve));
    return nextCalls;
  };
  return { relay, calls, run, store };
}

test('全部事件給顧店時原樣轉送原始 bytes 與原簽章', async () => {
  const { calls, run } = harness();
  const req = webhookRequest([text()]);
  assert.equal(await run(req), 1);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, TUNNEL);
  assert.ok(Buffer.isBuffer(calls[0].data));
  assert.ok(calls[0].data.equals(req.rawBody));
  assert.equal(calls[0].options.headers['X-Line-Signature'], req.headers['x-line-signature']);
  assert.equal(calls[0].options.transformRequest[0](calls[0].data), calls[0].data);
});

test('混有 flbbot 專屬 postback 時只轉送顧店事件並重新簽章', async () => {
  const { calls, run } = harness();
  const req = webhookRequest([reminder, text(), gudianPostback]);
  await run(req);
  assert.equal(calls.length, 1);
  const sent = JSON.parse(calls[0].data.toString('utf8'));
  assert.deepEqual(sent.events.map(event => event.webhookEventId), ['01HTEXT', '01HGUD']);
  assert.equal(sent.destination, req.body.destination);
  const expected = crypto.createHmac('sha256', SECRET).update(calls[0].data).digest('base64');
  assert.equal(calls[0].options.headers['X-Line-Signature'], expected);
});

test('只有提醒回條 postback 時不轉送', async () => {
  const { calls, run } = harness();
  assert.equal(await run(webhookRequest([reminder])), 1);
  assert.equal(calls.length, 0);
});

test('簽章不對或空事件時不轉送，但照常交給 flbbot', async () => {
  const { calls, run } = harness();
  assert.equal(await run(webhookRequest([text()], { signature: sign(Buffer.from('other'), SECRET) })), 1);
  assert.equal(await run(webhookRequest([text()], { secret: 'wrong' })), 1);
  assert.equal(await run(webhookRequest([])), 1);
  assert.equal(calls.length, 0);
});

test('沒有轉送目標、目標不是顧店 tunnel 或明確關閉時不轉送', async () => {
  for (const options of [
    { store: memoryStore() },
    { store: memoryStore({ target: { url: 'https://evil.example.com/webhook/default' } }) },
    { store: memoryStore({ target: { url: 'http://abc.trycloudflare.com/webhook/default' } }) },
    { env: { GUDIAN_RELAY: 'off' } },
  ]) {
    const { calls, run } = harness(options);
    assert.equal(await run(webhookRequest([text()])), 1);
    assert.equal(calls.length, 0);
  }
});

test('部署環境明確指定的 https 固定網址可當轉送目標', async () => {
  const fixed = 'https://gudian.example.com/webhook/default';
  const { calls, run } = harness({ store: memoryStore(), env: { GUDIAN_RELAY_URL: fixed } });
  await run(webhookRequest([text()]));
  assert.equal(calls[0].url, fixed);
});

test('轉送失敗或被拒不影響 flbbot，並記錄狀態', async () => {
  const failing = harness({ post: async () => { const error = new Error('down'); error.code = 'ENOTFOUND'; throw error; } });
  assert.equal(await failing.run(webhookRequest([text()])), 1);
  assert.equal(failing.store.get().relay.lastStatus, 'ENOTFOUND');
  assert.equal(failing.store.get().relay.failCount, 1);
  const rejected = harness({ post: async () => ({ status: 401 }) });
  await rejected.run(webhookRequest([text()]));
  assert.equal(rejected.store.get().relay.lastStatus, 401);
  assert.equal(rejected.store.get().relay.failCount, 1);
});

test('同時轉送中的請求有上限，避免顧店卡住時堆積', async () => {
  const pending = [];
  const { relay, run } = harness({ post: () => new Promise(resolve => pending.push(resolve)) });
  for (let i = 0; i < 55; i += 1) await run(webhookRequest([text(`01H${i}`)]));
  assert.equal(relay.inFlight(), 50);
  pending.forEach(resolve => resolve({ status: 200 }));
});

function guardHarness({ endpoint, putStatus = 200, getStatus = 200, env = {}, store = memoryStore(), clock } = {}) {
  const puts = [];
  let current = endpoint;
  const guard = createWebhookGuard({
    http: {
      get: async (url, options) => {
        assert.match(options.headers.Authorization, /^Bearer /);
        return { status: getStatus, data: { endpoint: current, active: true } };
      },
      put: async (url, body) => { puts.push(body); if (putStatus === 200) current = body.endpoint; return { status: putStatus }; },
    },
    store, env: { LINE_CHANNEL_ACCESS_TOKEN: 'token', ...env }, logger: silent, now: clock || (() => 1_000_000),
  });
  return { guard, puts, store, setEndpoint: url => { current = url; } };
}

test('webhook 已在 flbbot 時不改設定', async () => {
  const { guard, puts, store } = guardHarness({ endpoint: DEFAULT_CANONICAL_URL });
  await guard.check();
  assert.equal(puts.length, 0);
  assert.equal(store.get().guard.state, 'owned');
});

test('被顧店 tunnel 搶走時記下轉送目標並收回', async () => {
  const { guard, puts, store } = guardHarness({ endpoint: TUNNEL });
  await guard.check();
  assert.deepEqual(puts, [{ endpoint: DEFAULT_CANONICAL_URL }]);
  assert.equal(store.get().target.url, TUNNEL);
  assert.equal(store.get().guard.state, 'owned');
  assert.equal(store.get().guard.lastReclaimFrom, new URL(TUNNEL).host);
});

test('未知網址只記錄不動', async () => {
  const { guard, puts, store } = guardHarness({ endpoint: 'https://aibot.funlearnbar.synology.me/webhook' });
  await guard.check();
  assert.equal(puts.length, 0);
  assert.equal(store.get().guard.state, 'unexpected');
  assert.equal(store.get().target, undefined);
});

test('讀取失敗時不改設定', async () => {
  const { guard, puts, store } = guardHarness({ endpoint: TUNNEL, getStatus: 401 });
  await guard.check();
  assert.equal(puts.length, 0);
  assert.equal(store.get().guard.state, 'unknown');
});

test('收回失敗記成 contested', async () => {
  const { guard, store } = guardHarness({ endpoint: TUNNEL, putStatus: 403 });
  await guard.check();
  assert.equal(store.get().guard.state, 'contested');
  assert.equal(store.get().target.url, TUNNEL);
});

test('一小時內最多收回 12 次，避免和顧店互搶', async () => {
  let now = 0;
  const { guard, puts, store, setEndpoint } = guardHarness({ endpoint: TUNNEL, clock: () => now });
  for (let i = 0; i < 14; i += 1) {
    setEndpoint(TUNNEL);
    now += 60_000 / 4;
    await guard.check();
  }
  assert.equal(puts.length, 12);
  assert.equal(store.get().guard.state, 'contested');
  now += 60 * 60 * 1000;
  setEndpoint(TUNNEL);
  await guard.check();
  assert.equal(puts.length, 13);
});

test('沒有 token 或明確關閉時不啟動守門', () => {
  for (const env of [{ LINE_CHANNEL_ACCESS_TOKEN: '' }, { LINE_WEBHOOK_GUARD: 'off' }]) {
    const guard = createWebhookGuard({ http: {}, store: memoryStore(), env, logger: silent });
    assert.equal(guard.start({ every: () => assert.fail('started'), after: () => assert.fail('started') }), null);
  }
});

test('狀態存檔可重新載入，健康檢查只露出布林與狀態碼', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gudian-relay-'));
  const file = path.join(dir, 'state.json');
  const store = createStateStore(file, silent);
  store.update('target', { url: TUNNEL });
  store.update('guard', { state: 'owned' });
  const reloaded = createStateStore(file, silent);
  assert.equal(reloaded.get().target.url, TUNNEL);
  assert.deepEqual(healthSummary(reloaded), { webhookOwner: 'owned', gudianRelayTarget: true, gudianRelayLastStatus: null });
  assert.ok(!JSON.stringify(healthSummary(reloaded)).includes('trycloudflare'));
  fs.rmSync(dir, { recursive: true, force: true });
});
