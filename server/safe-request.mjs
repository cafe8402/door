import http from 'node:http';
import https from 'node:https';
import dns from 'node:dns/promises';
import { isIP } from 'node:net';

export class ScanError extends Error {
  constructor(message, code = 'NETWORK') { super(message); this.code = code; }
}
const blockedV4 = [[0, 8], [0x0a000000, 8], [0x64400000, 10], [0x7f000000, 8], [0xa9fe0000, 16], [0xac100000, 12], [0xc0000000, 24], [0xc0000200, 24], [0xc0586300, 24], [0xc0a80000, 16], [0xc6120000, 15], [0xc6336400, 24], [0xcb007100, 24], [0xe0000000, 4], [0xf0000000, 4]];
export function isPublicIP(address) {
  const family = isIP(address);
  if (family === 4) {
    const value = address.split('.').reduce((sum, part) => (sum * 256 + Number(part)) >>> 0, 0);
    return !blockedV4.some(([base, bits]) => (value >>> (32 - bits)) === (base >>> (32 - bits)));
  }
  if (family === 6) {
    // Permit native global unicast only; reject mapped IPv4, transition, documentation and special-use space.
    if (!/^[23][0-9a-f]{3}:/i.test(address)) return false;
    const [head, tail = ''] = address.toLowerCase().split('::');
    const left = head.split(':').filter(Boolean), right = tail.split(':').filter(Boolean);
    const groups = address.includes('::') ? [...left, ...Array(8 - left.length - right.length).fill('0'), ...right] : left;
    const value = groups.reduce((sum, group) => (sum << 16n) + BigInt('0x' + group), 0n);
    const inRange = (base, bits) => (value >> BigInt(128 - bits)) === (base >> BigInt(128 - bits));
    return !inRange(0x20010000000000000000000000000000n, 23) && !inRange(0x20010db8000000000000000000000000n, 32) && !inRange(0x20020000000000000000000000000000n, 16) && !inRange(0x3fff0000000000000000000000000000n, 20);
  }
  return false;
}
export function displayUrl(value) {
  const url = new URL(value); url.search = ''; url.hash = ''; url.username = ''; url.password = '';
  return url.href;
}
export function parseTarget(value) {
  if (typeof value !== 'string' || value.length > 2048) throw new ScanError('URL은 2,048자 이하로 입력해주세요.', 'TARGET');
  let url; try { url = new URL(value); } catch { throw new ScanError('올바른 http:// 또는 https:// 주소를 입력해주세요.', 'TARGET'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new ScanError('인증정보 없는 HTTP·HTTPS 주소만 지원합니다.', 'TARGET');
  url.hash = ''; return url;
}
export function isFixtureTarget(url, fixtureOrigin) {
  return Boolean(fixtureOrigin && url.origin === fixtureOrigin && /^\/__fixtures\/(?:vulnerable|fixed)(?:\/app\.js)?\/?$/.test(url.pathname) && !url.search);
}
export async function resolveTarget(url, { fixtureOrigin, lookup = dns.lookup, signal } = {}) {
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (isFixtureTarget(url, fixtureOrigin)) return [{ address: '127.0.0.1', family: 4 }];
  if (url.port && !['80', '443'].includes(url.port)) throw new ScanError('공개 사이트의 80·443 포트만 지원합니다.', 'TARGET');
  const records = isIP(host) ? [{ address: host, family: isIP(host) }] : await Promise.race([
    lookup(host, { all: true, verbatim: true }),
    new Promise((_, reject) => {
      const timer = setTimeout(() => reject(new ScanError('DNS 조회 시간이 초과되었습니다.', 'DNS')), 3000);
      timer.unref();
    }),
  ]);
  signal?.throwIfAborted();
  if (!records.length || records.some(item => !isPublicIP(item.address))) throw new ScanError('로컬·내부망·예약 주소는 검사할 수 없습니다.', 'TARGET');
  return records;
}
export function createRequester({ fixtureOrigin, lookup } = {}) {
  return async function request(input, { signal, budget, allowedOrigin } = {}) {
    let url = parseTarget(input);
    const redirects = [];
    for (let hop = 0; hop <= 3; hop++) {
      signal?.throwIfAborted();
      if (allowedOrigin && url.origin !== allowedOrigin) throw new ScanError('같은 출처의 리소스만 수집합니다.', 'TARGET');
      if (++budget.requests > 8) throw new ScanError('요청 개수 제한을 초과했습니다.', 'LIMIT');
      const records = await resolveTarget(url, { fixtureOrigin, lookup, signal });
      const response = await new Promise((resolve, reject) => {
        const transport = url.protocol === 'https:' ? https : http;
        const req = transport.request(url, {
          method: 'GET', agent: false, signal, rejectUnauthorized: true,
          headers: { 'User-Agent': 'Mundansok-Security-Check/1.0', Accept: 'text/html,application/javascript,text/javascript,text/plain,*/*;q=0.1', 'Accept-Encoding': 'identity' },
          lookup: (_host, options, callback) => options.all ? callback(null, records) : callback(null, records[0].address, records[0].family),
        }, res => {
          const chunks = []; let size = 0;
          const certificate = url.protocol === 'https:' ? res.socket.getPeerCertificate() : undefined;
          if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
            res.destroy(); resolve({ status: res.statusCode, headers: res.headers, body: '', certificate }); return;
          }
          if (res.headers['content-encoding'] && res.headers['content-encoding'] !== 'identity') { res.destroy(new ScanError('압축 응답은 지원하지 않아 내용을 확인하지 못했습니다.', 'ENCODING')); return; }
          res.on('data', chunk => {
            size += chunk.length; budget.bytes += chunk.length;
            if (size > 1024 * 1024 || budget.bytes > 3 * 1024 * 1024) { res.destroy(new ScanError('응답 크기 제한(각 1MB·전체 3MB)을 초과했습니다.', 'LIMIT')); return; }
            chunks.push(chunk);
          });
          res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString('utf8'), certificate }));
          res.on('error', reject);
        });
        const timer = setTimeout(() => req.destroy(new ScanError('응답 제한 시간(6초)을 초과했습니다.', 'TIMEOUT')), 6000);
        req.on('close', () => clearTimeout(timer));
        req.on('error', reject); req.end();
      });
      if ([301, 302, 303, 307, 308].includes(response.status) && response.headers.location) {
        if (hop === 3) throw new ScanError('리다이렉트는 최대 3회까지 확인합니다.', 'LIMIT');
        const next = parseTarget(new URL(response.headers.location, url).href);
        if (url.protocol === 'https:' && next.protocol !== 'https:') throw new ScanError('HTTPS에서 HTTP로 이동하는 리다이렉트를 차단했습니다.', 'DOWNGRADE');
        // Every destination is revalidated and pinned by the next iteration, including fixtures.
        redirects.push({ from: displayUrl(url), to: displayUrl(next), status: response.status });
        url = next; continue;
      }
      const cert = response.certificate;
      return { ...response, url: url.href, redirects, tls: cert ? { validTo: cert.valid_to, protocol: response.certificate ? 'verified HTTPS' : undefined } : undefined };
    }
  };
}
