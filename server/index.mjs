import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createApiMiddleware } from './api.mjs';
const root = path.resolve(import.meta.dirname, '../dist');
if (!fs.existsSync(path.join(root, 'index.html'))) throw new Error('먼저 npm run build를 실행해주세요.');
const api = createApiMiddleware();
const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT는 유효한 포트 번호여야 합니다.');
const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json', '.webm': 'video/webm', '.ttf': 'font/ttf', '.woff2': 'font/woff2' };
http.createServer((req, res) => api(req, res, () => {
  let pathname; try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { res.writeHead(400).end(); return; }
  const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404).end(); return; }
  res.setHeader('Content-Type', (mime[path.extname(file)] || 'application/octet-stream') + (['.html', '.js', '.css', '.json'].includes(path.extname(file)) ? '; charset=utf-8' : ''));
  res.setHeader('X-Content-Type-Options', 'nosniff'); fs.createReadStream(file).pipe(res);
})).listen(port, '127.0.0.1', () => console.log(`AI 업무도구 보안점검: http://127.0.0.1:${port}/`));
