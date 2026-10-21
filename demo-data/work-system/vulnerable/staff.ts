// 실행하지 않는 합성 테스트 자료입니다.
db.query("SELECT * FROM staff WHERE name = " + request.query.name);
prisma.$queryRawUnsafe(queryText);
response.setHeader("Access-Control-Allow-Origin", "*");
