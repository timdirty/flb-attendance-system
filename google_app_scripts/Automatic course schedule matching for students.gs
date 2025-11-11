/**
 * 依「上課時間」表的欄首(課程名)→欄內(各時段) 建立下拉選單到「學生名單」F(課程)→G(時間)
 * - 只讀一次兩張表，效能較佳
 * - 自動去除重複/空白並排序
 * - 課程名稱容錯：若找不到完全相同欄首，會嘗試「包含/被包含」(不分大小寫、去頭尾空白)
 * - 沒對應就清除驗證
 */
function applyCourseTimeDropdownFromTable() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const studentSheet = ss.getSheetByName('學生名單');
  const timeSheet = ss.getSheetByName('上課時間');

  if (!studentSheet || !timeSheet) throw new Error('找不到「學生名單」或「上課時間」工作表');

  // 範圍設定
  const startRow = 2;                     // 從第2列開始
  const courseCol = 6;                    // F欄：課程
  const timeCol = 7;                      // G欄：時間
  const lastRow = Math.max(studentSheet.getLastRow(), startRow);

  if (lastRow < startRow) return;

  // 讀取「上課時間」表：欄首與資料
  const timeHeaders = timeSheet.getRange(1, 1, 1, timeSheet.getLastColumn()).getValues()[0];
  const timeData = timeSheet.getRange(2, 1, Math.max(timeSheet.getLastRow() - 1, 0), timeSheet.getLastColumn()).getValues();

  // 建立「課程 → 候選時段(唯一、去空白、排序)」的 Map
  // 並順便先把 DataValidation 規則快取好（相同課程可重用規則，避免重複 build）
  const ruleCache = new Map();  // key: header原字串；value: DataValidationRule
  const norm = s => String(s || '').trim();
  const lower = s => norm(s).toLowerCase();

  // 先把每一欄的候選值整理好
  timeHeaders.forEach((header, colIdx) => {
    const h = norm(header);
    if (!h) return;

    const set = new Set();
    for (let r = 0; r < timeData.length; r++) {
      const v = norm(timeData[r][colIdx]);
      if (v) set.add(v);
    }
    const options = Array.from(set).sort(); // 排序，體驗較一致

    // 為該課程欄建立/快取規則
    const rule = options.length
      ? SpreadsheetApp.newDataValidation()
          .requireValueInList(options, true) // 允許手動輸入但必須在清單內
          .setAllowInvalid(false)
          .build()
      : null;

    ruleCache.set(h, rule);
  });

  // 提供一個尋找欄首的容錯：先精準再模糊（包含/被包含）
  function findHeaderKey(courseName) {
    if (!courseName) return null;
    const target = norm(courseName);
    if (ruleCache.has(target)) return target;

    // 模糊：大小寫不敏感、去空白；優先「被包含」>「包含」
    const t = lower(target);
    // 先試 header 包含 courseName
    for (const key of ruleCache.keys()) {
      if (lower(key).includes(t)) return key;
    }
    // 再試 courseName 包含 header
    for (const key of ruleCache.keys()) {
      if (t.includes(lower(key))) return key;
    }
    return null;
  }

  // 一次讀取學生名單的課程欄
  const courseRange = studentSheet.getRange(startRow, courseCol, lastRow - startRow + 1, 1);
  const courseValues = courseRange.getValues(); // 2D
  const timeRange = studentSheet.getRange(startRow, timeCol, lastRow - startRow + 1, 1);

  // 準備批次設定不同列的驗證（需 2D 陣列）
  const validations = [];
  for (let i = 0; i < courseValues.length; i++) {
    const course = norm(courseValues[i][0]);
    const headerKey = findHeaderKey(course);
    const rule = headerKey ? ruleCache.get(headerKey) : null;

    validations.push([rule]); // 每列一個規則（或 null 代表清除驗證）
  }

  // 批次套用驗證（null 會清除）
  timeRange.setDataValidations(validations);
}

/**
 * 建議：裝一個 onEdit 觸發器，當 F 欄(課程)被改動時自動刷新 G 欄(時間)的下拉
 * 先在 Apps Script > 觸發條件，新增「當試算表變更時」→ 選 applyCourseTimeDropdownFromTable
 * 或用下列簡單偵測（只針對單一儲存格編輯）
 */
function onEdit(e) {
  try {
    const sheet = e.range.getSheet();
    if (sheet.getName() !== '學生名單') return;
    const row = e.range.getRow();
    const col = e.range.getColumn();
    // 當 F 欄(課程)變更時，僅更新該列的 G 欄驗證，避免整張表重算
    if (col === 6 && row >= 2) {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const timeSheet = ss.getSheetByName('上課時間');

      const timeHeaders = timeSheet.getRange(1, 1, 1, timeSheet.getLastColumn()).getValues()[0];
      const timeData = timeSheet.getRange(2, 1, Math.max(timeSheet.getLastRow() - 1, 0), timeSheet.getLastColumn()).getValues();

      const norm = s => String(s || '').trim();
      const lower = s => norm(s).toLowerCase();

      // 先快取各課程規則
      const ruleCache = new Map();
      timeHeaders.forEach((header, colIdx) => {
        const h = norm(header);
        if (!h) return;
        const set = new Set();
        for (let r = 0; r < timeData.length; r++) {
          const v = norm(timeData[r][colIdx]);
          if (v) set.add(v);
        }
        const options = Array.from(set).sort();
        const rule = options.length
          ? SpreadsheetApp.newDataValidation()
              .requireValueInList(options, true)
              .setAllowInvalid(false)
              .build()
          : null;
        ruleCache.set(h, rule);
      });

      function findHeaderKey(courseName) {
        if (!courseName) return null;
        const target = norm(courseName);
        if (ruleCache.has(target)) return target;
        const t = lower(target);
        for (const key of ruleCache.keys()) if (lower(key).includes(t)) return key;
        for (const key of ruleCache.keys()) if (t.includes(lower(key))) return key;
        return null;
      }

      const course = norm(sheet.getRange(row, 6).getValue());
      const headerKey = findHeaderKey(course);
      const rule = headerKey ? ruleCache.get(headerKey) : null;

      const timeCell = sheet.getRange(row, 7);
      if (rule) {
        timeCell.setDataValidation(rule);
      } else {
        timeCell.clearDataValidations();
      }
    }
  } catch (err) {
    // 防呆：避免 onEdit 未定義 e 或其他小狀況造成中斷
    console.error(err);
  }
}