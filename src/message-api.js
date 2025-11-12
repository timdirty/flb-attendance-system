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

module.exports = router;
