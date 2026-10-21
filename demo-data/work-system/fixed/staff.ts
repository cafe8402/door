// 같은 파일 경로로 재검사하는 패턴 예시. 실제 배포 동작은 별도 확인.
db.query("SELECT * FROM staff WHERE name = $1", [request.query.name]);
prisma.$queryRaw`SELECT * FROM staff WHERE id = ${staffId}`;
response.setHeader("Access-Control-Allow-Origin", "https://staff.example.invalid");
