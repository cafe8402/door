import { scanFileContent, maskSecret, RULE_COUNT } from '../src/services/localSecurityScanner.ts';
import { createRequester, parseTarget, displayUrl, isFixtureTarget, ScanError } from './safe-request.mjs';

export const WEB_RULES = ['#WEB-HTTP', '#WEB-TLS', '#WEB-CSP', '#WEB-HSTS', '#WEB-FRAME', '#WEB-NOSNIFF', '#WEB-REFERRER', '#WEB-COOKIE', '#WEB-MIXED', '#WEB-SERVER'];
const tlsErrors = new Set(['CERT_HAS_EXPIRED', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'SELF_SIGNED_CERT_IN_CHAIN', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'ERR_TLS_CERT_ALTNAME_INVALID', 'CERT_NOT_YET_VALID', 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY']);
const notes = '최종 페이지의 공개 응답과 제한된 같은 출처 JavaScript만 확인했습니다. 로그인·인가 우회, 에이전트 실행 권한, CVE, 리다이렉트 중간 응답의 쿠키, 전체 페이지 크롤링은 포함하지 않습니다.';
const resourceKey = url => 'script:' + new URL(url).pathname.replace(/^\/__fixtures\/(vulnerable|fixed)/, '/__fixtures/site');
export function createUrlScanner({ fixtureOrigin, requester = createRequester({ fixtureOrigin }) } = {}) {
  return async function scanUrl(value, { signal } = {}) {
    const target = parseTarget(value);
    const issues = [], checks = [], warnings = [], resources = [];
    const budget = { requests: 0, bytes: 0 };
    let finalUrl = displayUrl(target), redirects = [], tls = null, totalLines = 0;
    const check = (ruleId, resource, status = 'completed', detail = '') => checks.push({ ruleId, resource, status, detail: maskSecret(detail) });
    const issue = (ruleId, title, evidence, advice, severity = 'medium', category = 'suspected', resource = 'document') => {
      const safeEvidence = maskSecret(evidence).slice(0, 3000);
      issues.push({
        id: `${ruleId}:${resource}`, ruleId, filePath: resource, fingerprint: `${ruleId}:${resource}`,
        verifiedControl: resource === 'transport' && category === 'detected' ? (ruleId === '#WEB-HTTP' ? 'unencrypted-http' : ruleId === '#WEB-TLS' ? 'invalid-tls' : undefined) : undefined,
        title, shortDescription: title + ' — 사용 목적과 응답 문맥을 함께 검토하세요.', severity, category,
        whatIsIssue: title, whatIsIssueTip: '공개 HTTP 응답 기준', whatIsIssueMeta: '실제 URL 응답 분석',
        impactDescription: advice, impactItems: [], impactMeta: notes, detectionSignature: ruleId,
        location: `${finalUrl} (${resource})`, codeSnippet: safeEvidence,
        detailedAuditLog: `Rule: ${ruleId}\nResource: ${resource}\nEvidence: ${safeEvidence}`,
        resolutionSteps: [{ step: '01', title: '설정과 데이터 흐름 검토', desc: advice, badge: '확인 필요' }],
        aiPrompt: `${finalUrl}의 ${title} 항목을 검토해주세요.\n\n[마스킹된 응답 증거]\n${safeEvidence}\n\n${advice}\n실제 배포 설정과 서비스 동작을 확인한 뒤 최소 범위로 수정하고 검증 방법을 제시해주세요.`,
        checklist: [{ title: '수정 후 동일 URL 재검사', desc: '배포 설정과 실제 응답에 조치가 반영됐는지 확인합니다.' }], recheckStatus: 'unverified',
      });
    };
    const result = () => ({
      mode: 'url', issues, scannedFilesCount: resources.length, totalLinesScanned: totalLines,
      scannedFileNames: resources, scannedAt: new Date().toISOString(), ruleCount: RULE_COUNT + WEB_RULES.length,
      cleanCheckCount: 0, checks, warnings, targetUrl: displayUrl(target), finalUrl, redirects, tls,
      scope: notes, requestsMade: budget.requests, bytesRead: budget.bytes,
    });
    let page;
    try { page = await requester(target.href, { signal, budget }); }
    catch (error) {
      if (signal?.aborted) throw error;
      if (tlsErrors.has(error.code) || error.code === 'DOWNGRADE') {
        check('#WEB-TLS', 'transport');
        issue('#WEB-TLS', 'HTTPS 인증서 검증 실패 또는 보안 연결 해제', error.code, '신뢰할 수 있는 인증서·호스트명·유효기간을 확인하고 HTTPS 연결을 유지하세요. 검증을 우회하지 않았으므로 페이지 내용은 읽지 못했습니다.', 'high', 'detected', 'transport');
        warnings.push('페이지를 읽지 못해 나머지 항목은 확인하지 못했습니다.');
        return result();
      }
      if (error instanceof ScanError) throw error;
      throw new ScanError('대상에 연결하지 못했습니다. URL·네트워크·DNS 상태를 확인해주세요.');
    }
    finalUrl = displayUrl(page.url); redirects = page.redirects; tls = page.tls || null;
    check('#WEB-TLS', 'transport', new URL(page.url).protocol === 'https:' ? 'completed' : 'unverified', new URL(page.url).protocol === 'https:' ? '인증서 검증을 통과한 HTTPS 연결' : 'HTTP 대상이어서 TLS 인증서는 확인하지 못했습니다.');
    const fixture = isFixtureTarget(new URL(page.url), fixtureOrigin);
    if (!fixture && target.protocol === 'https:') {
      const httpUrl = new URL(target); httpUrl.protocol = 'http:'; httpUrl.port = '';
      try {
        const probe = await requester(httpUrl.href, { signal, budget });
        check('#WEB-HTTP', 'transport', 'completed', '동일 주소의 HTTP 응답에서 HTTPS 이동 여부 확인');
        if (new URL(probe.url).protocol !== 'https:') issue('#WEB-HTTP', 'HTTP 주소가 HTTPS로 이동하지 않습니다', displayUrl(httpUrl), 'HTTP 주소도 HTTPS로 리다이렉트하도록 웹 서버 또는 프록시를 설정하세요.', 'medium', 'detected', 'transport');
      } catch (error) {
        if (signal?.aborted) throw error;
        check('#WEB-HTTP', 'transport', 'unverified', 'HTTP 접속 또는 리다이렉트를 확인하지 못했습니다.');
        warnings.push('HTTP→HTTPS 이동 여부를 확인하지 못했습니다. 연결 거부 자체를 취약점으로 판정하지 않았습니다.');
      }
    } else check('#WEB-HTTP', 'transport', fixture ? 'unverified' : 'completed', fixture ? '로컬 더미 서버는 HTTP 전용이므로 전송 보안 평가에서 제외합니다.' : '입력 주소의 최종 연결 방식');
    if (!fixture && new URL(page.url).protocol !== 'https:') issue('#WEB-HTTP', '최종 응답이 암호화되지 않은 HTTP입니다', finalUrl, '유효한 인증서로 HTTPS를 제공하고 HTTP 요청을 HTTPS로 리다이렉트하세요.', 'medium', 'detected', 'transport');
    if (fixture) warnings.push('로컬 더미 서버의 HTTP·HSTS·인증서 평가는 제외합니다. 운영 사이트의 HTTPS 검증과 구분하세요.');
    if (page.status < 200 || page.status >= 300) {
      warnings.push(`HTTP ${page.status}: 정상 페이지가 아니므로 헤더·본문의 개선 여부는 판정하지 않았습니다.`);
      return result();
    }
    const type = String(page.headers['content-type'] || '').toLowerCase();
    if (!/(?:text\/|javascript|json|xml)/.test(type) || page.body.includes('\uFFFD')) {
      warnings.push('지원하는 UTF-8 텍스트 응답이 아니어서 본문과 헤더의 문맥을 확인하지 못했습니다.'); return result();
    }
    resources.push('document');
    const html = type.includes('text/html');
    const header = name => String(page.headers[name] || '');
    const evaluate = (rule, applicable, missing, title, evidence, advice, severity = 'medium') => {
      check(rule, 'document', applicable ? 'completed' : 'unverified', applicable ? '응답 확인' : '이 응답에는 적용하지 않음');
      if (applicable && missing) issue(rule, title, evidence, advice, severity);
    };
    const csp = header('content-security-policy');
    evaluate('#WEB-CSP', html, !csp || /(?:script-src|default-src)[^;]*'unsafe-eval'/.test(csp), 'CSP가 없거나 동적 실행을 허용합니다', `Content-Security-Policy: ${csp || '(없음)'}`, '리소스 출처를 제한하는 CSP를 검토하고 스크립트의 동적 실행 허용을 최소화하세요.');
    evaluate('#WEB-HSTS', !fixture && new URL(page.url).protocol === 'https:', !/max-age\s*=\s*[1-9]\d*/i.test(header('strict-transport-security')), '유효한 HSTS 정책이 없습니다', `Strict-Transport-Security: ${header('strict-transport-security') || '(없음)'}`, 'HTTPS가 정상 동작하는지 확인한 뒤 서비스 범위에 맞는 HSTS max-age를 설정하세요.');
    const ancestors = csp.match(/(?:^|;)\s*frame-ancestors\s+([^;]+)/i)?.[1].trim();
    const frameRestricted = ancestors && !ancestors.split(/\s+/).includes('*');
    evaluate('#WEB-FRAME', html, !/^(?:DENY|SAMEORIGIN)$/i.test(header('x-frame-options').trim()) && !frameRestricted, '프레임 삽입 제한을 확인할 수 없습니다', `X-Frame-Options: ${header('x-frame-options') || '(없음)'}\nCSP: ${csp || '(없음)'}`, '의도한 임베딩 정책에 따라 CSP frame-ancestors 또는 X-Frame-Options를 설정하세요.');
    evaluate('#WEB-NOSNIFF', true, header('x-content-type-options').toLowerCase() !== 'nosniff', 'MIME 스니핑 방지 헤더가 없습니다', `X-Content-Type-Options: ${header('x-content-type-options') || '(없음)'}`, '올바른 Content-Type과 X-Content-Type-Options: nosniff를 설정하세요.', 'info');
    evaluate('#WEB-REFERRER', html, !header('referrer-policy') || /^(?:unsafe-url|no-referrer-when-downgrade)$/i.test(header('referrer-policy').trim()), 'Referrer-Policy 명시 또는 제한 강화가 필요합니다', `Referrer-Policy: ${header('referrer-policy') || '(없음; 브라우저 기본값 적용)'}`, '주소에 민감값이 포함되지 않도록 하고 서비스에 맞는 Referrer-Policy를 명시하세요.', 'info');
    const cookies = page.headers['set-cookie'] || [];
    check('#WEB-COOKIE', 'document', cookies.length ? 'completed' : 'unverified', cookies.length ? `${cookies.length}개 응답 쿠키 속성 확인` : '이 응답에서 설정된 쿠키가 없습니다. 기존·로그인 쿠키는 미검사입니다.');
    const cookieProblems = cookies.flatMap((cookie, index) => {
      const attributes = cookie.split(';').slice(1).map(item => item.trim().toLowerCase());
      const missing = ['secure', 'httponly'].filter(name => !attributes.includes(name));
      if (!attributes.some(item => /^samesite=(strict|lax|none)$/.test(item))) missing.push('SameSite');
      if (attributes.includes('samesite=none') && !attributes.includes('secure')) missing.push('SameSite=None에는 Secure 필요');
      return missing.length ? [`쿠키 ${index + 1}: 검토할 속성 ${missing.join(', ')} (이름·값 숨김)`] : [];
    });
    if (cookieProblems.length) issue('#WEB-COOKIE', '응답 쿠키의 보호 속성을 검토하세요', cookieProblems.join('\n'), '세션 등 민감 쿠키에는 Secure·HttpOnly와 적절한 SameSite 정책을 적용하세요. JavaScript 접근이 필요한 비민감 쿠키는 용도에 따라 판단하세요.');
    evaluate('#WEB-MIXED', html && new URL(page.url).protocol === 'https:', /<(?:script|img|iframe|link|audio|video|source)\b[^>]*\b(?:src|href)\s*=\s*["']http:\/\//i.test(page.body), 'HTTPS 페이지에 HTTP 리소스 참조가 있습니다', 'HTML의 리소스 주소에 http:// 참조 발견 (원문 주소 숨김)', '리소스를 HTTPS로 제공하고 브라우저에서 차단·자동 업그레이드되는지 확인하세요.');
    evaluate('#WEB-SERVER', true, /\d+\.\d+/.test(header('server') + header('x-powered-by')), '서버 제품 버전 정보가 응답에 노출됩니다', `Server: ${header('server')}\nX-Powered-By: ${header('x-powered-by')}`, '불필요한 버전 정보를 줄이세요. 버전 문자열만으로 실제 취약 여부를 확정할 수 없습니다.', 'info');
    const analyze = (resource, body, sourceUrl = finalUrl) => {
      const found = scanFileContent(resource, body);
      issues.push(...found.map(item => ({ ...item, location: `${displayUrl(sourceUrl)} (${item.location})`, aiPrompt: `${displayUrl(sourceUrl)}에서 수집한 공개 코드입니다.\n\n${item.aiPrompt}`, whatIsIssueMeta: '공개 URL에서 수집한 UTF-8 텍스트의 정적 패턴 분석' })));
      totalLines += body.split('\n').length;
      // All source rules were evaluated on this complete resource.
      checks.push({ ruleId: '*source', resource, status: 'completed', detail: `${RULE_COUNT}개 정적 규칙 확인` });
    };
    analyze('document', page.body);
    if (html) {
      const scripts = [...page.body.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)];
      const urls = new Set();
      for (const match of scripts) {
        let url; try { url = new URL(match[1].replaceAll('&amp;', '&'), page.url); } catch { warnings.push('해석할 수 없는 스크립트 주소가 있어 제외했습니다.'); continue; }
        if (url.origin !== new URL(page.url).origin) { warnings.push('외부 출처의 JavaScript는 수집하지 않았습니다.'); continue; }
        urls.add(url.href);
      }
      if (urls.size > 3) warnings.push('같은 출처의 JavaScript는 최대 3개까지 확인합니다.');
      for (const url of [...urls].slice(0, 3)) {
        signal?.throwIfAborted();
        try {
          const script = await requester(url, { signal, budget, allowedOrigin: new URL(page.url).origin });
          if (new URL(script.url).origin !== new URL(page.url).origin) throw new ScanError('다른 출처로 이동한 스크립트는 분석하지 않았습니다.');
          if (script.status !== 200 || !/(?:javascript|text\/plain)/i.test(String(script.headers['content-type'])) || script.body.includes('\uFFFD')) throw new ScanError('완전한 UTF-8 JavaScript 응답을 읽지 못했습니다.');
          const key = resourceKey(url); resources.push(key); analyze(key, script.body, script.url);
        } catch (error) {
          if (signal?.aborted) throw error;
          warnings.push('일부 JavaScript를 확인하지 못했습니다. 해당 리소스의 이전 문제는 해결로 판정하지 않습니다.');
        }
      }
    }
    if (issues.length > 5000) throw new ScanError('탐지 항목이 너무 많아 결과를 반환하지 못했습니다.', 'LIMIT');
    return result();
  };
}
