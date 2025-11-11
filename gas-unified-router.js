/**
 * 統一路由器 - 整合所有 API 端點
 * 請將此檔案的內容加到您的 GAS 專案中，取代原本的 doGet/doPost 函式
 */

/**
 * GET 請求路由器
 * 處理所有 GET 類型的 API 呼叫
 */
function doGet(e) {
  var p = (e && e.parameter) ? e.parameter : {};
  
  try {
    var action = p.action || '';
    
    // ==================== Users API ====================
    if (action === 'listUsers')      return ContentService.createTextOutput(JSON.stringify(listUsers_(p))).setMimeType(ContentService.MimeType.JSON);
    if (action === 'getUser')        return ContentService.createTextOutput(JSON.stringify(getUser_(p))).setMimeType(ContentService.MimeType.JSON);
    if (action === 'exportUsersCsv') return ContentService.createTextOutput(exportUsersCsv_(p)).setMimeType(ContentService.MimeType.CSV);
    if (action === 'listAllUsers')   return ContentService.createTextOutput(JSON.stringify(listAllUsers_(p))).setMimeType(ContentService.MimeType.JSON);

    // ==================== Bindings API ====================
    if (action === 'listBindings')      return ContentService.createTextOutput(JSON.stringify(listBindings_(p))).setMimeType(ContentService.MimeType.JSON);
    if (action === 'getBinding')        return ContentService.createTextOutput(JSON.stringify(getBinding_(p))).setMimeType(ContentService.MimeType.JSON);
    if (action === 'exportBindingsCsv') return ContentService.createTextOutput(exportBindingsCsv_(p)).setMimeType(ContentService.MimeType.JSON);
    if (action === 'listAllBindings')   return ContentService.createTextOutput(JSON.stringify(listAllBindings_(p))).setMimeType(ContentService.MimeType.JSON);

    // ==================== Groups API（新增）====================
    if (action === 'listGroups')     return ContentService.createTextOutput(JSON.stringify(listGroups_(p))).setMimeType(ContentService.MimeType.JSON);
    if (action === 'getGroup')       return ContentService.createTextOutput(JSON.stringify(getGroup_(p))).setMimeType(ContentService.MimeType.JSON);
    if (action === 'listAllGroups')  return ContentService.createTextOutput(JSON.stringify(listAllGroups_(p))).setMimeType(ContentService.MimeType.JSON);

    // ==================== Schedules API ====================
    if (action === 'listSchedules')       return ContentService.createTextOutput(JSON.stringify(listSchedules_(p))).setMimeType(ContentService.MimeType.JSON);
    if (action === 'getSchedule')         return ContentService.createTextOutput(JSON.stringify(getSchedule_(p))).setMimeType(ContentService.MimeType.JSON);
    if (action === 'getScheduleByKey')    return ContentService.createTextOutput(JSON.stringify(getScheduleByKey_(p))).setMimeType(ContentService.MimeType.JSON);
    if (action === 'exportSchedulesCsv')  return ContentService.createTextOutput(exportSchedulesCsv_(p)).setMimeType(ContentService.MimeType.CSV);
    if (action === 'listAllSchedules')    return ContentService.createTextOutput(JSON.stringify(listAllSchedules_(p))).setMimeType(ContentService.MimeType.JSON);

    // ==================== Schedules Link API ====================
    if (action === 'listSchedulesLink')      return ContentService.createTextOutput(JSON.stringify(listSchedulesLink_(p))).setMimeType(ContentService.MimeType.JSON);
    if (action === 'getScheduleLinkByKey')   return ContentService.createTextOutput(JSON.stringify(getScheduleLinkByKey_(p))).setMimeType(ContentService.MimeType.JSON);
    if (action === 'exportSchedulesLinkCsv') return ContentService.createTextOutput(exportSchedulesLinkCsv_(p)).setMimeType(ContentService.MimeType.CSV);
    if (action === 'listAllSchedulesLink')   return ContentService.createTextOutput(JSON.stringify(listAllSchedulesLink_(p))).setMimeType(ContentService.MimeType.JSON);

    // ==================== Teacher CourseTimes API ====================
    if (action === 'listTeacherCourseTimes')
      return ContentService.createTextOutput(JSON.stringify(listTeacherCourseTimes_(p))).setMimeType(ContentService.MimeType.JSON);

    // 未知的 action
    return ContentService.createTextOutput(JSON.stringify({
      success: false, 
      message: 'Unknown action: ' + action,
      availableActions: [
        'listUsers', 'getUser', 'listAllUsers',
        'listBindings', 'getBinding', 'listAllBindings',
        'listGroups', 'getGroup', 'listAllGroups',
        'listSchedules', 'getSchedule', 'listAllSchedules',
        'listSchedulesLink', 'listAllSchedulesLink',
        'listTeacherCourseTimes'
      ]
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false, 
      message: err.message || String(err),
      stack: err.stack
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * POST 請求路由器
 * 處理所有 POST 類型的 API 呼叫
 */
function doPost(e) {
  try {
    // 解析參數
    var p = {};
    if (e && e.postData && e.postData.contents) {
      try { 
        p = JSON.parse(e.postData.contents); 
      } catch (_) { 
        p = e.parameter || {}; 
      }
    } else {
      p = e ? (e.parameter || {}) : {};
    }

    var action = String(p.action || '');

    // ==================== 課程簽到 & 查詢 API ====================
    if (action === 'update') {
      // 簽到功能（來自第一個檔案）
      return jsonOutput(handleUpdate_(e, p));
    }
    
    if (action === 'query') {
      // 查詢剩餘+出缺勤（來自第一個檔案）
      return jsonOutput(handleQuery_(e, p));
    }
    
    if (action === 'getCoursesForSelect') {
      return jsonOutput(handleGetCoursesForSelect_(e, p));
    }
    
    if (action === 'getTimesByCourse') {
      return jsonOutput(handleGetTimesByCourse_(e, p));
    }
    
    if (action === 'getCourseMeta') {
      return jsonOutput(handleGetCourseMeta_(e, p));
    }
    
    if (action === 'getStudentsByCourseAndTime') {
      return jsonOutput(handleGetStudentsByCourseAndTime_(e, p));
    }
    
    if (action === 'appendTeacherCourse') {
      return jsonOutput(handleAppendTeacherCourse_(e, p));
    }
    
    if (action === 'getTeacherList') {
      return jsonOutput(handleGetTeacherList_(e, p));
    }
    
    if (action === 'getStudentList') {
      return jsonOutput(handleGetStudentList_(e, p));
    }
    
    if (action === 'getCoursesByTeacher') {
      return jsonOutput(handleGetCoursesByTeacher_(e, p));
    }
    
    if (action === 'getRosterAttendance') {
      return jsonOutput(handleGetRosterAttendance_(e, p));
    }

    // ==================== Groups API（新增）====================
    if (action === 'upsertGroups') {
      return ContentService.createTextOutput(JSON.stringify(upsertGroups_(p)))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ==================== Schedules API ====================
    if (action === 'addSchedule') {
      return ContentService.createTextOutput(JSON.stringify(writeSchedule_(p)))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'addOrUpdateSchedule') {
      return ContentService.createTextOutput(JSON.stringify(addOrUpdateSchedule_(p)))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ==================== Schedules Link API ====================
    if (action === 'addScheduleLink') {
      return ContentService.createTextOutput(JSON.stringify(writeScheduleLink_(p)))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'addOrUpdateScheduleLink') {
      return ContentService.createTextOutput(JSON.stringify(addOrUpdateScheduleLink_(p)))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'addSchedulesLinkBulk') {
      return ContentService.createTextOutput(JSON.stringify(addSchedulesLinkBulk_(p)))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'addOrUpdateSchedulesLinkBulk') {
      return ContentService.createTextOutput(JSON.stringify(addOrUpdateSchedulesLinkBulk_(p)))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 未知的 action
    return ContentService.createTextOutput(JSON.stringify({
      success: false, 
      message: 'Unknown POST action: ' + action,
      availableActions: [
        'update', 'query', 'getStudentList', 'getRosterAttendance',
        'upsertGroups',
        'addSchedule', 'addOrUpdateSchedule',
        'addScheduleLink', 'addOrUpdateScheduleLink'
      ]
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false, 
      message: err.message || String(err),
      stack: err.stack
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 輔助函式：包裝 JSON 輸出
 */
function jsonOutput(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 以下是將第一個檔案的 doPost 邏輯拆分成獨立函式
 * 這樣可以避免程式碼重複，同時保持清晰的結構
 */

// 注意：這裡只是路由器的框架
// 實際的處理邏輯（handle*_ 函式）需要從您的第一個檔案中提取出來
// 或者直接在原本的 doPost 中加入 Groups 相關的 action 判斷即可

/**
 * 處理簽到更新
 */
function handleUpdate_(e, data) {
  // 將第一個檔案中 action==="update" 的程式碼搬到這裡
  // 或保持原樣，這裡只是示意
  throw new Error('請將第一個檔案的 update 邏輯整合到此函式');
}

/**
 * 處理查詢
 */
function handleQuery_(e, data) {
  // 將第一個檔案中 action==="query" 的程式碼搬到這裡
  throw new Error('請將第一個檔案的 query 邏輯整合到此函式');
}

// ... 其他 handle*_ 函式同理

