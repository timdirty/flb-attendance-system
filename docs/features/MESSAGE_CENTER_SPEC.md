# Message Center（訊息中心）規格 v1 — 2025-11-12

> 本文件為 FLB 簽到系統之「LINE Message API 管理介面」實作規格，隨開發持續回填與更新。所有內容以繁體中文撰寫。✅

## 1. 目標
- 建立集中化前端介面與後端 API，管理 LINE 訊息發送（文字、Flex）、模板庫、收件人分眾、（可選）排程、節流與稽核。
- 嚴格遵守輕量化原則：不新增大型前端/後端框架，維持現有 Express 架構。

## 2. 範圍（M1）
- 前端頁面：`public/message-admin.html`、`public/message-admin.js`、`public/message-admin.css`
- 後端模組：`src/message-service.js`（送信引擎）、`src/message-api.js`（路由）
- 資料檔：`src/data/message-templates.json`、`src/data/message-jobs.json`、`logs/message-jobs.log`
- 入口：在 `public/admin.html` 新增「📣 訊息中心」連結

## 3. 功能切片（M1）
- 模板庫：Text/Flex 模板 CRUD、即時預覽（Flex 以 JSON 輸入）
- Composer：文字訊息建立、變數（v2 規劃）
- 收件人：以 userId 手動輸入；分眾（教師）從 `data/bindings.json`；群組（以 groupId）；支援搜尋與加入清單
- 發送：立即或排程；選項含 bot 策略（primary/secondary/round_robin/all）、批次大小、每秒節流、重試次數
- 稽核：作業列表/詳情；NDJSON 逐筆寫入；CSV 匯出（M1 已提供）
- Rich Menu：單人綁定/解除（直連 LINE API，不是 mock）

## 4. 後端 API（/api/message）
- `GET /templates` 列表、`POST /templates` 新增、`PATCH /templates/:id` 更新、`DELETE /templates/:id` 刪除
- `POST /send` 建立發送作業（立即或排程）
- `GET /jobs` 作業列表、`GET /jobs/:id` 詳情、`POST /jobs/:id/cancel` 取消
- `POST /tools/test` 測試訊息、`POST /tools/loading` Loading 動畫
- `GET /tools/bot-info` 檢查已配置 Bot 健康
- `POST /richmenu/bind|unbind` Rich Menu 綁定/解除（需 `userId`，綁定需 `richMenuId`）
- `GET /recipients/users|teachers|groups` 收件人查詢；`POST /recipients/estimate` 估算數量
- `GET /export/:jobId.csv` 匯出作業明細
- 安全：需 Header `X-Admin-Key: $ADMIN_API_KEY`

## 5. 資料模型
- Template：`{ id, name, type, payload, variables:[], tags:[], updatedAt, updatedBy }`
- Job：`{ id, createdAt, createdBy, message, options, status, stats:{success,fail,retry}, scheduleAt?, startedAt?, finishedAt? }`
- 明細：`jobs/<jobId>.ndjson` 每行 `{ userId|groupId, botId, ok, status, attempt, error?, ts }`

## 6. 設定
- `.env`：`ADMIN_API_KEY`、`MESSAGE_RATE_LIMIT_PER_SEC`、`MESSAGE_BATCH_SIZE`、`MESSAGE_MAX_RETRIES`、`MESSAGE_DEFAULT_BOT_STRATEGY`

## 7. 風險與回滾
- 以路由掛載方式整合，可快速移除 `/api/message` 與頁面連結即回滾
- `server.js` 重要檔案修改前建立 `backup-YYYYMMDD-HHMMSS`

## 8. 待辦（M2+）
- 變數插值（例如 `{{displayName}}`）— 已完成（M2）
- CSV/上傳名單支援、CSV 匯出 — 已完成（M2/M1）
- 圖文/模板訊息（Buttons/Confirm/Carousel）— 規劃中
- Broadcast/Narrowcast API（視費率與權限評估）— 已提供可選路由（需 ENABLE_BROADCAST=true）
## 9. Flex Builder（管理員可視化排版）

- 前端：`public/flex-builder.html|js|css`
- 能力：
  - 視覺化插入元件（text/image/button/separator/spacer），並編修 JSON
  - 即時簡易預覽 + 插值預覽（呼叫 `/api/message/preview`）
  - 試發到指定 userId（真實打 LINE）
  - 儲存為「Flex 預設」，可附 `scopes`、`tags`、`notes`
  - 從預設列表套用、刪除或直接發送（/flex-presets/:id/send）
- 後端：
  - `GET/POST/PATCH/DELETE /api/message/flex-presets`
  - `POST /api/message/flex-presets/:id/send`
  - 資料檔：`src/data/flex-presets.json`

## 11. Webhook 與關鍵字管理

- 關鍵字規則 API（需 `X-Admin-Key`）
  - `GET /api/keywords`：列出規則（依 priority 排序）
  - `POST /api/keywords`：新增 `{ pattern, matchType: exact|contains|regex, action: alias_to|reply_text|reply_flex|http_forward, params, priority, enabled, stop }`
  - `PATCH /api/keywords/:id`：更新
  - `DELETE /api/keywords/:id`：刪除
  - `POST /api/keywords/test`：規則測試 `{ text }`
- 規則執行時機：在 Webhook 文字訊息處理前置攔截
  - reply_text：直接回覆並可 `stop` 中止後續流程
  - reply_flex：以 Flex 預設回覆
  - alias_to：改寫訊息文字（例如別名對映到「#出缺勤」）後進入既有流程
  - http_forward：將事件 `{ event, rule }` POST 至指定 URL（如需與外部服務整合）
- 轉發管理：沿用既有 `/api/webhook-forward/*`，在前端提供新增/啟用/停用/刪除 UI


## 10. 強化功能（2025-11-12）

- 屬性面板：點選預覽中元件可編輯文字/顏色/大小/action 等，並支援上移/下移/刪除
- 常用範本庫：提供 10+ 卡片（見 `docs/features/FLEX_TEMPLATES.md`），可一鍵插入
- 範圍（scopes）自動建議：從既有預設蒐集，顯示為 chips 供點選帶入
- 區塊重排：支援對 `body.contents` 的上/下移操作
- 多尺寸預覽：小/中/大型手機視圖；暗色背景模式
- 離線 JSON Schema 驗證：提供簡化驗證器，檢查 bubble/carousel 基本結構與元件必要欄位
- 匯入/匯出/複製/貼上：在 Builder 內快速交換 JSON
- 與訊息中心串接：一鍵儲存並跳轉載入當前 Flex（hash preset 方式）
