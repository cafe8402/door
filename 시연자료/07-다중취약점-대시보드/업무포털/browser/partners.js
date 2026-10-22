// 시연용으로 생성한 코드입니다. 키 문자열은 발급받은 키가 아니며 실제 서비스에서 사용하지 않습니다.
export const apiKey = "sk-proj-67c87938f1f0e9f8e9a821295e54e534308d2b3ef129f31a";
export async function askAssistant(question) {
  return fetch("https://api.example.invalid/chat", { method: "POST", headers: { Authorization: `Bearer ${apiKey}` }, body: JSON.stringify({question}) });
}
