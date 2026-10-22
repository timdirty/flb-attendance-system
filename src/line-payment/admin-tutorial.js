/** Phase 9.4 — first-time admin tutorial Flex message + persisted "shown" state. */
const fs = require('fs');
const path = require('path');

const TUTORIAL_FLAG = path.join(__dirname, '../data/admin-tutorial-shown.json');

function loadShown() {
    try {
        return JSON.parse(fs.readFileSync(TUTORIAL_FLAG, 'utf8'));
    } catch (e) {
        return {};
    }
}

function saveShown(state) {
    try {
        fs.writeFileSync(TUTORIAL_FLAG, JSON.stringify(state, null, 2));
    } catch (e) {
        console.warn('[line-payment] failed to persist tutorial flag:', e.message);
    }
}

function buildTutorialMessage() {
    return {
        type: 'flex',
        altText: 'LINE 匯款整合 — 第一次使用說明',
        contents: {
            type: 'bubble',
            header: {
                type: 'box', layout: 'vertical',
                contents: [{
                    type: 'text', text: '🆕 LINE 匯款整合 — 使用說明',
                    weight: 'bold', size: 'md',
                }],
            },
            body: {
                type: 'box', layout: 'vertical', spacing: 'sm',
                contents: [
                    { type: 'text', wrap: true, size: 'sm',
                      text: '當家長在 LINE 講「我匯了」時，您會收到候選清單：' },
                    { type: 'text', wrap: true, size: 'sm', color: '#00C851',
                      text: '🟢 一鍵綁定確認 — 金額+末五碼吻合，可放心點' },
                    { type: 'text', wrap: true, size: 'sm', color: '#FF8800',
                      text: '🟠 進 dashboard 詳細 — 只一項吻合，建議去詳細看' },
                    { type: 'text', wrap: true, size: 'sm', color: '#FF0000',
                      text: '⚠️ 萬一按錯：1 分鐘內可撤銷（後續訊息中會有撤銷按鈕）' },
                    { type: 'text', wrap: true, size: 'sm',
                      text: '退回原因會自動發 LINE 給家長補資料。' },
                ],
            },
        },
    };
}

async function maybeShowTutorial(adminUserId, sendFn) {
    const shown = loadShown();
    if (shown[adminUserId]) return false;
    try {
        await sendFn(adminUserId, buildTutorialMessage());
        shown[adminUserId] = new Date().toISOString();
        saveShown(shown);
        return true;
    } catch (e) {
        console.warn(`[line-payment] tutorial push failed admin=${adminUserId}: ${e.message}`);
        return false;
    }
}

module.exports = { maybeShowTutorial, buildTutorialMessage };
