// 셸 명령 대신 미리 정한 작업 함수만 선택합니다.
export async function runTask(req, res, jobs) {
  if (req.body.action !== "refresh-summary") return res.status(400).json({message:"허용하지 않은 작업"});
  await jobs.refreshSummary();
  return res.json({ok:true});
}
