// middlewares/companyFilter.js

export function companyFilter(req, res, next) {

  // 未ログイン防止
  if (!req.session || !req.session.loggedIn) {
    return res.status(401).json({ error: "not logged in" });
  }

  // super_admin は全データ
  if (req.session.role === "super_admin") {
    req.companyFilter = "";
    req.companyParams = [];
    return next();
  }

  // admin も全データ
  if (req.session.role === "admin") {
    req.companyFilter = "";
    req.companyParams = [];
    return next();
  }

  // company_id 必須チェック
  if (!req.session.company_id) {
    console.error("🚨 company_id missing in session");
    return res.status(500).json({ error: "company context error" });
  }

  // 通常ユーザー
  req.companyFilter = "WHERE company_id = $1";
  req.companyParams = [req.session.company_id];

  next();
}