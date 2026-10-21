// Mock dependency-injected employee search. No real DB or network connection.
export async function searchStaff(db, response, name) {
  response.setHeader("Access-Control-Allow-Origin", "https://staff.example.invalid");
  return db.query("SELECT id, name FROM staff WHERE name = $1", [name]);
}
