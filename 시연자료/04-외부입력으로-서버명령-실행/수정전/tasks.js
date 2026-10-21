// 업무 자동화 요청 처리 함수. 이 코드는 배포하거나 실행하지 않습니다.
import { exec } from "node:child_process";
export function runTask(req, res) {
  exec(req.body.command, (error) => res.json({ok: !error}));
}
