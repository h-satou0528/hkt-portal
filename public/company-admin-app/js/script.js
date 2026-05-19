import { loadCompanyName } from "./common.js";

loadCompanyName();

app.use("/company-admin-app", (req, res, next) => {

  if (!req.session?.loggedIn) {
    return res.redirect("/login.html");
  }

  if (req.session.account_type !== "company_admin") {
    return res.status(403).send("Forbidden");
  }

  next();

});