// public/common/js/utils.js

/**
 * HTML特殊文字を安全にエスケープ（XSS対策・テキスト用）
 * 例：< → &lt;
 * @param {string} str - サニタイズする文字列
 * @returns {string} - エスケープ済み文字列
 */
function sanitize(str) {
  if (typeof str !== "string") return str;
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * HTMLタグを一部許可して安全にサニタイズ（DOMPurify版）
 * Excel表などHTML構造を保持したい場合に使用
 * @param {string} html - サニタイズ対象のHTML文字列
 * @returns {string} - 許可済みタグのみ残した安全なHTML
 */
function sanitizeHTML(html) {
  if (typeof DOMPurify === "undefined") {
    console.warn("DOMPurifyが読み込まれていません。");
    return sanitize(html);
  }

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "table", "thead", "tbody", "tr", "td", "th",
      "colgroup", "col", "div", "span", "b", "i", "u",
      "br", "p", "style"
    ],
    ALLOWED_ATTR: [
      "style", "class", "border", "cellpadding", "cellspacing",
      "width", "height"
    ]
  });
}
