# 家長到課意願回覆入口

Owner: Codex task 01a06c74-6bb6-74a1-a0db-45f6d86c1abd
Created: 2026-09-08
Base: 65ca4dff6bb17026b79c6b0acee926073515645c（已比對正式 server.js、config、付款 integration 雜湊）
Repo: timdirty/flb-attendance-system
State: 程式與本機驗證完成；待唯一 coordinator 處理正式切換，此隔離來源尚未整合，禁止清理。

## 原因與範圍

正式家長 LINE webhook 位於本服務。新提醒使用 URL query 格式的
`class_reminder_response`，舊 JSON postback parser 不認得且跳過轉發。
左側「我會到上課」僅是按鈕 displayText，不代表資料已存。

## 實作與驗證計畫

1. 新增獨立 middleware，僅接管新 action；在舊日誌、付款 enqueue、ACK 前驗證原始 LINE 簽章。
2. 只從已驗簽的個人事件取來源 UID，向既有內部 API 提交簽章 token 與 attend/pending。
3. 原樣回傳 API 的正式 Flex 回條；API 已儲存但無 Flex 時用明確的小型 Flex 確認。
4. 使用同一 primary channel 的 replyToken 與 access token。禁止多帳號推播、失敗後自動 push、記錄 token/UID/headers。
5. 非成功、過期與不確定結果使用不同的 Flex 提示；不把家長意願當老師點名。
6. 以原始簽章 webhook 到 HTTP transport 的合成測試鎖定正常、異常、重送、混合舊事件和防偽邊界，另跑既有付款測試。

## 部署設定與界線

需要同一 primary channel 的 `LINE_CHANNEL_SECRET`、`LINE_CHANNEL_ACCESS_TOKEN`，以及
`UNIFIED_STUDENT_API_URL`、`STUDENT_API_KEY`、`INTERNAL_GATEWAY_SECRET`。
API URL 必須為管理者設定的 HTTPS URL（本機合成測試可用 loopback HTTP）。
新 secret 不可沿用付款的 `LINE_INTEGRATION_SECRET_CURRENT`。

正式發布須與唯一 FLB coordinator 協調，使用鎖定 source/image，保留原容器環境及持久資料。
不可拿較舊 origin/main 覆蓋已上線的付款整合，不可覆蓋 NAS dirty 原始碼。
先驗證父帳號 channel identity、secret/API key 配對及無副作用的 API 探測；不得重播真實家長按鈕或補發。
回滾使用已保存的原 image/config，不能還原付款或出席資料。

事件去重限單程序短期記憶體；資料端已有 target/recipient UPSERT。不得宣稱跨程序 exactly-once。
任何 LINE reply 不確定結果只記錄去識別狀態，不使用 push 補送。

## 驗證結果（2026-09-08）

- 82/82 native Node tests 通過，0 skip：47 個新入口/HTTP案例、35 個既有付款案例。
- RED→GREEN：缺少 bridge；null API result；同家長回覆競態；mixed legacy enqueue 延遲。
- 真實 Express raw-body HTTP 驗簽，使用 FLB Course `2c171735` 的正式 `build_class_reminder_response_receipt` 產生虛構學生 fixtures；attend/pending 均原樣到 reply transport。
- Node syntax、`git diff --check` 通過；不變更依賴或 lockfile。
- 獨立 read-only security review 無 P0/P1；補上其提出的 mixed legacy 即時 enqueue 與缺 channel secret 測試。
- 正式 primary bot identity 與 API 發提醒的 DB token 對應同一 bot，SHA-256 `739c7176b36910507bee3d21bdca8d42fbd638c89a1d8d3bee40c1df50746a77`。
- LINE 官方 `POST /v2/bot/message/validate/reply`：兩個正式 renderer 回條、四個 fallback/error Flex 均 HTTP 200；只驗證，沒有傳訊息。
- 正式 bot 的 API URL/key 配對正確，但缺 `INTERNAL_GATEWAY_SECRET`；此缺值尚未在 production 補入。
- 尚未部署，沒有真實使用者點擊／手機收到確認卡的證據，也沒有重播、補發或代填意願。

## 正式部署的資料保留風險

已實查 `flb-line-bot` 僅掛載 `/app/data`、`/app/logs`。
但 `/app/src/data` 有活躍 SQLite queue（含 WAL/SHM）、使用者/綁定、匯款紀錄、訊息/模板等。
不可直接刪除並重建容器；需先由 incident owner 設計停止寫入、完整備份、保留與回滾。
不能拿 origin/main `16df6c2` 覆蓋已上線的 `65ca4dff` 付款整合。
