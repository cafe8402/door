import type { ScanInputData } from '../types/security';

const supported = /(?:\.(?:[cm]?[jt]sx?|py|json|ya?ml|txt|toml|ini|cfg|conf|md|sh|bash|rb|go|java|cs|php|sql|html|css|xml|pem|key|ipynb|rules|vue|svelte|kt|rs|tf|properties|csv)|(?:^|\/)\.env(?:\.[^/]*)?|(?:^|\/)(?:Dockerfile|\.gitignore|\.npmrc))$/i;

export async function readSourceFiles(files: File[], existing: ScanInputData['files'] = []): Promise<ScanInputData['files']> {
  files = files.filter(file => !file.webkitRelativePath || (!/(?:^|\/)(?:node_modules|\.git|dist|build|coverage|\.next|\.venv|venv|__pycache__)(?:\/|$)/.test(file.webkitRelativePath) && supported.test(file.name)));
  if (!files.length) throw new Error('선택한 폴더에 지원하는 소스 파일이 없습니다.');
  const result = [...existing];
  for (const file of files) {
    const name = file.webkitRelativePath ? file.webkitRelativePath.split('/').slice(1).join('/') : file.name;
    if (!supported.test(name)) throw new Error(`${name}: 지원하지 않는 형식입니다. ZIP은 압축을 풀고 소스 파일을 선택해주세요.`);
    const content = await file.text();
    if (content.includes('\0') || content.includes('\uFFFD')) throw new Error(`${name}: UTF-8 텍스트 파일만 지원합니다.`);
    if (result.some(item => item.name === name)) throw new Error(`${name}: 같은 경로의 파일이 이미 선택되어 있습니다.`);
    result.push({ name, size: file.size, content });
  }
  return result;
}
