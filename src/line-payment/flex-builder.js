/** Build LINE Flex Carousel for candidate list with hierarchical buttons (v4.1 UX safeguard) */

const DASHBOARD_BASE = process.env.STUDENT_MANAGER_DASHBOARD_URL
  || 'https://course-viewer.funlearnbar.synology.me/student-manager';

function buildBubble(candidate, idx, signFn) {
  const dual = candidate.amount_matches_hint && candidate.account_last5_matches_hint;
  const amountOnly = candidate.amount_matches_hint && !candidate.account_last5_matches_hint;
  const last5Only = !candidate.amount_matches_hint && candidate.account_last5_matches_hint;
  // const neither = !candidate.amount_matches_hint && !candidate.account_last5_matches_hint;

  let confirmBtn;
  if (dual) {
    confirmBtn = {
      type: 'button',
      style: 'primary',
      color: '#00C851',
      action: {
        type: 'postback',
        label: '✅ 一鍵綁定確認',
        data: signFn({ ...candidate, action: 'verify' }),
      },
    };
  } else if (amountOnly || last5Only) {
    confirmBtn = {
      type: 'button',
      style: 'primary',
      color: '#FF8800',
      action: {
        type: 'uri',
        label: amountOnly ? '⚠️ 需檢查 — 進 dashboard' : '⚠️ 金額不符 — 進 dashboard',
        uri: `${DASHBOARD_BASE}/payments?focus_target=${candidate.target_id}`,
      },
    };
  } else {
    confirmBtn = {
      type: 'button',
      style: 'secondary',
      action: {
        type: 'uri',
        label: '需要審核 — 進 dashboard',
        uri: `${DASHBOARD_BASE}/payments?focus_target=${candidate.target_id}`,
      },
    };
  }

  const rejectBtn = {
    type: 'button',
    style: 'link',
    action: {
      type: 'postback',
      label: '❌ 退回',
      data: signFn({ ...candidate, action: 'reject' }),
    },
  };

  return {
    type: 'bubble',
    size: 'kilo',
    body: {
      type: 'box', layout: 'vertical', spacing: 'sm',
      contents: [
        { type: 'text', text: `候選 ${idx + 1}`, weight: 'bold', size: 'sm' },
        { type: 'text', text: `學生：${candidate.student_name}`, size: 'sm' },
        { type: 'text', text: `家長：${candidate.parent_line_display_name || '—'}`, size: 'sm' },
        { type: 'text', text: `${candidate.item_name}`, size: 'sm', wrap: true },
        { type: 'box', layout: 'horizontal', spacing: 'xs', contents: [
            { type: 'text', text: candidate.item_type_badge || '常規課', size: 'xs',
              backgroundColor: '#E0F2F1', color: '#00695C',
              flex: 0, paddingAll: '4px' },
        ] },
        { type: 'text', text: `應繳：NT$ ${(candidate.total_fee || 0).toLocaleString()}`, size: 'sm' },
        { type: 'text', text: `已繳：NT$ ${(candidate.paid || 0).toLocaleString()}`, size: 'sm' },
        { type: 'text',
          text: `未繳：NT$ ${(candidate.unpaid || 0).toLocaleString()}${candidate.amount_matches_hint ? ' ✓' : ''}`,
          size: 'sm', weight: 'bold',
          color: candidate.amount_matches_hint ? '#00C851' : '#000000' },
      ],
    },
    footer: { type: 'box', layout: 'vertical', spacing: 'xs',
              contents: [confirmBtn, rejectBtn] },
  };
}

function buildSummaryBubble(totalCandidates, moreUrl) {
  return {
    type: 'bubble', size: 'kilo',
    body: {
      type: 'box', layout: 'vertical',
      contents: [
        { type: 'text', text: `還有 ${totalCandidates - 9} 筆候選`,
          weight: 'bold', size: 'md' },
        { type: 'button',
          action: { type: 'uri', label: '看完整清單 →', uri: moreUrl },
          style: 'link' },
      ],
    },
  };
}

function buildZeroCandidateBubble() {
  return {
    type: 'bubble', size: 'kilo',
    body: {
      type: 'box', layout: 'vertical',
      contents: [
        { type: 'text', text: '此 LINE 帳號未綁定學生',
          weight: 'bold', size: 'md' },
        { type: 'button', style: 'primary',
          action: { type: 'uri', label: '進 dashboard 處理',
                    uri: `${DASHBOARD_BASE}/payments` } },
      ],
    },
  };
}

function buildCandidateCarousel({ candidates, candidate_set_id, total_candidates,
                                  moreInDashboardUrl, signFn }) {
  if (!candidates || candidates.length === 0) {
    return {
      type: 'flex',
      altText: 'LINE 匯款偵測：此帳號未綁定學生',
      contents: { type: 'carousel', contents: [buildZeroCandidateBubble()] },
    };
  }
  const bubbles = candidates.slice(0, 9).map((c, i) => buildBubble(c, i, signFn));
  if (total_candidates > 9 && moreInDashboardUrl) {
    bubbles.push(buildSummaryBubble(total_candidates, moreInDashboardUrl));
  }
  return {
    type: 'flex',
    altText: `LINE 匯款偵測：${total_candidates} 筆候選`,
    contents: { type: 'carousel', contents: bubbles },
  };
}

module.exports = { buildCandidateCarousel, buildBubble, buildZeroCandidateBubble };
