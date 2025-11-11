/***************************************************************
 * 🚀 Notion → Google Sheet 自動同步腳本 (單檔完整版)
 * 版本：v2025.10.19
 * 功能：抓取 Notion Database 所有欄位，寫入 Google Sheet
 ***************************************************************/

const NOTION_TOKEN = 'ntn_c27641071407W6tF23uKOZVrOoQ0Dt5nINHvZJoSfRK6rJ';
const DATABASE_ID = '22c0a4c0ed848063a444cbd887ecd58b'; // Notion 資料庫 ID
const Subsheet_Name  = '上課時間(from notion)';       // Google Sheet 工作表名稱
const NOTION_VERSION = '2022-06-28';
const RELATION_DISPLAY_PROP = '名稱'; // 若講師/助教資料庫有「姓名」欄位就填這個

/***************************************************************
 * 主函式：同步 Notion → Google Sheet
 ***************************************************************/
function syncNotionClassToSheet() {
  const pages = queryNotionDatabase(DATABASE_ID);
  const sheet = getOrCreateSheet(Subsheet_Name);
  const header = ['週次','時段','時間','課別','課程名稱','講師','助教','上課地址','上課位置','Notion Page ID'];

  ensureHeader(sheet, header);

  const existing = readSheetIndex(sheet, header.length);
  const updates = [];

  pages.forEach(page => {
    const p = page.properties;
    const row = [
      getPropertyText(p['週次']),
      getPropertyText(p['時段']),
      getPropertyText(p['時間']),
      getPropertyText(p['課別']),
      getPropertyText(p['課程名稱']),
      getPropertyText(p['講師']),
      getPropertyText(p['助教']),
      getPropertyText(p['上課地址']),
      getPropertyText(p['上課位置']),
      page.id
    ];

    const old = existing.mapById.get(page.id);
    if (!old) {
      updates.push({ type: 'append', values: row });
    } else if (!rowsEqual(row, old.row)) {
      updates.push({ type: 'update', rowIndex: old.rowIndex, values: row });
    }
    existing.seen.add(page.id);
  });

  applyUpdates(sheet, header.length, updates);
  Logger.log(`✅ 同步完成，共 ${pages.length} 筆（新增/更新 ${updates.length} 筆）`);
}

/***************************************************************
 * 🔹 Notion API 呼叫
 ***************************************************************/
function queryNotionDatabase(databaseId) {
  const url = `https://api.notion.com/v1/databases/${databaseId}/query`;
  const payload = { page_size: 100 };
  let results = [], cursor;

  do {
    if (cursor) payload.start_cursor = cursor;
    const res = notionRequest('post', url, payload);
    results = results.concat(res.results);
    cursor = res.has_more ? res.next_cursor : null;
  } while (cursor);

  return results;
}

function notionRequest(method, url, payload) {
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${NOTION_TOKEN}`,
      'Content-Type': 'application/json',
      'Notion-Version': NOTION_VERSION,
    },
    muteHttpExceptions: true,
  };
  if (payload) options.payload = JSON.stringify(payload);
  const res = UrlFetchApp.fetch(url, options);
  if (res.getResponseCode() >= 300) {
    throw new Error(`Notion API Error ${res.getResponseCode()}: ${res.getContentText()}`);
  }
  return JSON.parse(res.getContentText());
}

/***************************************************************
 * 🔹 Notion 屬性轉文字（支援 Relation / Rollup）
 ***************************************************************/
function getPropertyText(prop) {
  if (!prop) return '';

  switch (prop.type) {
    case 'title':        return (prop.title || []).map(t => t.plain_text).join('');
    case 'rich_text':    return (prop.rich_text || []).map(t => t.plain_text).join('');
    case 'select':       return prop.select ? prop.select.name : '';
    case 'multi_select': return (prop.multi_select || []).map(s => s.name).join(', ');
    case 'people':       return (prop.people || []).map(p => p.name || '').join(', ');
    case 'date':         return prop.date ? prop.date.start : '';
    case 'number':       return prop.number || '';
    case 'checkbox':     return prop.checkbox ? '✅' : '';
    case 'rollup':
      if (prop.rollup.type === 'array') return (prop.rollup.array || []).map(getPropertyText).join(', ');
      if (prop.rollup.type === 'number') return prop.rollup.number || '';
      if (prop.rollup.type === 'date') return prop.rollup.date?.start || '';
      return '';
    case 'relation':     return relationToNames(prop.relation || []);
    default:             return '';
  }
}

/***************************************************************
 * 🔹 Relation 關聯頁面 → 名稱 (含快取)
 ***************************************************************/
function relationToNames(relationArr) {
  if (!Array.isArray(relationArr) || relationArr.length === 0) return '';
  const cache = CacheService.getScriptCache();
  const names = relationArr.map(r => {
    const key = `page_${r.id}`;
    const cached = cache.get(key);
    if (cached) return cached;

    const name = getRelatedPageName(r.id);
    if (name) cache.put(key, name, 21600); // cache 6 小時
    return name;
  });
  return names.join(', ');
}

function getRelatedPageName(pageId) {
  const page = notionRequest('get', `https://api.notion.com/v1/pages/${pageId}`);
  let name = '';

  // 優先抓指定欄位（例如「姓名」）
  if (RELATION_DISPLAY_PROP && page.properties?.[RELATION_DISPLAY_PROP]) {
    name = getPropertyText(page.properties[RELATION_DISPLAY_PROP]);
  }
  // 沒有指定欄位就抓 title
  if (!name) {
    const props = page.properties || {};
    const titleKey = Object.keys(props).find(k => props[k].type === 'title');
    if (titleKey) name = getPropertyText(props[titleKey]);
  }
  return name;
}

/***************************************************************
 * 🔹 Google Sheet 操作
 ***************************************************************/
function getOrCreateSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  return sheet;
}

function ensureHeader(sheet, header) {
  sheet.getRange(1, 1, 1, header.length).setValues([header]);
}

function readSheetIndex(sheet, colCount) {
  const mapById = new Map();
  const seen = new Set();
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const range = sheet.getRange(2, 1, lastRow - 1, colCount);
    const values = range.getValues();
    for (let i = 0; i < values.length; i++) {
      const pageId = values[i][colCount - 1];
      if (pageId) mapById.set(pageId, { rowIndex: i + 2, row: values[i] });
    }
  }
  return { mapById, seen };
}

function applyUpdates(sheet, colCount, ops) {
  if (ops.length === 0) return;

  // 更新既有列
  ops.filter(o => o.type === 'update').forEach(u => {
    sheet.getRange(u.rowIndex, 1, 1, colCount).setValues([u.values]);
  });

  // 新增新資料
  const appends = ops.filter(o => o.type === 'append').map(o => o.values);
  if (appends.length > 0) {
    const startRow = Math.max(sheet.getLastRow() + 1, 2);
    sheet.getRange(startRow, 1, appends.length, colCount).setValues(appends);
  }
}

/***************************************************************
 * 🔹 工具
 ***************************************************************/
function rowsEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if ((a[i] || '') !== (b[i] || '')) return false;
  }
  return true;
}

/***************************************************************
 * 🔹 設定自動同步排程（可選）
 ***************************************************************/
function installTrigger() {
  ScriptApp.newTrigger('syncNotionToSheet')
    .timeBased()
    .everyHours(1) // 每小時同步一次
    .create();
  Logger.log('⏰ 已建立每小時同步觸發器');
}