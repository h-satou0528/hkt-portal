router.get("/", async (req, res) => {

  const { rows } = await req.db.query(`
    SELECT
      u.id,
      u.username AS name,
      u.email,
      u.role,
      u.company_id,
      c.name AS company_name
    FROM users u
    JOIN companies c ON u.company_id = c.id
    ORDER BY u.id
  `);

  res.json(rows);
});