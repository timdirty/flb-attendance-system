const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildCandidateCarousel } = require('../../src/line-payment/flex-builder');

const SAMPLE_CANDIDATE = {
  target_type: 'normal_enrollment',
  target_id: '101',
  student_name: '王小明',
  parent_line_display_name: '媽媽 Lin',
  item_name: '鋼琴課',
  item_type_badge: '常規課',
  total_fee: 1500,
  paid: 0,
  unpaid: 1500,
  amount_matches_hint: true,
  account_last5_matches_hint: true,
};

test('amount + last5 雙吻合 -> green one-tap button', () => {
  const flex = buildCandidateCarousel({
    candidates: [SAMPLE_CANDIDATE],
    candidate_set_id: 'cs_x',
    total_candidates: 1,
    signFn: () => 'fake_token',
  });
  const bubble = flex.contents.contents[0];
  const confirmBtn = bubble.footer.contents.find(c => c.type === 'button' && c.action.label.includes('一鍵綁定'));
  assert.equal(confirmBtn.color, '#00C851');
});

test('amount only ✓ -> orange button to dashboard', () => {
  const flex = buildCandidateCarousel({
    candidates: [{ ...SAMPLE_CANDIDATE, account_last5_matches_hint: false }],
    candidate_set_id: 'cs_x', total_candidates: 1, signFn: () => 'fake',
  });
  const bubble = flex.contents.contents[0];
  const btn = bubble.footer.contents.find(c => c.type === 'button' && c.action.label.includes('需檢查'));
  assert.equal(btn.color, '#FF8800');
});

test('zero candidates -> binding bubble', () => {
  const flex = buildCandidateCarousel({
    candidates: [], candidate_set_id: 'cs_z', total_candidates: 0, signFn: () => 'fake',
  });
  assert.equal(flex.contents.contents.length, 1);
  const bubble = flex.contents.contents[0];
  assert.match(JSON.stringify(bubble), /未綁定學生/);
});

test('15 candidates -> 9 + summary bubble', () => {
  const candidates = Array.from({ length: 15 }, (_, i) => ({
    ...SAMPLE_CANDIDATE, target_id: String(i), student_name: `學生${i}`,
  }));
  const flex = buildCandidateCarousel({
    candidates: candidates.slice(0, 9),
    candidate_set_id: 'cs_15', total_candidates: 15, signFn: () => 'fake',
    moreInDashboardUrl: '/payments?candidate_set=cs_15',
  });
  assert.equal(flex.contents.contents.length, 10);
  const last = flex.contents.contents[9];
  assert.match(JSON.stringify(last), /還有 \d+ 筆/);
});

test('parent line display name + student name shown in bubble', () => {
  const flex = buildCandidateCarousel({
    candidates: [SAMPLE_CANDIDATE], candidate_set_id: 'cs', total_candidates: 1, signFn: () => 'fake',
  });
  const bubbleText = JSON.stringify(flex.contents.contents[0]);
  assert.match(bubbleText, /王小明/);
  assert.match(bubbleText, /媽媽 Lin/);
  assert.match(bubbleText, /常規課/);
});

test('signFn called for verify and reject buttons', () => {
  const calls = [];
  buildCandidateCarousel({
    candidates: [SAMPLE_CANDIDATE], candidate_set_id: 'cs', total_candidates: 1,
    signFn: (payload) => { calls.push(payload.action); return 'token'; },
  });
  assert.ok(calls.includes('verify'));
  assert.ok(calls.includes('reject'));
});
