// 고객 검색 API의 처리 함수. 실행하려면 별도 앱과 DB가 필요합니다.
export async function searchCustomers(req, res, db) {
  const rows = await db.query("SELECT customer_id, display_name FROM customers WHERE display_name = " + req.query.name);
  return res.json(rows);
}
