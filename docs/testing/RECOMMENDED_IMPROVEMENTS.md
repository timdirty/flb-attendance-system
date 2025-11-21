# 💡 匯款功能測試後改進建議

**基於**：自我測試驗證報告（SELF_TEST_VALIDATION_REPORT.md）  
**日期**：2025-11-21  
**狀態**：建議中（可選擇性實施）

---

## 🔧 建議修改項目

### 1. 金額解析正則優化 ⚠️ 中等優先級

**問題描述**：
目前 `parseAmountFromText()` 使用正則 `/\d{3,}/`，要求至少 3 位數字，導致無法解析小額金額。

**影響範圍**：
- ❌ 無法解析：`我匯款 50 元`
- ❌ 無法解析：`轉帳 99`
- ❌ 無法解析：`匯款 100`（邊界）
- ✅ 可以解析：`匯款 1000`

**當前代碼**：
```javascript
// server.js 第 3734 行
const match = text.replace(/,/g, '').match(/(?:NT\$|NT|USD|台幣|元|塊)?\s*(\d{3,})/i);
```

**建議修改**：
```javascript
// 方案 1：支援所有金額（1 元起）
const match = text.replace(/,/g, '').match(/(?:NT\$|NT|USD|台幣|元|塊)?\s*(\d+)/i);

// 方案 2：支援 10 元起（避免誤判單位數字）
const match = text.replace(/,/g, '').match(/(?:NT\$|NT|USD|台幣|元|塊)?\s*(\d{2,})/i);
```

**建議採用**：方案 2（`\d{2,}`）

**理由**：
- ✅ 支援 10-99 元的小額金額
- ✅ 避免誤判「我 1 個人匯款」中的「1」
- ✅ 符合實際使用場景（10 元以下匯款較少見）

**修改步驟**：
1. 編輯 `server.js`
2. 找到第 3734 行
3. 修改正則表達式
4. 重啟服務測試

**測試案例**：
```
✅ 「我匯款 50 元」 → 應解析為 50
✅ 「轉帳 99」 → 應解析為 99
✅ 「匯款 100」 → 應解析為 100
✅ 「我 1 個人匯款 1000 元」 → 應解析為 1000（非 1）
```

---

### 2. 增強測試案例覆蓋 💡 低優先級

**建議新增測試案例**：

#### 小額金額測試
```
- 「我匯款 50 元」（測試兩位數）
- 「轉帳 99」（測試邊界）
- 「匯款 10 元」（測試最小建議值）
```

#### 大額金額測試
```
- 「已匯款 NT$ 1,234,567」（測試多個逗號）
- 「轉帳 999999 元」（測試無逗號大額）
```

#### 特殊格式測試
```
- 「明　天　匯　款」（測試全形空白）
- 「轉帳完成轉帳完成」（測試重複關鍵字）
- 「我 1 個人匯款 1000 元」（測試數字干擾）
```

#### 混合語意測試
```
- 「還沒匯款，但明天會處理」（測試多重語意）
- 「請問匯款了嗎？」（測試混合詢問+疑問）
```

**實作方式**：
在 `REMITTANCE_TEXT_TEST_CASES.md` 新增測試組 I（擴充測試）。

---

### 3. 單元測試實作 💡 低優先級

**建議建立**：`tests/unit/remittance.test.js`

**測試框架建議**：Jest 或 Mocha

**測試範例**：
```javascript
// 測試金額解析
describe('parseAmountFromText', () => {
    test('應正確解析純數字', () => {
        expect(parseAmountFromText('我匯款 1500')).toBe('1500');
    });
    
    test('應正確解析 NT$ 格式', () => {
        expect(parseAmountFromText('已轉帳 NT$2000')).toBe('2000');
    });
    
    test('應移除逗號', () => {
        expect(parseAmountFromText('匯款 1,500 元')).toBe('1500');
    });
    
    test('無金額時應回傳 null', () => {
        expect(parseAmountFromText('我已經匯款了')).toBeNull();
    });
});

// 測試語意分析
describe('analyzeRemittanceIntentText', () => {
    test('應偵測延後關鍵字', () => {
        const result = analyzeRemittanceIntentText('明天處理匯款');
        expect(result.shouldDefer).toBe(true);
        expect(result.reason).toBe('postpone');
    });
    
    test('應偵測否定關鍵字', () => {
        const result = analyzeRemittanceIntentText('還沒匯款');
        expect(result.shouldDefer).toBe(true);
        expect(result.reason).toBe('negative');
    });
});
```

**優點**：
- ✅ 自動化測試，提高開發效率
- ✅ 回歸測試，防止修改導致 bug
- ✅ 文檔化，清楚展示預期行為

---

### 4. 英文關鍵字支援 💡 低優先級

**使用場景**：部分使用者可能使用英文

**建議新增關鍵字**：
```bash
# .env
REMITTANCE_KEYWORDS=匯款,轉帳,轉帳完成,已轉,ATM,transfer,payment,paid,remittance
```

**語意過濾英文支援**：
```bash
REMITTANCE_POSTPONE_KEYWORDS=明天,明日,稍後,tomorrow,later,soon
REMITTANCE_NEGATIVE_KEYWORDS=還沒,尚未,not yet,haven't
REMITTANCE_INQUIRY_KEYWORDS=請問,如何,how to,how can
```

**注意事項**：
- 需測試英文大小寫問題
- `includesAnyKeyword()` 已有 `.toLowerCase()` 處理

---

### 5. 記錄檔案管理 💡 低優先級

**問題**：`remittance-records.json` 可能無限增長

**建議方案**：

#### 方案 1：定期歸檔
```bash
# 每月歸檔一次
mv src/data/remittance-records.json \
   src/data/archives/remittance-records-2025-11.json
```

#### 方案 2：自動清理
```javascript
// 保留最近 30 天的記錄
function cleanOldRecords() {
    const records = loadRemittanceRecords();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const filtered = records.filter(r => 
        new Date(r.createdAt) > thirtyDaysAgo
    );
    saveRemittanceRecords(filtered);
}
```

#### 方案 3：資料庫遷移
將 JSON 檔案遷移到 SQLite 或 PostgreSQL。

**建議**：先採用方案 1（手動歸檔），視資料量決定是否升級。

---

## 📊 優先級總結

| 項目 | 優先級 | 工作量 | 影響範圍 |
|------|--------|--------|----------|
| 1. 金額解析優化 | ⚠️ 中 | 5 分鐘 | 解析功能 |
| 2. 測試案例擴充 | 💡 低 | 30 分鐘 | 測試覆蓋 |
| 3. 單元測試實作 | 💡 低 | 2-4 小時 | 開發流程 |
| 4. 英文關鍵字 | 💡 低 | 10 分鐘 | 關鍵字偵測 |
| 5. 記錄管理 | 💡 低 | 1 小時 | 資料維護 |

---

## ✅ 建議實施順序

### 階段 1：立即改進（5-10 分鐘）
1. ✅ 修改金額解析正則（如有需要）
2. ✅ 重啟服務並測試

### 階段 2：短期改進（1-2 小時）
1. 📋 新增擴充測試案例
2. 📋 實際執行新測試案例
3. 📋 更新測試文檔

### 階段 3：中期改進（可選）
1. 💡 實作單元測試
2. 💡 建立 CI/CD 流程
3. 💡 英文關鍵字支援

### 階段 4：長期改進（可選）
1. 💡 資料庫遷移
2. 💡 自動化歸檔機制
3. 💡 管理後台開發

---

## 🎯 結論

**當前狀態**：✅ 系統運作良好，邏輯完善

**必要改進**：無（系統已可正常運作）

**建議改進**：
- 金額解析優化（如業務需要支援小額金額）
- 其他皆為可選性優化

**下一步**：
1. 根據實際業務需求決定是否實施
2. 先進行實際 LINE 測試驗證
3. 稍後測試 OCR 功能

---

**文檔建立時間**：2025-11-21  
**維護者**：FLB 簽到系統團隊
