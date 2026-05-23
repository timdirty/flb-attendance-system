/** 從文字 / OCR 抓帳號末 4-5 碼。優先匹配明確標示，其次符號分隔。 */
function extractAccountLast5(text) {
  if (!text) return null;
  // 明確 keyword
  const explicit = [
    /末\s*五碼[:：\s]*(\d{5})/,
    /末\s*四碼[:：\s]*(\d{4})/,
    /帳號末[四五]碼[:：\s]*(\d{4,5})/,
    /帳號\s*[尾末][3-5]碼[:：\s]*(\d{3,5})/,
  ];
  for (const re of explicit) {
    const m = text.match(re);
    if (m) return m[1];
  }
  // 符號分隔（- 12345, *12345, # 12345）
  const symbolic = text.match(/[-*#]\s*(\d{4,5})\b/);
  if (symbolic) return symbolic[1];
  return null;
}

module.exports = { extractAccountLast5 };
