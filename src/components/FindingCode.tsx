import React from 'react';
import type { SecurityIssue } from '../types/security';
import { maskSecret } from '../services/localSecurityScanner';

/** Render only the scanner's redacted excerpt; never retrieve the original file. */
export function FindingCode({ issue }: { issue: SecurityIssue }) {
  const snippet = maskSecret(issue.codeSnippet || '');
  if (!snippet.trim()) return <p className="wizard-scope">이 결과에는 코드 내용이 남아 있지 않아요. 파일을 다시 검사하면 해당 줄을 보여드려요.</p>;
  const rows = snippet.replace(/\r\n?/g, '\n').trimEnd().split('\n').map(text => {
    const match = text.match(/^(>>\s*|\s*)(\d+):\s?(.*)$/);
    return match ? { number: Number(match[2]), code: match[3], marked: match[1].startsWith('>>') } : { number: null, code: text, marked: false };
  });
  const target = rows.find(row => row.number === issue.line || (issue.line == null && row.marked));
  const openRule = target && /\ballow\s+[^;]*\bwrite\b[^;]*:\s*if\s+true\s*;/.test(target.code);
  return <div className="finding-code">
    <p className="finding-code-label">파일 안의 실제 내용 · 강조된 줄을 확인하세요</p>
    <pre aria-label="발견한 코드와 줄 번호"><code>{rows.map((row, index) => {
      const active = row.number === issue.line || (issue.line == null && row.marked);
      return <span key={index} className={active ? 'finding-code-row is-target' : 'finding-code-row'}>
        <span className="finding-line-number">{row.number ?? '·'}</span><span>{row.code || ' '}</span>{active && <span className="finding-line-tag">← 확인할 줄</span>}
      </span>;
    })}</code></pre>
    {openRule && <p className="finding-code-meaning"><b>이 줄의 뜻:</b> 자료를 바꿀 때 확인할 조건이 항상 참(true)이라서, 이 규칙이 적용되는 자료의 변경을 누구에게나 허용해요.</p>}
    <p className="finding-code-note">알려진 비밀값·개인정보 패턴은 가려서 표시해요.</p>
  </div>;
}
