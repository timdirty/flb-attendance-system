const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const express = require('express');
const bodyParser = require('body-parser');
const { once } = require('node:events');
const { captureRawBody, createReminderWebhook } = require('../../src/class-reminder-webhook');
// 來源：FLB Course 2c171735 的正式 renderer，使用完全虛構的學生/課程 row。
const receipts = require('./receipt-fixtures.json');

for (const response of ['attend', 'pending']) test(`實際 HTTP 簽章 → API ${response} → 正式 renderer 的 Flex 原樣送出`, async t => {
  const calls = [], legacy = [];
  const env = { LINE_CHANNEL_SECRET: 'test-secret', LINE_CHANNEL_ACCESS_TOKEN: 'test-primary',
    UNIFIED_STUDENT_API_URL: 'https://api.test', STUDENT_API_KEY: 'test-api', INTERNAL_GATEWAY_SECRET: 'test-internal' };
  const post = async (url, body, config) => {
    calls.push({ url, body, config });
    return url.endsWith('/reply') ? { status: 200, data: {} } : {
      status: 200, data: { success: true, data: { target_id: 42, response, flex_message: receipts[response] } },
    };
  };
  const app = express();
  app.use(bodyParser.json({ verify: captureRawBody }));
  app.post('/webhook', createReminderWebhook({ post, env, logger: { info() {}, warn() {} } }), (req, res) => {
    legacy.push(req.body.events); res.send('OK');
  });
  const server = app.listen(0, '127.0.0.1');
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  await once(server, 'listening');
  const url = `http://127.0.0.1:${server.address().port}/webhook`;
  const event = { type: 'postback', webhookEventId: 'http-event', replyToken: 'http-reply',
    source: { type: 'user', userId: `U${'a'.repeat(32)}` },
    postback: { data: `action=class_reminder_response&response=${response}&token=synthetic-signed-token` } };
  const body = JSON.stringify({ destination: `U${'b'.repeat(32)}`, events: [event], label: '測試非 ASCII 字元' }, null, 2);
  const signature = crypto.createHmac('sha256', env.LINE_CHANNEL_SECRET).update(body).digest('base64');
  const invalid = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Line-Signature': 'bad' }, body });
  assert.equal(invalid.status, 403); assert.equal(calls.length, 0); assert.equal(legacy.length, 0);
  const result = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Line-Signature': signature }, body });
  assert.equal(result.status, 200); assert.equal(calls.length, 2); assert.equal(legacy.length, 0);
  const message = calls[1].body.messages[0];
  assert.deepEqual(message, receipts[response]);
  assert.equal(message.contents.size, 'kilo');
  assert.match(JSON.stringify(message), /測試學生/);
  assert.match(JSON.stringify(message), /2026\/09\/08/);
  assert.match(JSON.stringify(message), /18:00-19:00/);
  assert.match(JSON.stringify(message), /實際出席以老師點名為準/);
  assert.match(JSON.stringify(message), /查看課程/);
  const redelivery = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Line-Signature': signature }, body });
  assert.equal(redelivery.status, 200); assert.equal(calls.length, 2);
  const oldBody = JSON.stringify({ events: [{ type: 'postback', postback: { data: '{"action":"leave"}' } }] });
  assert.equal((await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: oldBody })).status, 200);
  assert.equal(legacy.length, 1);
});
