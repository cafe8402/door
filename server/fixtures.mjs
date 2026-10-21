import { apiDemoFixture } from './api-demo-data.mjs';
export function fixtureMiddleware(req, res) {
  if (apiDemoFixture(req, res)) return true;
  const url = new URL(req.url, 'http://localhost');
  const match = url.pathname.match(/^\/__fixtures\/(vulnerable|fixed)(\/app\.js)?\/?$/);
  if (!match) return false;
  const fixed = match[1] === 'fixed';
  res.setHeader('Cache-Control', 'no-store');
  if (fixed) {
    res.setHeader('Content-Security-Policy', "default-src 'self'; frame-ancestors 'none'; object-src 'none'");
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Set-Cookie', 'demo_session=DUMMY; Secure; HttpOnly; SameSite=Strict');
  } else {
    res.setHeader('Server', 'DummyServer/0.1');
    res.setHeader('Set-Cookie', 'demo_session=DUMMY');
  }
  if (match[2]) {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.end(fixed ? 'console.info("Synthetic fixed fixture");' : `const apiKey = "sk-proj-${'DUMMY'.repeat(7)}";\nconsole.info("Synthetic test fixture; no external requests");`);
  } else {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(`<!doctype html><html lang="ko"><meta charset="utf-8"><title>AI 업무도구 보안점검 ${fixed ? '수정' : '취약'} 테스트</title><h1>가상 웹 검사 대상</h1><p>실제 계정·개인정보가 없는 테스트 페이지입니다.</p><script src="${url.pathname.replace(/\/$/, '')}/app.js"></script></html>`);
  }
  return true;
}
