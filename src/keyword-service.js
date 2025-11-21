// 關鍵字規則服務：讀寫/匹配/測試
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'data', 'keyword-rules.json');

function ensureFile() {
  const dir = path.dirname(FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, '[]', 'utf8');
}

function listRules() {
  ensureFile();
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return []; }
}

function saveRules(rules) {
  fs.writeFileSync(FILE, JSON.stringify(rules, null, 2), 'utf8');
}

function addRule(rule) {
  const list = listRules();
  const id = rule.id || `kw_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`;
  const rec = { id, enabled: true, priority: 100, stop: true, scope: 'all', ...rule, updatedAt: new Date().toISOString() };
  list.push(rec);
  saveRules(list);
  return rec;
}

function updateRule(id, patch) {
  const list = listRules();
  const idx = list.findIndex(r => r.id === id);
  if (idx < 0) return null;
  list[idx] = { ...list[idx], ...patch, updatedAt: new Date().toISOString() };
  saveRules(list);
  return list[idx];
}

function deleteRule(id) {
  const list = listRules();
  const next = list.filter(r => r.id !== id);
  if (next.length === list.length) return false;
  saveRules(next);
  return true;
}

function match(text, rule) {
  const t = (text || '').trim();
  if (rule.matchType === 'regex') {
    try { const re = new RegExp(rule.pattern, 'i'); return re.test(t); } catch { return false; }
  }
  if (rule.matchType === 'contains') return t.includes(rule.pattern);
  // exact
  return t === rule.pattern;
}

function sortByPriority(list) {
  return list.slice().sort((a,b) => (a.priority||100) - (b.priority||100));
}

function findFirstMatch(text, context = {}) {
  const { sourceType = 'user' } = context;
  const rules = sortByPriority(listRules()).filter(r => r.enabled !== false);
  for (const r of rules) {
    if (r.scope && r.scope !== 'all' && r.scope !== sourceType) continue;
    if (match(text, r)) return r;
  }
  return null;
}

module.exports = {
  listRules,
  addRule,
  updateRule,
  deleteRule,
  findFirstMatch,
  saveRules,
};

