// 값은 SQL 명령과 분리해 전달합니다. 로그인·소유자 권한 검사는 별도로 필요합니다.
export async function searchCustomers(req, res, db) {
  const rows = await db.query("SELECT customer_id, display_name FROM customers WHERE display_name = $1", [req.query.name]);
  return res.json(rows);
}
