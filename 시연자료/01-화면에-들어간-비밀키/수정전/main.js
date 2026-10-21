// 시연용으로 생성한 코드입니다. 키 문자열은 발급받은 키가 아니며 실제 서비스에서 사용하지 않습니다.
export const apiKey = "sk-proj-8c7da6af89ff6c7a92583626a2661c6180e2603cf18dacb7";
export async function askAssistant(question) {
  return fetch("https://api.example.invalid/chat", { method: "POST", headers: { Authorization: `Bearer ${apiKey}` }, body: JSON.stringify({question}) });
}
