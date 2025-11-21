const fs = require('fs');
const path = require('path');
const kw = require('./keyword-service');

const FILE = path.join(__dirname, 'data', 'features.json');

function ensureFile() {
  const dir = path.dirname(FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(FILE)) {
    const defaults = [
      { id:'attendance_query', name:'出缺勤查詢', targetCommand:'#出缺勤', enabled:true, synonyms:[] },
      { id:'remaining_classes', name:'剩餘堂數', targetCommand:'#剩餘堂數', enabled:true, synonyms:[] },
      { id:'course_plan', name:'課程規劃', targetCommand:'#本期課程規劃', enabled:true, synonyms:[] },
    ];
    fs.writeFileSync(FILE, JSON.stringify(defaults, null, 2), 'utf8');
  }
}

function listFeatures(){ ensureFile(); return JSON.parse(fs.readFileSync(FILE,'utf8')); }
function saveFeatures(list){ fs.writeFileSync(FILE, JSON.stringify(list, null, 2), 'utf8'); }

function updateFeature(id, patch){ const list=listFeatures(); const i=list.findIndex(f=>f.id===id); if(i<0) return null; list[i] = { ...list[i], ...patch }; saveFeatures(list); return list[i]; }
function addSynonym(id, syn){ const list=listFeatures(); const f=list.find(f=>f.id===id); if(!f) return null; const sid = `syn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,4)}`; const rec = { id:sid, pattern:syn.pattern, matchType:syn.matchType||'exact', ruleId: syn.ruleId||null }; f.synonyms = f.synonyms || []; f.synonyms.push(rec); saveFeatures(list); return rec; }
function deleteSynonym(id, synId){ const list=listFeatures(); const f=list.find(f=>f.id===id); if(!f) return false; const syn = (f.synonyms||[]).find(s=>s.id===synId); if (!syn) return false; // 同步刪除 keyword 規則
  if (syn.ruleId) kw.deleteRule && kw.deleteRule(syn.ruleId); // 若未有 deleteRule，則由关键词規則 API 負責
  f.synonyms = f.synonyms.filter(s=>s.id!==synId); saveFeatures(list); return true; }

async function syncToKeywordRules(feature){
  if (!feature) return 0; let changed=0;
  for (const syn of (feature.synonyms||[])){
    if (!syn.ruleId){
      const r = kw.addRule({ pattern:syn.pattern, matchType:syn.matchType||'exact', action:'alias_to', params:{ target: feature.targetCommand }, priority:50, enabled:true, stop:true });
      syn.ruleId = r.id; changed++;
    } else {
      const r = kw.updateRule(syn.ruleId, { pattern:syn.pattern, matchType:syn.matchType||'exact', action:'alias_to', params:{ target: feature.targetCommand }, enabled:true });
      if (r) changed++;
    }
  }
  // save mapping
  const list=listFeatures(); const i=list.findIndex(f=>f.id===feature.id); if(i>=0){ list[i]=feature; saveFeatures(list); }
  return changed;
}

module.exports = { listFeatures, saveFeatures, updateFeature, addSynonym, deleteSynonym, syncToKeywordRules };

