import http from 'node:http';
import { ScanError } from './safe-request.mjs';
import { DEMO_ACTORS, DEMO_DOCUMENTS, DEMO_ADMIN_REPORT } from './api-demo-data.mjs';

export const API_DEMO_CASES = [
  { id: 'own-a', actor: 'a', path: 'documents/doc-a', record: DEMO_DOCUMENTS['doc-a'], control: true, title: 'A가 자기 문서를 읽을 수 있나요?' },
  { id: 'own-b', actor: 'b', path: 'documents/doc-b', record: DEMO_DOCUMENTS['doc-b'], control: true, title: 'B가 자기 문서를 읽을 수 있나요?' },
  { id: 'admin-own', actor: 'admin', path: 'admin/report', record: DEMO_ADMIN_REPORT, control: true, title: '관리자가 전용 자료를 읽을 수 있나요?' },
  { id: 'a-to-b', actor: 'a', path: 'documents/doc-b', record: DEMO_DOCUMENTS['doc-b'], ruleId: '#API-BOLA', depends: ['own-a', 'own-b'], title: 'A에게 B의 비공개 문서가 보이나요?' },
  { id: 'b-to-a', actor: 'b', path: 'documents/doc-a', record: DEMO_DOCUMENTS['doc-a'], ruleId: '#API-BOLA', depends: ['own-a', 'own-b'], title: 'B에게 A의 비공개 문서가 보이나요?' },
  { id: 'user-to-admin', actor: 'a', path: 'admin/report', record: DEMO_ADMIN_REPORT, ruleId: '#API-BFLA', depends: ['own-a', 'admin-own'], title: '일반 사용자가 관리자 자료를 볼 수 있나요?' },
  { id: 'anonymous-to-a', actor: 'anonymous', path: 'documents/doc-a', record: DEMO_DOCUMENTS['doc-a'], ruleId: '#API-AUTH', depends: ['own-a'], title: '로그인 없이 비공개 문서가 보이나요?' },
];

function requesterFor(port) {
  return (version, testCase, signal) => new Promise((resolve, reject) => {
    const actor = DEMO_ACTORS[testCase.actor];
    const req = http.request({ hostname: '127.0.0.1', port, path: `/__fixtures/api/${version}/${testCase.path}`, method: 'GET', agent: false, signal,
      headers: { Accept: 'application/json', ...(actor.token ? { Authorization: `Bearer ${actor.token}` } : {}) },
    }, res => {
      const chunks = []; let size = 0;
      res.on('data', chunk => { size += chunk.length; if (size > 64 * 1024) res.destroy(new Error('RESPONSE_LIMIT')); else chunks.push(chunk); });
      res.on('end', () => {
        if (!/^application\/json\b/i.test(res.headers['content-type'] || '')) { reject(new Error('INVALID_RESPONSE')); return; }
        try { resolve({ status: res.statusCode, body: JSON.parse(Buffer.concat(chunks).toString('utf8')) }); } catch { reject(new Error('INVALID_JSON')); }
      });
      res.on('error', reject);
    });
    const timeout = setTimeout(() => req.destroy(new Error('TIMEOUT')), 3000);
    req.on('close', () => clearTimeout(timeout)); req.on('error', reject); req.end();
  });
}

export function createApiDemoScanner({ port, requester } = {}) {
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new ScanError('예제 서버 주소를 확인하지 못했어요.', 'TARGET');
  const request = requester || requesterFor(port);
  return async function scanApiDemo(version, { signal } = {}) {
    if (!['vulnerable', 'fixed'].includes(version)) throw new ScanError('준비된 취약본 또는 수정본만 검사할 수 있어요.', 'TARGET');
    const apiChecks = [], checks = [], issues = [], warnings = ['준비된 가상 API와 테스트 자료만 검사했어요. 실제 서비스의 보안을 확인한 결과는 아니에요.'];
    let requestsMade = 0;
    for (const scenario of API_DEMO_CASES) {
      signal?.throwIfAborted();
      const actor = DEMO_ACTORS[scenario.actor];
      const resource = `api-case:${scenario.id}`;
      let outcome = 'unverified', status = null, evidence = '응답을 확인하지 못했어요.';
      const ready = (scenario.depends || []).every(id => apiChecks.find(check => check.id === id)?.outcome === 'passed');
      if (!ready) evidence = '먼저 확인해야 할 테스트 계정이나 자료가 정상 동작하지 않아 이 검사를 건너뛰었어요.';
      else {
        try {
          requestsMade++;
          const response = await request(version, scenario, signal);
          status = response.status;
          // Compare the known private record, not just HTTP 200 or a matching response length.
          const record = response.body?.record;
          const containsPrivate = JSON.stringify(response.body).includes(scenario.record.privateMarker);
          const exactRecord = record?.id === scenario.record.id && record?.ownerId === scenario.record.ownerId && record?.privateMarker === scenario.record.privateMarker;
          if (scenario.control) {
            if (status === 200 && exactRecord) { outcome = 'passed'; evidence = '허용된 계정이 자기 테스트 자료를 정상적으로 읽었어요.'; }
            else evidence = '허용된 계정의 정상 접근을 확인하지 못했어요. 이 계정에 의존하는 권한 검사도 확인 못함으로 남겨요.';
          } else if (containsPrivate) {
            outcome = 'failed'; evidence = `HTTP ${status} · 허용되지 않은 계정의 응답에 가상 비공개 자료가 포함됐어요. 본문은 숨겼어요.`;
          } else if ([401, 403, 404].includes(status)) {
            outcome = 'passed'; evidence = `HTTP ${status} · 요청이 거절됐고, 이 테스트의 비공개 자료도 응답에 없었어요.`;
          } else evidence = `HTTP ${status} · 비공개 자료는 찾지 못했지만, 예상한 거절 응답도 아니어서 확인하지 못했어요.`;
        } catch (error) { if (signal?.aborted) throw error; evidence = '연결 실패 또는 올바르지 않은 응답 때문에 이 항목을 확인하지 못했어요.'; }
      }
      const entry = { id: scenario.id, title: scenario.title, actor: actor.name, resource, expected: scenario.control ? '허용' : '거절', actualStatus: status, outcome, evidence };
      apiChecks.push(entry);
      checks.push({ ruleId: scenario.ruleId || '#API-CONTROL', resource, status: outcome === 'unverified' ? 'unverified' : 'completed', detail: evidence });
      if (outcome === 'failed') {
        const advice = scenario.ruleId === '#API-BOLA' ? '서버가 문서를 읽을 때 로그인한 사람의 소유·조직·공유 권한을 확인하세요. 문서 번호를 바꿔도 권한 없는 자료를 읽을 수 없어야 합니다.' : scenario.ruleId === '#API-BFLA' ? '관리자용 API마다 서버에서 관리자 역할과 해당 작업의 권한을 검증하세요. 화면에서 버튼을 숨기는 것만으로 보호할 수 없습니다.' : '비공개 자료를 반환하기 전에 서버에서 로그인과 자료 접근 권한을 검증하세요.';
        const snippet = `요청 계정: ${actor.name}\n대상: ${scenario.record.title}\n예상: 접근 거절\n실제: HTTP ${status}, 가상 비공개 내용 포함\n응답 본문과 테스트 인증값: [숨김]`;
        issues.push({ id: `${scenario.ruleId}:${scenario.id}`, ruleId: scenario.ruleId, filePath: resource, fingerprint: `${scenario.ruleId}:${scenario.id}`, title: scenario.title, shortDescription: '권한이 없는 테스트 계정의 응답에서 미리 지정한 비공개 자료를 확인했어요.', severity: 'high', category: 'detected', cwe: scenario.ruleId === '#API-AUTH' ? 'CWE-306' : 'CWE-862', whatIsIssue: scenario.title, whatIsIssueTip: '가상 API에 실제 GET 요청을 보낸 결과', whatIsIssueMeta: '테스트 계정과 가상 자료의 접근 관계 비교', impactDescription: advice, impactItems: [], impactMeta: '가상 API 실습 결과이며 실제 서비스 결과가 아닙니다.', detectionSignature: '알려진 가상 비공개 자료가 비인가 응답에 포함되는지 확인', location: `${actor.name} → ${scenario.record.title}`, codeSnippet: snippet, detailedAuditLog: snippet, resolutionSteps: [{ step: '01', title: '서버에서 접근 권한 확인', desc: advice, badge: '권한 검사' }, { step: '02', title: '같은 테스트로 재검사', desc: '자기 자료는 읽을 수 있고 타인·관리자 자료는 거절되는지 함께 확인하세요.', badge: '회귀 검사' }], aiPrompt: `가상 API에서 발견한 다음 권한 문제를 참고해 우리 서비스의 같은 유형의 코드를 검토해주세요.\n\n${snippet}\n\n${advice}\n테스트 계정의 허용 접근과 금지 접근을 모두 자동 테스트로 만들고, 잘못된 요청에서 비공개 본문을 반환하지 않도록 수정해주세요. 이 예제 결과만으로 실제 서비스에도 같은 문제가 있다고 단정하지 마세요.`, checklist: [{ title: '허용 접근과 금지 접근 모두 확인', desc: '수정 때문에 정상 사용자의 접근도 막히지 않는지 확인합니다.' }], recheckStatus: 'unverified' });
      }
    }
    if (apiChecks.some(check => check.outcome === 'unverified')) warnings.push('완료하지 못한 검사가 있어요. 해당 항목을 안전하거나 해결된 것으로 판정하지 않았어요.');
    const targetUrl = `http://127.0.0.1:${port}/__fixtures/api/${version}`;
    return { mode: 'api_demo', demoVersion: version, issues, apiChecks, checks, warnings, scope: '준비된 가상 API에서 조회 권한만 비교했어요. 사용자 입력 URL·실제 계정·삭제·결제 요청은 사용하지 않습니다. 이 결과는 실제 서비스의 보안 평가가 아닙니다.', scannedFilesCount: requestsMade, totalLinesScanned: 0, scannedFileNames: checks.filter(check => check.status === 'completed').map(check => check.resource), scannedAt: new Date().toISOString(), ruleCount: 4, cleanCheckCount: apiChecks.filter(check => !check.id.startsWith('own-') && check.id !== 'admin-own' && check.outcome === 'passed').length, targetUrl, finalUrl: targetUrl, requestsMade };
  };
}
