#!/usr/bin/env node
// scripts/line-payment-mock-demo.js
// 用 stub 資料 + 既有 LINE Bot 推一個 Flex Carousel 給核心 admin
// Phase 9.2 的 flex-builder 還沒寫好之前，先用 inline mock 驗證 UX
require('dotenv').config();
const axios = require('axios');

const MOCK_CANDIDATES = [
  { student_name: '王小明', parent: '媽媽 Lin', item: '鋼琴課',
    badge: '常規課', total: 1500, paid: 0, unpaid: 1500,
    amount_match: true, last5_match: true },
  { student_name: '王小華', parent: '媽媽 Lin', item: '繪畫班',
    badge: '常規課', total: 2000, paid: 0, unpaid: 2000,
    amount_match: false, last5_match: false },
];

function buildBubble(c, idx) {
  const dual = c.amount_match && c.last5_match;
  return {
    type: 'bubble', size: 'kilo',
    body: { type: 'box', layout: 'vertical', spacing: 'sm',
      contents: [
        { type: 'text', text: `候選 ${idx+1}`, weight: 'bold', size: 'sm' },
        { type: 'text', text: `學生：${c.student_name}`, size: 'sm' },
        { type: 'text', text: `家長：${c.parent}`, size: 'sm' },
        { type: 'text', text: `${c.item}`, size: 'sm' },
        { type: 'text', text: `未繳：NT$ ${c.unpaid}${c.amount_match ? ' ✓' : ''}`,
          weight: 'bold', color: c.amount_match ? '#00C851' : '#000' },
      ]},
    footer: { type: 'box', layout: 'vertical', spacing: 'xs',
      contents: [
        { type: 'button', style: 'primary',
          color: dual ? '#00C851' : '#FF8800',
          action: { type: 'postback', label: dual ? '✅ 一鍵綁定確認' : '⚠️ 進 dashboard',
                    data: `mock_demo_${idx}` }},
        { type: 'button', style: 'link',
          action: { type: 'postback', label: '❌ 退回', data: `mock_reject_${idx}` }}
      ]}
  };
}

const flexMsg = {
  type: 'flex',
  altText: '【DEMO】LINE 匯款偵測：2 筆候選',
  contents: { type: 'carousel', contents: MOCK_CANDIDATES.map(buildBubble) },
};

const ADMIN_USER_ID = process.argv[2];
if (!ADMIN_USER_ID) {
  console.error('Usage: node line-payment-mock-demo.js <ADMIN_LINE_USER_ID>');
  process.exit(1);
}

axios.post('https://api.line.me/v2/bot/message/push',
  { to: ADMIN_USER_ID, messages: [flexMsg] },
  { headers: { Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
                'Content-Type': 'application/json' }})
.then(() => console.log('demo flex pushed to', ADMIN_USER_ID))
.catch(e => console.error('failed:', e.response?.data || e.message));
