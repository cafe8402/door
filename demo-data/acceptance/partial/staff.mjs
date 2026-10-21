// Mock employee search. Never deploy this version.
export async function searchStaff(db, response, name) {
  response.setHeader("Access-Control-Allow-Origin", "https://staff.example.invalid");
  return db.query("SELECT id, name FROM staff WHERE name = '" + name + "'");
}
export function runFormula(value) { return eval(value); }

