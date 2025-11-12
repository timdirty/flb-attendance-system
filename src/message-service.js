// 訊息中心送信引擎（M1）
// - 輕量檔案式資料：templates / jobs
// - 立即發送與簡易排程器（5 秒掃描）
// - 多 Bot 支援（primary/secondary/tertiary）
// - 僅支援 text 與 flex（M1）

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const DATA_DIR = path.join(__dirname, 'data');
const JOB_LOG_DIR = path.join(process.cwd(), 'logs');
const JOB_DETAIL_DIR = path.join(process.cwd(), 'jobs');

const TEMPLATE_FILE = path.join(DATA_DIR, 'message-templates.json');
const JOBS_FILE = path.join(DATA_DIR, 'message-jobs.json');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');

const LINE_PUSH_API = 'https://api.line.me/v2/bot/message/push';
const LINE_LOADING_API = 'https://api.line.me/v2/bot/chat/loading/start';
const LINE_RICHMENU_USER_LINK = (userId, richMenuId) => `https://api.line.me/v2/bot/user/${userId}/richmenu/${richMenuId}`;
const LINE_RICHMENU_USER_UNLINK = userId => `https://api.line.me/v2/bot/user/${userId}/richmenu`;

// 讀環境設定
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || '';
const DEFAULT_RATE = Number(process.env.MESSAGE_RATE_LIMIT_PER_SEC || 8);
const DEFAULT_BATCH = Number(process.env.MESSAGE_BATCH_SIZE || 20);
const DEFAULT_RETRY = Number(process.env.MESSAGE_MAX_RETRIES || 2);
const DEFAULT_STRATEGY = process.env.MESSAGE_DEFAULT_BOT_STRATEGY || 'primary_first';

// Bot 憑證（沿用現有環境變數）
const BOT_PRIMARY = {
  id: 'primary',
  name: '主要Bot',
  token: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
};
const BOT_SECONDARY = {
  id: 'secondary',
  name: '第二個Bot',
  token: process.env.LINE_CHANNEL_ACCESS_TOKEN_2 || '',
};
const BOT_TERTIARY = {
  id: 'tertiary',
  name: '第三個Bot',
  token: process.env.LINE_CHANNEL_ACCESS_TOKEN_3 || '',
};

function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(JOB_LOG_DIR)) fs.mkdirSync(JOB_LOG_DIR, { recursive: true });
  if (!fs.existsSync(JOB_DETAIL_DIR)) fs.mkdirSync(JOB_DETAIL_DIR, { recursive: true });

  if (!fs.existsSync(TEMPLATE_FILE)) fs.writeFileSync(TEMPLATE_FILE, '[]', 'utf8');
  if (!fs.existsSync(JOBS_FILE)) fs.writeFileSync(JOBS_FILE, '[]', 'utf8');
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return []; }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

function appendJobDetail(jobId, line) {
  const f = path.join(JOB_DETAIL_DIR, `${jobId}.ndjson`);
  fs.appendFileSync(f, JSON.stringify(line) + '\n', 'utf8');
}

function getAvailableBots() {
  const bots = [];
  if (BOT_PRIMARY.token) bots.push(BOT_PRIMARY);
  if (BOT_SECONDARY.token) bots.push(BOT_SECONDARY);
  if (BOT_TERTIARY.token) bots.push(BOT_TERTIARY);
  return bots;
}

function selectBots(strategy = DEFAULT_STRATEGY) {
  const bots = getAvailableBots();
  if (bots.length === 0) return [];
  if (strategy === 'all') return bots;
  if (strategy === 'secondary') return bots.filter(b => b.id === 'secondary');
  if (strategy === 'round_robin') return bots; // 真正輪詢在送出階段處理
  return bots.filter(b => b.id === 'primary').concat(bots.filter(b => b.id !== 'primary')); // primary_first
}

// ===== 模板庫 =====
function listTemplates() { ensureDirs(); return readJson(TEMPLATE_FILE); }

function saveTemplates(list) { writeJson(TEMPLATE_FILE, list); }

function addTemplate({ name, type, payload, variables = [], tags = [], operator = 'system' }) {
  ensureDirs();
  const list = listTemplates();
  const id = `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const rec = { id, name, type, payload, variables, tags, updatedAt: new Date().toISOString(), updatedBy: operator };
  list.push(rec);
  saveTemplates(list);
  return rec;
}

function updateTemplate(id, patch) {
  ensureDirs();
  const list = listTemplates();
  const idx = list.findIndex(t => t.id === id);
  if (idx < 0) return null;
  list[idx] = { ...list[idx], ...patch, updatedAt: new Date().toISOString() };
  saveTemplates(list);
  return list[idx];
}

function deleteTemplate(id) {
  ensureDirs();
  const list = listTemplates();
  const next = list.filter(t => t.id !== id);
  if (next.length === list.length) return false;
  saveTemplates(next);
  return true;
}

// ===== 作業管理 =====
function listJobs() { ensureDirs(); return readJson(JOBS_FILE); }
function saveJobs(list) { writeJson(JOBS_FILE, list); }

function putJob(job) {
  const list = listJobs();
  const idx = list.findIndex(j => j.id === job.id);
  if (idx < 0) list.push(job); else list[idx] = job;
  saveJobs(list);
}

function resolveRecipients(spec) {
  // 支援 userIds / segment: {role:'teacher'} / groups
  const ids = new Set();
  const groups = new Set();

  if (!spec) return { userIds: [], groupIds: [] };

  if (spec.mode === 'userIds' && Array.isArray(spec.userIds)) {
    spec.userIds.forEach(u => u && ids.add(u));
  }

  if (spec.mode === 'segment' && spec.segment?.role === 'teacher') {
    try {
      const bindingsPath = path.join(process.cwd(), 'data', 'bindings.json');
      const bindings = JSON.parse(fs.readFileSync(bindingsPath, 'utf8'));
      bindings.filter(b => b.isActive && b.userId).forEach(b => ids.add(b.userId));
    } catch {}
  }

  if (spec.mode === 'groups' && Array.isArray(spec.groups)) {
    spec.groups.forEach(g => g && groups.add(g));
  }

  if (spec.mode === 'upload' && spec.uploadId) {
    try {
      const file = path.join(UPLOAD_DIR, `${spec.uploadId}.json`);
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      const kind = data.kind || 'userIds';
      const list = Array.isArray(data.items) ? data.items : [];
      if (kind === 'userIds') list.forEach(u => ids.add(u));
      if (kind === 'groups') list.forEach(g => groups.add(g));
    } catch {}
  }

  return { userIds: Array.from(ids), groupIds: Array.from(groups) };
}

// ===== 變數插值 =====
let cacheUsers = null, cacheBindings = null, cacheTs = 0;
function loadCaches() {
  const now = Date.now();
  if (cacheUsers && (now - cacheTs) < 10000) return; // 10 秒緩存
  try {
    cacheUsers = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'users.json'), 'utf8'));
  } catch { cacheUsers = []; }
  try {
    cacheBindings = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'bindings.json'), 'utf8'));
  } catch { cacheBindings = []; }
  cacheTs = now;
}

function buildVarsForUser(userId) {
  loadCaches();
  const user = cacheUsers.find(u => u.userId === userId) || {};
  const bind = cacheBindings.find(b => b.userId === userId && b.isActive) || {};
  const nowStr = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
  return {
    userId,
    displayName: user.displayName || user.userName || '',
    teacherName: bind.teacherName || '',
    now: nowStr,
    date: nowStr.split(' ')[0] || nowStr
  };
}

function applyTemplateString(str, vars) {
  return String(str).replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, k) => {
    const v = vars[k];
    return (v === undefined || v === null) ? '' : String(v);
  });
}

function applyVariablesToObject(obj, vars) {
  if (obj == null) return obj;
  if (typeof obj === 'string') return applyTemplateString(obj, vars);
  if (Array.isArray(obj)) return obj.map(v => applyVariablesToObject(v, vars));
  if (typeof obj === 'object') {
    const out = {};
    for (const k of Object.keys(obj)) out[k] = applyVariablesToObject(obj[k], vars);
    return out;
  }
  return obj;
}

async function sendOneWithBot(bot, toId, body) {
  const headers = { 'Authorization': `Bearer ${bot.token}`, 'Content-Type': 'application/json' };
  const payload = { to: toId, messages: [body] };
  const resp = await axios.post(LINE_PUSH_API, payload, { headers, timeout: 10000 });
  return resp.data || {};
}

function buildMessageBody(message) {
  if (!message) return null;
  if (message.type === 'text') {
    return { type: 'text', text: String(message.text || '').slice(0, 2000) };
  }
  if (message.type === 'flex') {
    return { type: 'flex', altText: message.altText || '通知', contents: message.contents };
  }
  return null;
}

async function processJob(job) {
  const rate = Math.max(1, Number(job.options?.rateLimitPerSec || DEFAULT_RATE));
  const batch = Math.max(1, Number(job.options?.batchSize || DEFAULT_BATCH));
  const retries = Math.max(0, Number(job.options?.maxRetries || DEFAULT_RETRY));
  const strategy = job.options?.botStrategy || DEFAULT_STRATEGY;

  const bots = selectBots(strategy);
  if (bots.length === 0) throw new Error('沒有可用的 LINE Bot 憑證');

  const body = buildMessageBody(job.message?.type ? job.message : job.message?.payload);
  if (!body) throw new Error('不支援的訊息格式（僅支援 text / flex）');

  const targets = [];
  job.recipients?.userIds?.forEach(u => targets.push({ id: u, isGroup: false }));
  job.recipients?.groupIds?.forEach(g => targets.push({ id: g, isGroup: true }));

  job.startedAt = new Date().toISOString();
  job.status = 'sending';
  putJob(job);

  let success = 0, fail = 0, attempt = 0;

  for (let i = 0; i < targets.length; i += batch) {
    const slice = targets.slice(i, i + batch);

    await Promise.all(slice.map(async (t) => {
      let ok = false, lastErr = null;
      for (let r = 0; r <= retries; r++) {
        attempt++;
        try {
          // 輪詢/優先策略
          const bot = bots[(attempt - 1) % bots.length];
          let curBody = body;
          if (!t.isGroup) {
            const vars = buildVarsForUser(t.id);
            curBody = applyVariablesToObject(body, vars);
          }
          await sendOneWithBot(bot, t.id, curBody);
          appendJobDetail(job.id, { target: t.id, isGroup: t.isGroup, botId: bot.id, ok: true, attempt: r + 1, ts: new Date().toISOString() });
          ok = true; break;
        } catch (e) {
          lastErr = e.response?.data || e.message;
          await new Promise(rs => setTimeout(rs, 200));
        }
      }
      if (ok) success++; else { fail++; appendJobDetail(job.id, { target: t.id, ok: false, error: lastErr, ts: new Date().toISOString() }); }
    }));

    // 節流：每批次後按每秒速率等待
    const delayMs = Math.ceil(1000 * (slice.length / rate));
    await new Promise(rs => setTimeout(rs, delayMs));
  }

  job.finishedAt = new Date().toISOString();
  job.status = fail === 0 ? 'success' : (success > 0 ? 'partial' : 'error');
  job.stats = { success, fail };
  putJob(job);

  return job;
}

function createJob({ message, recipientsSpec, options, operator }) {
  ensureDirs();
  const { userIds, groupIds } = resolveRecipients(recipientsSpec || {});
  const id = `job_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const job = {
    id,
    createdAt: new Date().toISOString(),
    createdBy: operator || 'system',
    message,
    recipients: { userIds, groupIds },
    options: options || {},
    status: options?.scheduleAt ? 'scheduled' : 'queued'
  };
  putJob(job);
  return job;
}

// 簡易排程器：每 5 秒檢查 scheduled/queued 作業
let schedulerStarted = false;
function startScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;
  setInterval(async () => {
    try {
      const list = listJobs();
      for (const j of list) {
        if (j.status === 'scheduled') {
          const due = new Date(j.options?.scheduleAt || 0).getTime();
          if (Date.now() >= due) { j.status = 'queued'; putJob(j); }
        }
        if (j.status === 'queued') {
          j.status = 'sending'; putJob(j);
          processJob(j).catch(err => {
            j.status = 'error'; j.error = err.message; putJob(j);
          });
        }
      }
    } catch (e) {
      // 靜默保護
    }
  }, 5000);
}

// Loading 動畫
async function sendLoading(userId, seconds = 5) {
  const bots = getAvailableBots();
  for (const bot of bots) {
    try {
      const headers = { 'Authorization': `Bearer ${bot.token}`, 'Content-Type': 'application/json' };
      await axios.post(LINE_LOADING_API, { chatId: userId, loadingSeconds: seconds }, { headers, timeout: 10000 });
      return { success: true, bot: bot.id };
    } catch (e) { /* try next */ }
  }
  return { success: false };
}

module.exports = {
  ADMIN_API_KEY,
  resolveRecipients,
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
  // Rich Menu
  async linkRichMenu(userId, richMenuId, botId) {
    const bots = selectBots(botId || 'primary_first');
    if (bots.length === 0) throw new Error('沒有可用的 LINE Bot 憑證');
    const bot = bots[0];
    const headers = { 'Authorization': `Bearer ${bot.token}`, 'Content-Type': 'application/json' };
    const url = LINE_RICHMENU_USER_LINK(userId, richMenuId.startsWith('richmenu-') ? richMenuId : `richmenu-${richMenuId}`);
    const resp = await axios.post(url, {}, { headers, timeout: 10000 });
    return { success: true, data: resp.data, bot: bot.id };
  },
  async unlinkRichMenu(userId, botId) {
    const bots = selectBots(botId || 'primary_first');
    if (bots.length === 0) throw new Error('沒有可用的 LINE Bot 憑證');
    const bot = bots[0];
    const headers = { 'Authorization': `Bearer ${bot.token}`, 'Content-Type': 'application/json' };
    const url = LINE_RICHMENU_USER_UNLINK(userId);
    const resp = await axios.delete(url, { headers, timeout: 10000 });
    return { success: true, data: resp.data, bot: bot.id };
  },
};
