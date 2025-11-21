// 訊息中心 API（/api/message）
// 安全：需要 Header X-Admin-Key

const express = require('express');
const router = express.Router();

const {
  ADMIN_API_KEY,
  listTemplates,
  addTemplate,
  updateTemplate,
  deleteTemplate,
  listJobs,
  saveJobs,
  createJob,
  processJob,
  startScheduler,
  sendLoading,
  linkRichMenu,
  unlinkRichMenu,
  resolveRecipients,
  listFlexPresets,
  addFlexPreset,
  updateFlexPreset,
  deleteFlexPreset,
  sendFlexPresetNow,
} = require('./message-service');

// 啟動排程器（常駐）
startScheduler();

// --- 安全檢查 ---
router.use((req, res, next) => {
  const key = req.header('X-Admin-Key');
  if (!ADMIN_API_KEY || key === ADMIN_API_KEY) return next();
  return res.status(401).json({ success: false, error: '未授權，請提供正確的 X-Admin-Key' });
});

// 可選：IP 白名單
router.use((req, res, next) => {
  const allow = (process.env.ADMIN_IP_ALLOWLIST || '').trim();
  if (!allow) return next();
  const ips = allow.split(',').map(s => s.trim()).filter(Boolean);
  const ip = (req.headers['x-forwarded-for'] || req.ip || '').toString();
  if (ips.some(x => ip.includes(x))) return next();
  return res.status(403).json({ success: false, error: 'IP 不在允許名單' });
});

// --- 模板 ---
router.get('/templates', (req, res) => {
  try {
    const list = listTemplates();
    const { q, type } = req.query;
    const filtered = list.filter(t => (
      (!type || t.type === type) && (!q || (t.name?.includes(q) || JSON.stringify(t.payload).includes(q)))
    ));
    res.json({ success: true, data: filtered });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

router.post('/templates', (req, res) => {
  try {
    const { name, type, payload, variables, tags } = req.body || {};
    if (!name || !type) return res.json({ success: false, error: 'name / type 必填' });
    const rec = addTemplate({ name, type, payload, variables, tags, operator: req.header('X-Operator') || 'admin' });
    res.json({ success: true, data: rec });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

router.patch('/templates/:id', (req, res) => {
  try {
    const updated = updateTemplate(req.params.id, req.body || {});
    if (!updated) return res.json({ success: false, error: '模板不存在' });
    res.json({ success: true, data: updated });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

router.delete('/templates/:id', (req, res) => {
  try {
    const ok = deleteTemplate(req.params.id);
    res.json({ success: ok });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

// --- 發送作業 ---
router.post('/send', async (req, res) => {
  try {
    const { message, templateId, recipients, options } = req.body || {};

    let finalMessage = message;
    if (!finalMessage && templateId) {
      const tpl = listTemplates().find(t => t.id === templateId);
      if (!tpl) return res.json({ success: false, error: '找不到模板' });
      // 轉為執行期訊息格式（M1 僅支援 text / flex）
      if (tpl.type === 'text') {
        finalMessage = { type: 'text', text: String(tpl.payload?.text || '') };
      } else if (tpl.type === 'flex') {
        finalMessage = { type: 'flex', altText: tpl.payload?.altText || '通知', contents: tpl.payload };
      } else {
        return res.json({ success: false, error: '模板類型不支援' });
      }
    }
    if (!finalMessage) return res.json({ success: false, error: '請提供 message 或 templateId' });

    const operator = req.header('X-Operator') || 'admin';
    const job = createJob({ message: finalMessage, recipientsSpec: recipients, options, operator });

    // 立即送的情境：直接啟動背景處理
    if (!options?.scheduleAt) {
      setTimeout(() => processJob(job).catch(() => {}), 10);
    }

    res.json({ success: true, job });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

router.get('/jobs', (req, res) => {
  try {
    const data = listJobs();
    res.json({ success: true, data });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

router.get('/jobs/:id', (req, res) => {
  try {
    const data = listJobs().find(j => j.id === req.params.id);
    if (!data) return res.json({ success: false, error: '找不到作業' });
    res.json({ success: true, data });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

router.post('/jobs/:id/cancel', (req, res) => {
  try {
    const list = listJobs();
    const idx = list.findIndex(j => j.id === req.params.id);
    if (idx < 0) return res.json({ success: false, error: '找不到作業' });
    if (['success', 'error', 'partial', 'canceled'].includes(list[idx].status)) {
      return res.json({ success: false, error: '作業已完成或已取消' });
    }
    list[idx].status = 'canceled';
    saveJobs(list);
    res.json({ success: true });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

// 作業詳情（讀取 ndjson 摘要）
const fs = require('fs');
const path = require('path');
router.get('/jobs/:id/detail', (req, res) => {
  try {
    const f = path.join(process.cwd(), 'jobs', `${req.params.id}.ndjson`);
    if (!fs.existsSync(f)) return res.json({ success: true, items: [] });
    const lines = fs.readFileSync(f, 'utf8').trim().split(/\n+/).map(x => JSON.parse(x));
    res.json({ success: true, items: lines });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

// 只重送失敗者
router.post('/jobs/:id/retry', async (req, res) => {
  try {
    const id = req.params.id;
    const job = listJobs().find(j => j.id === id);
    if (!job) return res.json({ success: false, error: '找不到作業' });
    const f = path.join(process.cwd(), 'jobs', `${id}.ndjson`);
    const failed = fs.existsSync(f) ? fs.readFileSync(f, 'utf8').trim().split(/\n+/).map(x => JSON.parse(x)).filter(x => x.ok === false) : [];
    const userIds = failed.filter(x => !x.isGroup).map(x => x.target);
    const groupIds = failed.filter(x => x.isGroup).map(x => x.target);
    const newJob = createJob({ message: job.message, recipientsSpec: { mode: 'userIds', userIds, groups: groupIds }, options: job.options, operator: req.header('X-Operator') || 'admin' });
    setTimeout(() => processJob(newJob).catch(() => {}), 10);
    res.json({ success: true, job: newJob });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

// 針對指定 targets 重送
router.post('/jobs/:id/resend', async (req, res) => {
  try {
    const id = req.params.id;
    const job = listJobs().find(j => j.id === id);
    if (!job) return res.json({ success: false, error: '找不到作業' });
    const { targets } = req.body || {};
    const users = (targets||[]).filter(t => !t.isGroup).map(t => t.id || t);
    const groups = (targets||[]).filter(t => t.isGroup).map(t => t.id || t);
    const newJob = createJob({ message: job.message, recipientsSpec: { mode: 'userIds', userIds: users, groups }, options: job.options, operator: req.header('X-Operator') || 'admin' });
    setTimeout(() => processJob(newJob).catch(() => {}), 10);
    res.json({ success: true, job: newJob });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

// --- 工具 ---
router.post('/tools/test', async (req, res) => {
  try {
    const { userId, text } = req.body || {};
    const job = createJob({
      message: { type: 'text', text: text || `🧪 測試訊息 ${new Date().toLocaleString('zh-TW')}` },
      recipientsSpec: userId ? { mode: 'userIds', userIds: [userId] } : { mode: 'segment', segment: { role: 'teacher' } },
      options: { rateLimitPerSec: 5, batchSize: 10 },
      operator: req.header('X-Operator') || 'admin'
    });
    setTimeout(() => processJob(job).catch(() => {}), 10);
    res.json({ success: true, job });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

router.post('/tools/loading', async (req, res) => {
  try {
    const { userId, seconds } = req.body || {};
    if (!userId) return res.json({ success: false, error: 'userId 必填' });
    const result = await sendLoading(userId, Number(seconds || 5));
    res.json({ success: true, result });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

// --- Rich Menu 管理 ---
router.post('/richmenu/bind', async (req, res) => {
  try {
    const { userId, richMenuId, botId } = req.body || {};
    if (!userId || !richMenuId) return res.json({ success: false, error: 'userId / richMenuId 必填' });
    const result = await linkRichMenu(userId, richMenuId, botId);
    res.json({ success: true, result });
  } catch (e) { res.json({ success: false, error: e.response?.data || e.message }); }
});

router.post('/richmenu/unbind', async (req, res) => {
  try {
    const { userId, botId } = req.body || {};
    if (!userId) return res.json({ success: false, error: 'userId 必填' });
    const result = await unlinkRichMenu(userId, botId);
    res.json({ success: true, result });
  } catch (e) { res.json({ success: false, error: e.response?.data || e.message }); }
});

// --- 收件人查詢（整合本地檔） ---
function readJsonSafe(p, fallback) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fallback; } }

router.get('/recipients/users', (req, res) => {
  try {
    const file = path.join(process.cwd(), 'data', 'users.json');
    const list = readJsonSafe(file, []);
    const q = (req.query.q || '').toLowerCase();
    const data = list.filter(u => !q || u.userId.toLowerCase().includes(q) || (u.displayName||'').toLowerCase().includes(q))
      .map(u => ({ userId: u.userId, displayName: u.displayName||'' }));
    res.json({ success: true, data });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

router.get('/recipients/teachers', (req, res) => {
  try {
    const file = path.join(process.cwd(), 'data', 'bindings.json');
    const list = readJsonSafe(file, []).filter(b => b.isActive);
    const q = (req.query.q || '').toLowerCase();
    const data = list.filter(b => !q || (b.teacherName||'').toLowerCase().includes(q) || (b.userId||'').toLowerCase().includes(q))
      .map(b => ({ userId: b.userId, teacherName: b.teacherName||'' }));
    res.json({ success: true, data });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

router.get('/recipients/groups', (req, res) => {
  try {
    const file = path.join(process.cwd(), 'src', 'data', 'groups.json');
    const list = readJsonSafe(file, []);
    const q = (req.query.q || '').toLowerCase();
    const data = list.filter(g => !q || (g.groupId||'').toLowerCase().includes(q) || (g.groupName||'').toLowerCase().includes(q))
      .map(g => ({ groupId: g.groupId, groupName: g.groupName||'', type: g.type||'group' }));
    res.json({ success: true, data });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

// 估算收件人數
router.post('/recipients/estimate', (req, res) => {
  try {
    const { recipients } = req.body || {};
    const { userIds, groupIds } = resolveRecipients(recipients || {});
    res.json({ success: true, estimate: { users: userIds.length, groups: groupIds.length } });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

// 匯出作業 CSV（即時轉換 ndjson）
router.get('/export/:id.csv', (req, res) => {
  try {
    const jobId = req.params.id;
    const file = path.join(process.cwd(), 'jobs', `${jobId}.ndjson`);
    if (!fs.existsSync(file)) return res.status(404).send('Not Found');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${jobId}.csv"`);
    const lines = fs.readFileSync(file, 'utf8').trim().split(/\n+/);
    res.write('target,isGroup,botId,ok,status,attempt,error,ts\n');
    for (const ln of lines) {
      const o = JSON.parse(ln);
      const row = [o.target||'', o.isGroup?1:0, o.botId||'', o.ok?1:0, o.status||'', o.attempt||'', (o.error||'').toString().replace(/\n/g,' '), o.ts||'']
        .map(v => '"' + String(v).replace(/"/g,'""') + '"').join(',');
      res.write(row + '\n');
    }
    res.end();
  } catch (e) { res.status(500).send(e.message); }
});

// Bot 健康檢查：回傳每個 token 的 /v2/bot/info
const axios = require('axios');
router.get('/tools/bot-info', async (req, res) => {
  try {
    const tokens = [process.env.LINE_CHANNEL_ACCESS_TOKEN, process.env.LINE_CHANNEL_ACCESS_TOKEN_2, process.env.LINE_CHANNEL_ACCESS_TOKEN_3]
      .filter(Boolean);
    const results = [];
    for (const tk of tokens) {
      try {
        const r = await axios.get('https://api.line.me/v2/bot/info', { headers: { Authorization: `Bearer ${tk}` }, timeout: 8000 });
        results.push({ ok: true, data: r.data });
      } catch (e) {
        results.push({ ok: false, error: e.response?.data || e.message });
      }
    }
    res.json({ success: true, results });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

// 上傳名單（文字/CSV 內容）
router.post('/upload-list', (req, res) => {
  try {
    const { name, content, kind } = req.body || {};
    if (!content) return res.json({ success: false, error: 'content 必填' });
    const lines = String(content).split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    const items = [];
    for (const s of lines) {
      const cell = s.split(/[;,\t]/)[0].trim();
      if (cell) items.push(cell);
    }
    const id = `upl_${Date.now().toString(36)}`;
    const dir = path.join(process.cwd(), 'src', 'data', 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${id}.json`), JSON.stringify({ id, name: name||id, kind: kind==='groups'?'groups':'userIds', items }, null, 2));
    res.json({ success: true, uploadId: id, count: items.length });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

// 群組成員展開（使用本地 users.json 的 groups 記錄）
router.get('/recipients/group-members/:groupId', (req, res) => {
  try {
    const users = readJsonSafe(path.join(process.cwd(), 'data', 'users.json'), []);
    const groupId = req.params.groupId;
    const list = users.filter(u => Array.isArray(u.groups) && u.groups.includes(groupId)).map(u => ({ userId: u.userId, displayName: u.displayName||'' }));
    res.json({ success: true, data: list });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

// 預覽插值
router.post('/preview', (req, res) => {
  try {
    const { message, userId } = req.body || {};
    const svc = require('./message-service');
    const vars = svc.buildVarsForUser ? svc.buildVarsForUser(userId) : {};
    if (message?.type === 'text') {
      const text = svc.applyTemplateString ? svc.applyTemplateString(message.text||'', vars) : message.text||'';
      return res.json({ success: true, preview: { type: 'text', text } });
    }
    if (message?.type === 'flex') {
      const contents = svc.applyVariablesToObject ? svc.applyVariablesToObject(message.contents||{}, vars) : message.contents||{};
      return res.json({ success: true, preview: { type: 'flex', altText: message.altText||'', contents } });
    }
    res.json({ success: false, error: '不支援的訊息格式' });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

// 對前端暴露可用功能開關
router.get('/config', (req, res) => {
  res.json({ success: true, features: { broadcast: process.env.ENABLE_BROADCAST === 'true' } });
});

// Broadcast / Narrowcast（可選）
router.post('/broadcast', async (req, res) => {
  try {
    if (process.env.ENABLE_BROADCAST !== 'true') return res.status(403).json({ success: false, error: '未啟用 Broadcast' });
    const { message } = req.body || {};
    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    if (!token) return res.json({ success: false, error: '缺少主要 bot token' });
    const r = await axios.post('https://api.line.me/v2/bot/message/broadcast', { messages: [message] }, { headers: { Authorization: `Bearer ${token}` } });
    res.json({ success: true, data: r.data });
  } catch (e) { res.json({ success: false, error: e.response?.data || e.message }); }
});

router.post('/narrowcast', async (req, res) => {
  try {
    if (process.env.ENABLE_BROADCAST !== 'true') return res.status(403).json({ success: false, error: '未啟用 Narrowcast' });
    const { message, filter } = req.body || {};
    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    if (!token) return res.json({ success: false, error: '缺少主要 bot token' });
    const r = await axios.post('https://api.line.me/v2/bot/message/narrowcast', { messages: [message], filter: filter||{} }, { headers: { Authorization: `Bearer ${token}` } });
    res.json({ success: true, data: r.data });
  } catch (e) { res.json({ success: false, error: e.response?.data || e.message }); }
});

// --- Flex Presets ---
router.get('/flex-presets', (req, res) => {
  try {
    const list = listFlexPresets();
    const { q, scope } = req.query;
    const out = list.filter(x => (
      (!q || x.name.includes(q)) && (!scope || (Array.isArray(x.scopes) && x.scopes.includes(scope)))
    ));
    res.json({ success: true, data: out });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

router.post('/flex-presets', (req, res) => {
  try {
    const { name, altText, contents, scopes, tags, notes } = req.body || {};
    if (!name || !contents) return res.json({ success: false, error: 'name / contents 必填' });
    const rec = addFlexPreset({ name, altText, contents, scopes, tags, notes, operator: req.header('X-Operator') || 'admin' });
    res.json({ success: true, data: rec });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

router.patch('/flex-presets/:id', (req, res) => {
  try {
    const rec = updateFlexPreset(req.params.id, req.body || {});
    if (!rec) return res.json({ success: false, error: '找不到預設' });
    res.json({ success: true, data: rec });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

router.delete('/flex-presets/:id', (req, res) => {
  try {
    const ok = deleteFlexPreset(req.params.id);
    res.json({ success: ok });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

// 直接以 Flex Preset 發送（立即）
router.post('/flex-presets/:id/send', async (req, res) => {
  try {
    const id = req.params.id;
    const preset = listFlexPresets().find(x => x.id === id);
    if (!preset) return res.json({ success: false, error: '找不到預設' });
    const { recipients, options } = req.body || {};
    const job = await sendFlexPresetNow(preset, recipients, options, req.header('X-Operator') || 'admin');
    res.json({ success: true, job });
  } catch (e) { res.json({ success: false, error: e.message }); }
});

module.exports = router;
