import { createUrlScanner } from './url-scanner.mjs';
import { fixtureMiddleware } from './fixtures.mjs';
import { ScanError } from './safe-request.mjs';
import { createApiDemoScanner } from './api-demo-scanner.mjs';

export function createApiMiddleware() {
  let active = 0;
  const recent = [];
  return async function middleware(req, res, next = () => { res.statusCode = 404; res.end('Not found'); }) {
    const pathname = new URL(req.url || '/', 'http://localhost').pathname;
    if (pathname.startsWith('/__fixtures/')) { if (fixtureMiddleware(req, res)) return; return next(); }
    if (!['/api/scan-url', '/api/scan-api-demo'].includes(pathname)) return next();
    const reply = (status, value) => {
      if (res.destroyed || res.writableEnded) return;
      res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Content-Type-Options', 'nosniff'); res.end(JSON.stringify(value));
    };
    const port = req.socket.localPort;
    const allowedHosts = [`127.0.0.1:${port}`, `localhost:${port}`];
    if (!allowedHosts.includes(req.headers.host) || (req.headers.origin && !allowedHosts.map(host => 'http://' + host).includes(req.headers.origin))) return reply(403, { error: '이 컴퓨터의 AI 업무도구 보안점검 화면에서만 검사할 수 있습니다.' });
    if (req.method !== 'POST') return reply(405, { error: 'POST 요청만 지원합니다.' });
    if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) return reply(415, { error: 'JSON 요청만 지원합니다.' });
    const now = Date.now(); while (recent.length && recent[0] < now - 60000) recent.shift();
    if (active >= 2 || recent.length >= 12) return reply(429, { error: '검사가 많습니다. 잠시 후 다시 시도해주세요.' });
    recent.push(now); active++;
    const controller = new AbortController();
    const timeout = setTimeout(() => { controller.abort(new Error('전체 검사 제한 시간(25초)을 초과했습니다.')); if (!req.complete) req.destroy(); }, 25000);
    const closed = () => { if (!res.writableEnded) controller.abort(); };
    res.on('close', closed);
    try {
      let body = '';
      for await (const chunk of req) {
        body += chunk.toString('utf8');
        if (Buffer.byteLength(body) > 4096) { reply(413, { error: '요청 크기는 최대 4KB입니다.' }); return; }
        controller.signal.throwIfAborted();
      }
      let input; try { input = JSON.parse(body); } catch { return reply(400, { error: 'JSON 형식이 올바르지 않습니다.' }); }
      if (!input || input.authConfirmed !== true) return reply(400, { error: '검사 권한 확인이 필요합니다.' });
      if (pathname === '/api/scan-api-demo') {
        if ('url' in input || !['vulnerable', 'fixed'].includes(input.version)) return reply(400, { error: '준비된 가상 API만 검사할 수 있어요.' });
        const result = await createApiDemoScanner({ port })(input.version, { signal: controller.signal });
        reply(200, result); return;
      }
      if (typeof input.url !== 'string') return reply(400, { error: '검사할 URL이 필요합니다.' });
      const fixtureOrigin = `http://${req.headers.host}`;
      const result = await createUrlScanner({ fixtureOrigin })(input.url, { signal: controller.signal });
      reply(200, result);
    } catch (error) {
      if (controller.signal.aborted) reply(408, { error: '검사가 중지되었거나 제한 시간(25초)을 초과했습니다.' });
      else reply(error instanceof ScanError && error.code === 'TARGET' ? 400 : 502, { error: error instanceof ScanError ? error.message : '검사 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' });
    } finally { clearTimeout(timeout); res.off('close', closed); active--; }
  };
}
