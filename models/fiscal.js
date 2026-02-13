//開発時の仮置きのファイルなので後日、稼働後は削除する予定


// models/fiscal.js
export function getCurrentFiscalYear() {
  // 例: 現在年度を返す
  const now = new Date();
  const year = now.getFullYear();
  return year; 
}

export function isFiscalYearClosed(year) {
  // 例: まだ締めていない年度だけ true
  // 実際は DB の fiscal_year_closed を参照
  return false; 
}
