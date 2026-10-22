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
`CLASS_REMINDER_API_BASE_URL`（未設定時沿用 `UNIFIED_STUDENT_API_URL`）、`STUDENT_API_KEY`、`INTERNAL_GATEWAY_SECRET`。

提醒入口可單獨設定實際 API base（含反向代理 prefix），不可為了修提醒而改寫共用付款 base。明確設定但不合法時不回退。部署前必須以無效 token 的無寫入 probe 確認內部路徑回 400，405/HTML/redirect 皆不是通過。

正式內部回呼沿用 Gateway 的 Docker 穩定 alias：`CLASS_REMINDER_API_BASE_URL=http://funlearnbar-student-api:5004`。Bot 必須加入 API 所在的既有 private network；不得把內部 endpoint 加到公開 proxy。HTTP 例外只允許此精確 alias、5004 port 與根路徑，仍須雙重 server credentials，禁止 redirect；其他非 loopback HTTP 一律拒絕。使用 stable alias 而非 green/blue container 名稱，避免下一次全端切換失聯。
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

## 2026-09-09｜備援回條視覺修正

上述 9/8「尚未部署／僅兩個掛載」為當時紀錄，並非目前狀態。9/8 已發布
`b68eed7e3af268a93cbcaa837bd0eb8f71292599`，使用提醒專用 stable alias 與四個
持久掛載 `/app/data`、`/app/logs`、`/app/src/data`、`/app/jobs`。後續不得退回舊版部署方式。

本輪只修改接收端備援／異常 Flex：白底、品牌標誌、分離狀態、簡短說明與
「開啟家長入口」固定 HTTPS 按鈕。既有 API 正常回條保持原樣；不動付款、驗簽、
意願寫入或去重邏輯。未驗證 token 不得衍生學生姓名或課程深連結；連線不明
只能表示結果待確認，不能聲稱未寫入或提供自動重送。

驗證：新增七項測試先失敗再通過；全套 Node 96/96，0 failed/skip；獨立唯讀審查
無 actionable findings。四種程式實際產生的回條（失效、結果未知、已儲存會到、
已儲存待確認）通過 LINE `validate/reply` HTTP 200，僅驗證、未發送。
JSON 排版預覽檢查白底、層級、完整換行與查詢按鈕；預覽不是 LINE 手機渲染證據。

發布必須由 incident owner 從 b68 的後繼 commit 建置，保留四個掛載、既有環境與
網路。先 quiesce 並驗證付款／訊息狀態穩定，再切換；保留舊容器但禁止雙 worker。
新的手機收件證據與正式 SHA 需另行驗證，不能用本機測試或此紀錄代替。
