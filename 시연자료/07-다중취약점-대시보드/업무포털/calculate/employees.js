// 계산식 처리 API 예시. 이 코드는 실행하지 않습니다.
export function calculate(req, res) {
  const result = eval(req.body.formula);
  return res.json({result});
}
