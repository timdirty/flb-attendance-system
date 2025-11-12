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
} = require('./message-service');

// 啟動排程器（常駐）
startScheduler();

// --- 安全檢查 ---
router.use((req, res, next) => {
  const key = req.header('X-Admin-Key');
  if (!ADMIN_API_KEY || key === ADMIN_API_KEY) return next();
  return res.status(401).json({ success: false, error: '未授權，請提供正確的 X-Admin-Key' });
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
const fs = require('fs');
const path = require('path');
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
const { resolveRecipients } = require('./message-service');
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

module.exports = router;
