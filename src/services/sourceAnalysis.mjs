import { parse } from '@babel/parser';

const normalize = name => { const out=[]; for(const part of name.replaceAll('\\','/').split('/')) { if(part==='..') out.pop(); else if(part&&part!=='.') out.push(part); } return out.join('/'); };
const examplePath = name => /(?:^|\/)(?:tests?|__tests__|fixtures?|demo-data|examples?|samples?)(?:\/|$)|\.(?:test|spec)\.|(?:^|\/)\.env\.(?:example|sample|template)$/i.test(name);
const sensitiveName = name => /(?:secret|password|passwd|api.?key|access.?key|auth.?token|private.?key|credential)/i.test(name) && !/(?:public.?key|publishable|anon.?key)/i.test(name);
const placeholder = value => /(?:DUMMY|EXAMPLE|SYNTHETIC|NOT_REAL|YOUR[_ -]|REPLACE[_ -]|CHANGEME|FAKE[_ -]|\$\{|\{\{)/i.test(value) || new Set(value.replace(/^(?:sk-proj-|sk-|hf_|AKIA|ASIA)/,'')).size < 5;
const token = value => /^(?:sk-[\w-]{16,}|hf_[\w]{20,}|(?:AKIA|ASIA)[A-Z0-9]{16}|gh[pousr]_[\w]{20,}|github_pat_[\w]{20,}|sb_secret_[\w-]{16,}|xox[baprs]-[\w-]{20,})$/.test(value);
function walk(node, parent, visit) { if(!node||typeof node!=='object') return; if(node.type) visit(node,parent); for(const [key,value] of Object.entries(node)) { if(['loc','extra','comments','leadingComments','trailingComments','innerComments','tokens'].includes(key)) continue; if(Array.isArray(value))value.forEach(child=>walk(child,node,visit));else if(value&&typeof value==='object')walk(value,node,visit); } }
const keyName = node => node?.name || node?.value || node?.property?.name || node?.property?.value || '';
const lineInside = (node,line) => node.loc?.start.line <= line && node.loc?.end.line >= line;

/** Inspect supplied source only. Never executes code, validates live credentials or makes network requests. */
export function analyzeSourceContext(files, issues) {
  const byName = new Map(files.map(file=>[normalize(file.name),file]));
  const parsed = new Map(), browser = new Set(), edges = new Map(), routes=[];
  let parsedFiles=0, parseFailures=0, unsupportedFiles=0;
  const resolve = (from,spec) => { if(!spec.startsWith('.')&&!spec.startsWith('/'))return; const base=normalize(spec.startsWith('/')?spec:from.slice(0,from.lastIndexOf('/')+1)+spec);return [base,...['.ts','.tsx','.js','.jsx','.mjs','/index.ts','/index.tsx','/index.js'].map(ext=>base+ext)].find(name=>byName.has(name)); };
  for(const [name,file] of byName) {
    if(/\.html?$/i.test(name)) { for(const match of file.content.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)) {const target=resolve(name, match[1].startsWith('.')||match[1].startsWith('/')?match[1]:'./'+match[1]);if(target)browser.add(target);} }
    if(!/\.[cm]?[jt]sx?$/i.test(name)) {unsupportedFiles++;continue;}
    try {
      const ast=parse(file.content,{sourceType:'unambiguous',plugins:[...(/\.[cm]?tsx?$/i.test(name)?['typescript']:[]),'jsx'],errorRecovery:false});
      const data={ast, literals:[], code:[], imports:[]};
      if(ast.program.directives?.some(d=>d.value.value==='use client'))browser.add(name);
      walk(ast,null,(node,parent)=>{
        if(node.type==='ImportDeclaration' || node.type==='ExportNamedDeclaration' || node.type==='ExportAllDeclaration') {if(node.source&&node.importKind!=='type')data.imports.push(node.source.value);}
        if(node.type==='ImportExpression' && node.source?.type==='StringLiteral')data.imports.push(node.source.value);
        if(node.type==='CallExpression'&&node.callee?.name==='require'&&node.arguments[0]?.type==='StringLiteral')data.imports.push(node.arguments[0].value);
        if(node.type==='StringLiteral' || node.type==='TemplateLiteral' && node.expressions.length===0) {
          const value=node.type==='StringLiteral'?node.value:node.quasis.map(q=>q.value.cooked||q.value.raw).join('');
          let key=''; if(parent?.type==='ObjectProperty'&&parent.value===node)key=keyName(parent.key);if(parent?.type==='VariableDeclarator'&&parent.init===node)key=keyName(parent.id);if(parent?.type==='AssignmentExpression'&&parent.right===node)key=keyName(parent.left);
          data.literals.push({node,value,key});
        }
        if(node.type==='CallExpression' || node.type==='AssignmentExpression' || node.type==='ObjectProperty')data.code.push(node);
        if(node.type==='CallExpression'&&node.callee?.type==='MemberExpression'&&/^(?:app|router|server)$/.test(node.callee.object?.name||'')&&/^(get|post|put|patch|delete)$/.test(keyName(node.callee.property))&&node.arguments[0]?.type==='StringLiteral') routes.push({file:name,line:node.loc.start.line,method:keyName(node.callee.property).toUpperCase(),status:'접근 권한은 실행 확인 필요'});
      });
      parsed.set(name,data);edges.set(name,data.imports.map(spec=>resolve(name,spec)).filter(Boolean));parsedFiles++;
    } catch {parseFailures++;}
  }
  const queue=[...browser]; for(let i=0;i<queue.length;i++)for(const next of edges.get(queue[i])||[])if(!browser.has(next)){browser.add(next);queue.push(next);}
  const assess = issue => {
    const name=normalize(issue.filePath||''), file=byName.get(name), rule=issue.ruleId||'', line=issue.line||0;
    const review=reason=>({status:'review',reason}); const example=reason=>({status:'example',reason});
    if(!file)return review('원본 파일이 없어 사용 문맥을 확인하지 못했어요.');
    const data=parsed.get(name);const literals=data?.literals.filter(item=>lineInside(item.node,line))||[];
    const secret=/-(?:KEY|PUBLIC)-/.test(rule);
    let assignment;
    if(secret&&data)assignment=literals.find(item=>sensitiveName(item.key) && !/[\r\n]/.test(item.value));
    if(secret&&/(?:^|\/)\.env(?:\.[^/]*)?$|\.(?:properties|ini|conf)$/i.test(name)) {
      const raw=file.content.split('\n')[line-1]||'';const m=raw.match(/^\s*(?:export\s+)?([\w.-]+)\s*=\s*(?:"([^"\r\n]*)"|'([^'\r\n]*)'|([^\s#]+))\s*(?:#.*)?$/);
      if(m&&sensitiveName(m[1]))assignment={key:m[1],value:m[2]??m[3]??m[4]};
    }
    if(assignment) {
      if(placeholder(assignment.value))return example('대입된 값에 예시 표시나 반복 문자가 있어요. 사용 가능한 비밀값으로 확인된 것은 아니에요.');
      const known=token(assignment.value)||(/SECRET_ACCESS_KEY/i.test(assignment.key)&&/^[A-Za-z0-9+/]{40}={0,2}$/.test(assignment.value));
      if(known && /(?:^|\/)\.env(?:\.[^/]*)?$/.test(name) && !/^(?:VITE_|NEXT_PUBLIC_)/.test(assignment.key))return review('환경 파일에 비밀키 형식의 값이 있어요. 정상 보관일 수 있으므로 공유·배포 대상인지 확인해야 해요.');
      if(known) {const client=browser.has(name)||/^(?:VITE_|NEXT_PUBLIC_)/.test(assignment.key);return {status:'actionable',kind:client?'browser-secret':'hardcoded-secret',title:client?'화면 코드에 비밀키 형식의 값이 직접 들어 있어요':'접속 설정에 비밀키 형식의 값이 직접 적혀 있어요',reason:client?'실제 설정 대입과 브라우저 진입 파일의 연결 또는 공개 변수 이름을 함께 확인했어요. 배포 여부와 키의 유효성은 확인하지 않았어요.':'설명문이 아닌 변수·설정 대입에서 서비스 비밀키 형식을 확인했어요. 실제 사용 여부와 키의 유효성은 확인하지 않았어요.',change:client?'비밀키를 화면 코드에서 제거하고 서버에서만 읽도록 옮기세요. 실제 사용하는 키라면 교체하세요.':'비밀값을 코드에 직접 적지 말고 별도 비밀 저장소에서 읽도록 바꾸세요. .env라면 공유·배포 대상에서 제외하고, 이미 공유한 실제 키는 교체하세요.'};}
      return review('설정에 값이 직접 적혀 있지만 실제 비밀번호·키인지 확정할 수 없어요.');
    }
    if(examplePath(name))return example('예제·테스트 경로에서 발견한 코드예요. 운영 코드의 수정 목록과 분리했어요. 실제 서비스에 포함된다면 별도로 확인해야 해요.');
    if(rule==='#VULN-FIREBASE-37'&&/\.rules$/i.test(name)) {
      const raw=file.content.replace(/\/\*[\s\S]*?\*\//g, m=>m.replace(/[^\n]/g,' ')).split('\n')[line-1]||'';
      if(/^\s*allow\s+(?:write|create|update|delete|read)(?:\s*,\s*(?:write|create|update|delete|read|get|list))*\s*:\s*if\s+true\s*;\s*(?:\/\/.*)?$/.test(raw)&&/\b(?:write|create|update|delete)\b/.test(raw))return {status:'actionable',kind:'public-write',title:'누구나 자료를 바꿀 수 있는 저장소 규칙이 있어요',reason:'규칙 파일에서 쓰기 권한을 조건 없이 허용하는 문장을 확인했어요. 이 규칙이 실제 서버에 배포됐는지는 확인하지 않았어요.',change:'업무 자료라면 로그인과 자료 소유자를 확인하는 조건으로 바꾸세요. 공개 쓰기가 의도된 서비스인지 담당자에게 먼저 확인하세요.'};
    }
    if(data) {
      const directInput = node => { let found=false; walk(node,null,n=>{if(n.type==='MemberExpression'&&n.object?.type==='MemberExpression'&&/^(?:req|request)$/.test(n.object.object?.name||'')&&/^(?:query|body|params)$/.test(keyName(n.object.property)))found=true;});return found; };
      const call=data.code.find(node=>node.type==='CallExpression'&&lineInside(node,line)&&directInput(node.arguments?.[0]));
      if(call && rule.includes('-SQL-') && /^(?:query|execute|raw|\$queryRawUnsafe)$/.test(keyName(call.callee)) && ['BinaryExpression','TemplateLiteral'].includes(call.arguments[0]?.type))return {status:'actionable',kind:'request-sql',title:'외부에서 받은 글을 자료 조회 명령에 붙이고 있어요',reason:'요청에서 받은 값이 조회 명령의 문자열에 직접 연결되는 코드를 확인했어요. 실제 자료 유출은 실행해 확인하지 않았어요.',change:'입력값을 조회 명령 문자열에 붙이지 말고, 데이터베이스의 값 전달 기능(매개변수 바인딩)으로 분리하세요. 기존 조회 권한 검사를 유지하세요.'};
      if(call && /-(?:EXEC|EVAL)-/.test(rule) && /^(?:eval|exec|execSync)$/.test(keyName(call.callee)))return {status:'actionable',kind:'request-command',title:'외부에서 받은 글을 실행 명령으로 넘기고 있어요',reason:'요청 입력이 실행 함수의 첫 번째 인자로 직접 들어가는 것을 확인했어요. 실제 서버에서 명령을 실행하지는 않았어요.',change:'입력받은 글을 실행하지 않도록 바꾸세요. 필요한 작업을 미리 정해 두고, 허용한 작업만 선택해서 실행하도록 변경하세요.'};
      if((data.ast.comments||[]).some(node=>lineInside(node,line)))return review('주석 안의 내용이에요. 실행 코드는 아니지만 실제 비밀정보를 적었다면 별도 조치가 필요해요.');
      if(literals.some(item=>item.value.includes('\n')||/[;{}]/.test(item.value)))return review('코드 문법상 문자열 안에 들어 있는 예시 또는 텍스트예요. 이 부분 자체가 명령으로 실행된다는 근거는 없어요.');
      if(rule.includes('-KEY-')&&literals.some(item=>placeholder(item.value)))return example('예시 표시가 있는 문자열이에요. 실제 사용되는 비밀키로 확인되지 않았어요.');
    }
    if(examplePath(name))return example('예제·테스트 경로의 코드예요. 실제 운영 사용 여부는 확인하지 않았어요.');
    if(!data)return review('이 파일 형식의 코드 문맥 분석은 지원하지 않거나 문법을 읽지 못했어요. 단순 패턴 결과만 남겼어요.');
    return review('실제 코드 위치는 찾았지만 입력·권한·배포 흐름이 위험하다는 근거는 아직 부족해요.');
  };
  for(const issue of issues)issue.sourceAssessment=assess(issue);
  return {parsedFiles,parseFailures,unsupportedFiles,browserFiles:browser.size,routes,scope:'JS/TS 문법·직접 설정 대입·상대 경로 import 연결·Firebase 쓰기 규칙 확인. 외부 입력의 직접 SQL·명령 연결 확인. 코드를 실행하거나 실제 사용자 권한을 검증하지 않습니다.'};
}

