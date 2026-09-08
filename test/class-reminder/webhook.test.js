const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const { createReminderWebhook, captureRawBody } = require('../../src/class-reminder-webhook');

const uid = `U${'1'.repeat(32)}`;
const env = {
  LINE_CHANNEL_SECRET: 'test-channel-secret',
  LINE_CHANNEL_ACCESS_TOKEN: 'test-parent-token',
  UNIFIED_STUDENT_API_URL: 'https://course.test',
  STUDENT_API_KEY: 'test-api-key',
  INTERNAL_GATEWAY_SECRET: 'test-internal-secret',
};
const flex = {
  type: 'flex', altText: '已登記會到｜測試學生',
  contents: { type: 'bubble', size: 'kilo', body: {
    type: 'box', layout: 'vertical', contents: [{ type: 'text', text: '已登記會到', wrap: true }],
  } },
};
const success = (response = 'attend') => ({
  status: 200, data: { success: true, data: { target_id: 42, response,
    confirm: '已登記會到，實際出席以老師點名為準。', flex_message: flex } },
});
function event(overrides = {}) {
  return { type: 'postback', webhookEventId: 'event-1', replyToken: 'test-reply',
    source: { type: 'user', userId: uid },
    postback: { data: 'action=class_reminder_response&response=attend&token=signed.test-token' }, ...overrides };
}
function request(events) {
  const body = { destination: `U${'2'.repeat(32)}`, events };
  const rawBody = Buffer.from(JSON.stringify(body));
  const signature = crypto.createHmac('sha256', env.LINE_CHANNEL_SECRET).update(rawBody).digest('base64');
  return { body, rawBody, headers: { 'x-line-signature': signature } };
}
function harness(options = {}) {
  const calls = [], logs = [];
  const post = async (...args) => {
    calls.push(args);
    if (args[0].endsWith('/reply')) {
      if (options.replyError) throw new Error('sensitive-reply-failure');
      return { status: options.replyStatus || 200, data: {} };
    }
    if (options.apiError) throw new Error('sensitive-api-failure');
    return Object.hasOwn(options, 'apiResult') ? options.apiResult : success(options.response);
  };
  const middleware = createReminderWebhook({ post, env: { ...env, ...options.env },
    logger: { info: (...a) => logs.push(a), warn: (...a) => logs.push(a) } });
  const run = async (req) => {
    const state = { next: 0, status: null };
    const res = { status(code) { state.status = code; return this; }, send() { state.sent = true; } };
    await middleware(req, res, () => { state.next++; });
    return state;
  };
  return { calls, logs, run };
}
const replyMessage = h => h.calls.find(c => c[0].endsWith('/reply'))?.[1].messages[0];

test('提醒可獨立使用正式 API prefix，不修改既有付款 base', async () => {
  const h=harness({env:{CLASS_REMINDER_API_BASE_URL:'https://course.test/student-api/'}});
  await h.run(request([event()]));
  assert.equal(h.calls[0][0],'https://course.test/student-api/api/internal/class-reminder-responses');
  assert.deepEqual(replyMessage(h),flex);
  assert.equal(env.UNIFIED_STUDENT_API_URL,'https://course.test');
});

test('獨立提醒 API 設定非法時 fail closed，不回退到其他入口', async () => {
  const h=harness({env:{CLASS_REMINDER_API_BASE_URL:'http://outside.test'}});
  await h.run(request([event()]));
  assert.equal(h.calls.filter(c=>!c[0].endsWith('/reply')).length,0);
  assert.equal(replyMessage(h).type,'flex');
  assert.equal(replyMessage(h).altText,'回覆服務暫時無法使用');
});

test('既有 Docker 內網穩定 API alias 可由提醒專用 base 使用', async () => {
  const h=harness({env:{CLASS_REMINDER_API_BASE_URL:'http://funlearnbar-student-api:5004'}});
  await h.run(request([event()]));
  assert.equal(h.calls[0][0],'http://funlearnbar-student-api:5004/api/internal/class-reminder-responses');
  assert.deepEqual(replyMessage(h),flex);
});

for(const base of ['http://funlearnbar-student-api:5005','http://funlearnbar-student-api:5004/other','http://funlearnbar-student-api.evil.test:5004','http://172.17.0.1:5004']) test(`內網例外不擴張到 ${base}`, async()=>{
  const h=harness({env:{CLASS_REMINDER_API_BASE_URL:base}});
  await h.run(request([event()]));
  assert.equal(h.calls.filter(c=>!c[0].endsWith('/reply')).length,0);
});

test('簽章原文保留，不以重新 JSON stringify 取代', () => {
  const req = {};
  const raw = Buffer.from('{ "events": [] }');
  captureRawBody(req, {}, raw);
  assert.deepEqual(req.rawBody, raw);
});

for (const response of ['attend', 'pending']) test(`完整 ${response} 回覆 API 後由同帳號 reply Flex`, async () => {
  const h = harness({ response });
  const e = event({ postback: { data: `action=class_reminder_response&response=${response}&token=signed.test-token&source_line_user_id=forged` } });
  assert.equal((await h.run(request([e]))).status, 200);
  assert.equal(h.calls.length, 2);
  const [url, payload, config] = h.calls[0];
  assert.equal(url, 'https://course.test/api/internal/class-reminder-responses');
  assert.deepEqual(payload, { token: 'signed.test-token', response, source_line_user_id: uid });
  assert.equal(config.headers['X-API-Key'], env.STUDENT_API_KEY);
  assert.equal(config.headers['X-Internal-Gateway-Secret'], env.INTERNAL_GATEWAY_SECRET);
  assert.equal(config.maxRedirects, 0);
  assert.equal(config.timeout, 8000);
  assert.equal(h.calls[1][0], 'https://api.line.me/v2/bot/message/reply');
  assert.equal(h.calls[1][2].headers.Authorization, `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`);
  assert.deepEqual(replyMessage(h), flex);
});

for (const mutation of ['missing', 'wrong', 'tampered', 'missingRaw']) test(`偽造或遺失簽章 ${mutation} 不寫入、不回覆、不進 legacy`, async () => {
  const h = harness(); const req = request([event()]);
  if (mutation === 'missing') delete req.headers['x-line-signature'];
  if (mutation === 'wrong') req.headers['x-line-signature'] = 'x'.repeat(44);
  if (mutation === 'tampered') req.rawBody = Buffer.from('{}');
  if (mutation === 'missingRaw') delete req.rawBody;
  const state = await h.run(req);
  assert.equal(state.status, 403); assert.equal(state.next, 0); assert.equal(h.calls.length, 0);
});

test('混合事件只消費新提醒，其餘原樣交回 legacy；不洩漏新 token', async () => {
  const h = harness(); const legacy = { type: 'postback', postback: { data: '{"action":"leave"}' } };
  const req = request([event(), legacy, { type: 'message', message: { type: 'text', text: '#出缺勤' } }]);
  assert.equal((await h.run(req)).next, 1);
  assert.deepEqual(req.body.events, [legacy, { type: 'message', message: { type: 'text', text: '#出缺勤' } }]);
  assert.ok(!JSON.stringify(req.body).includes('signed.test-token'));
});
test('純舊版事件不改寫、不新增驗簽需求', async () => {
  const h = harness(); const req = request([{ type: 'postback', postback: { data: '{"action":"attend"}' } }]);
  delete req.headers['x-line-signature']; const body = req.body;
  assert.equal((await h.run(req)).next, 1); assert.equal(req.body, body); assert.equal(h.calls.length, 0);
});
test('LINE channel secret 缺少時 fail closed，不退回 legacy', async () => {
  const h = harness({ env: { LINE_CHANNEL_SECRET: '' } });
  const state = await h.run(request([event()]));
  assert.equal(state.status, 403); assert.equal(state.next, 0); assert.equal(h.calls.length, 0);
});
for (const data of [
  'action=class_reminder_response&response=leave&token=x',
  'action=class_reminder_response&response=attend',
  'action=class_reminder_response&response=attend&response=pending&token=x',
  'action=class_reminder_response&action=leave&response=attend&token=x',
  `action=class_reminder_response&response=attend&token=${'x'.repeat(513)}`,
]) test(`不完整或歧義參數只回無成功宣告的 Flex：${data.slice(0, 65)}`, async () => {
  const h = harness(); await h.run(request([event({ postback: { data } })]));
  assert.equal(h.calls.length, 1); assert.equal(replyMessage(h).type, 'flex');
  assert.ok(!JSON.stringify(replyMessage(h)).includes('已登記會到'));
});
for (const source of [{ type: 'group', userId: uid }, { type: 'user', userId: 'forged' }, null]) test(`無可信個人來源不寫 API：${JSON.stringify(source)}`, async () => {
  const h = harness(); await h.run(request([event({ source })]));
  assert.equal(h.calls.filter(c => !c[0].endsWith('/reply')).length, 0);
});
test('沒有 replyToken 不做無聲寫入', async () => {
  const h = harness(); await h.run(request([event({ replyToken: '' })])); assert.equal(h.calls.length, 0);
});
for (const status of [400, 401, 403, 409, 500, 503]) test(`API ${status} 有 Flex，但不聲稱成功`, async () => {
  const h = harness({ apiResult: { status, data: { error: 'private API detail' } } });
  await h.run(request([event()])); const message = replyMessage(h);
  assert.equal(message.type, 'flex'); assert.ok(!JSON.stringify(message).includes('已登記'));
  assert.ok(!JSON.stringify(message).includes('private API detail'));
});
test('API timeout 的結果未知，不宣稱已儲存或絕對未寫入', async () => {
  const h = harness({ apiError: true }); await h.run(request([event()]));
  assert.match(JSON.stringify(replyMessage(h)), /尚未確認儲存結果/);
  assert.equal(h.calls.length, 2);
});
test('已儲存但 renderer 缺少 Flex 仍用小型 Flex 確認', async () => {
  const result = success(); delete result.data.data.flex_message;
  const h = harness({ apiResult: result }); await h.run(request([event()]));
  assert.equal(replyMessage(h).type, 'flex'); assert.match(JSON.stringify(replyMessage(h)), /已登記會到/);
  assert.match(JSON.stringify(replyMessage(h)), /實際出席以老師點名為準/);
});
for (const result of [{ status: 200, data: { success: false } }, { status: 200, data: {} }, success('pending')]) test('拒絕成功旗標或回覆狀態不符的 API 格式', async () => {
  const h = harness({ apiResult: result }); await h.run(request([event()]));
  assert.ok(!JSON.stringify(replyMessage(h)).includes('已登記會到'));
});
for (const key of ['INTERNAL_GATEWAY_SECRET', 'STUDENT_API_KEY', 'UNIFIED_STUDENT_API_URL']) test(`缺設定 ${key} 不寫 API、有問題 Flex`, async () => {
  const h = harness({ env: { [key]: '' } }); await h.run(request([event()]));
  assert.equal(h.calls.length, 1); assert.equal(replyMessage(h).type, 'flex');
});
test('API URL 非 HTTPS 不傳憑證', async () => {
  const h = harness({ env: { UNIFIED_STUDENT_API_URL: 'http://outside.test' } });
  await h.run(request([event()])); assert.equal(h.calls.length, 1);
});
for (const failure of [{ replyError: true }, { replyStatus: 400 }]) test('LINE reply 失敗記錄但不多帳號重試或 push', async () => {
  const h = harness(failure); await h.run(request([event()]));
  assert.equal(h.calls.length, 2); assert.match(JSON.stringify(h.logs), /reply_failed/);
  assert.ok(!JSON.stringify(h.logs).includes('sensitive-'));
});
test('同一 webhook event 並行重送只儲存和回覆一次', async () => {
  const h = harness(); await Promise.all([h.run(request([event()])), h.run(request([event()]))]);
  assert.equal(h.calls.length, 2);
});
test('同一家長快速改回覆按接收順序儲存，避免較慢舊請求覆蓋最新選擇', async () => {
  let releaseFirst;
  const waiting = new Promise(resolve => { releaseFirst = resolve; });
  const persisted = [];
  const post = async (url, payload) => {
    if (url.endsWith('/reply')) return { status: 200 };
    if (payload.response === 'attend') await waiting;
    persisted.push(payload.response); return success(payload.response);
  };
  const middleware = createReminderWebhook({ post, env, logger: { info() {}, warn() {} } });
  const res = { status() { return this; }, send() {} };
  const first = middleware(request([event()]), res, () => {});
  const second = middleware(request([event({ webhookEventId: 'second', replyToken: 'second-reply',
    postback: { data: 'action=class_reminder_response&response=pending&token=second-token' } })]), res, () => {});
  await new Promise(resolve => setImmediate(resolve));
  const beforeRelease = [...persisted];
  releaseFirst(); await Promise.all([first, second]);
  assert.deepEqual(beforeRelease, []);
  assert.deepEqual(persisted, ['attend', 'pending']);
});
test('混合包不等待提醒 API 才讓舊付款事件進 enqueue', async () => {
  let finish;
  const waiting = new Promise(resolve => { finish = resolve; });
  const post = async url => { if (!url.endsWith('/reply')) await waiting; return success(); };
  const middleware = createReminderWebhook({ post, env, logger: { info() {}, warn() {} } });
  let legacy = false;
  const running = middleware(request([event(), { type: 'message', message: { type: 'text', text: '已匯款' } }]),
    { status() { return this; }, send() {} }, () => { legacy = true; });
  await new Promise(resolve => setImmediate(resolve));
  const earlyLegacy = legacy; finish(); await running;
  assert.equal(earlyLegacy, true);
});
test('新的實際點擊仍可把會到改為待確認', async () => {
  const h = harness(); await h.run(request([event()]));
  await h.run(request([event({ webhookEventId: 'event-2', replyToken: 'reply-2',
    postback: { data: 'action=class_reminder_response&response=pending&token=signed.pending-token' } })]));
  assert.equal(h.calls.length, 4);
  assert.equal(h.calls[2][1].response, 'pending');
});
test('API transport 回 null 不讓 Express middleware 無回應', async () => {
  const h = harness({ apiResult: null });
  assert.equal((await h.run(request([event()]))).status, 200);
  assert.equal(replyMessage(h).type, 'flex');
});
test('完整 signed raw bytes 的 Unicode/空白仍通過，修改後拒絕', async () => {
  const h = harness(); const req = request([event()]);
  req.rawBody = Buffer.from(JSON.stringify(req.body, null, 2));
  req.headers['x-line-signature'] = crypto.createHmac('sha256', env.LINE_CHANNEL_SECRET).update(req.rawBody).digest('base64');
  assert.equal((await h.run(req)).status, 200);
});
test('來源含 room 不得向群組回個人資料', async () => {
  const h = harness(); await h.run(request([event({ source: { type: 'room', userId: uid } })]));
  assert.equal(h.calls.length, 1); assert.ok(!JSON.stringify(replyMessage(h)).includes('測試學生'));
});
test('稽核日誌不含 UID、response token、reply token 或憑證', async () => {
  const h = harness({ apiError: true }); await h.run(request([event()]));
  const log = JSON.stringify(h.logs);
  for (const sensitive of [uid, 'signed.test-token', 'test-reply', ...Object.values(env)]) assert.ok(!log.includes(sensitive));
});
test('真實 server 接線位於 legacy route/日誌/付款之前且保留 raw body', () => {
  const server = fs.readFileSync(require.resolve('../../server.js'), 'utf8');
  assert.match(server, /bodyParser\.json\(\{ verify: captureRawBody \}\)/);
  assert.match(server, /app\.post\('\/webhook', reminderWebhook, async/);
});
