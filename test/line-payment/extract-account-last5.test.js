const { test } = require('node:test');
const assert = require('node:assert/strict');
const { extractAccountLast5 } = require('../../src/line-payment/extract-account-last5');

test('extracts from "- 12345" pattern', () => {
  assert.equal(extractAccountLast5('我匯了 1500 - 12345'), '12345');
});

test('extracts from "末五碼 12345" pattern', () => {
  assert.equal(extractAccountLast5('已轉帳 末五碼 12345'), '12345');
});

test('extracts from "*12345" pattern', () => {
  assert.equal(extractAccountLast5('已匯款 NT$1500 *12345'), '12345');
});

test('extracts from OCR "帳號末五碼: 12345"', () => {
  assert.equal(extractAccountLast5('帳號末五碼: 12345'), '12345');
});

test('returns null when no last5 found', () => {
  assert.equal(extractAccountLast5('我匯了 1500'), null);
});

test('extracts 4-digit when 5 not found', () => {
  assert.equal(extractAccountLast5('末四碼 1234'), '1234');
});

test('returns null for empty input', () => {
  assert.equal(extractAccountLast5(''), null);
  assert.equal(extractAccountLast5(null), null);
  assert.equal(extractAccountLast5(undefined), null);
});
