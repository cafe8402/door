// 코드 실행 대신 허용한 계산만 수행합니다.
export function calculate(req, res) {
  const left = Number(req.body.left), right = Number(req.body.right);
  if (!Number.isFinite(left) || !Number.isFinite(right)) return res.status(400).json({message:"숫자를 입력하세요"});
  return res.json({result:left + right});
}
