// Synthetic identities and records, exclusively for the built-in demo server.
export const DEMO_ACTORS = {
  a: { name: '사용자 A', id: 'user-a', role: 'user', token: 'DEMO_ONLY_USER_A' },
  b: { name: '사용자 B', id: 'user-b', role: 'user', token: 'DEMO_ONLY_USER_B' },
  admin: { name: '관리자', id: 'admin', role: 'admin', token: 'DEMO_ONLY_ADMIN' },
  anonymous: { name: '로그인 안 함' },
};
export const DEMO_DOCUMENTS = {
  'doc-a': { id: 'doc-a', ownerId: 'user-a', title: 'A의 가상 비공개 문서', privateMarker: 'SYNTHETIC_PRIVATE_DOCUMENT_A_2026' },
  'doc-b': { id: 'doc-b', ownerId: 'user-b', title: 'B의 가상 비공개 문서', privateMarker: 'SYNTHETIC_PRIVATE_DOCUMENT_B_2026' },
};
export const DEMO_ADMIN_REPORT = { id: 'admin-report', ownerId: 'admin', title: '가상 관리자 전용 자료', privateMarker: 'SYNTHETIC_ADMIN_REPORT_2026' };

export function apiDemoFixture(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const match = url.pathname.match(/^\/__fixtures\/api\/(vulnerable|fixed)\/(documents\/(doc-a|doc-b)|admin\/report)$/);
  if (!match) return false;
  const send = (status, value) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff'); res.end(JSON.stringify(value)); return true; };
  if (req.method !== 'GET') return send(405, { error: 'READ_ONLY_DEMO' });
  const actor = Object.values(DEMO_ACTORS).find(item => item.token && req.headers.authorization === `Bearer ${item.token}`);
  const fixed = match[1] === 'fixed';
  if (fixed && !actor) return send(401, { error: 'LOGIN_REQUIRED' });
  const record = match[2] === 'admin/report' ? DEMO_ADMIN_REPORT : DEMO_DOCUMENTS[match[3]];
  if (fixed && (record.id === 'admin-report' ? actor.role !== 'admin' : actor.id !== record.ownerId && actor.role !== 'admin')) return send(403, { error: 'ACCESS_DENIED' });
  return send(200, { record, synthetic: true });
}
