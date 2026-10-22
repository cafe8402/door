// 시연용으로 생성한 코드입니다. 키 문자열은 발급받은 키가 아니며 실제 서비스에서 사용하지 않습니다.
export const apiKey = "sk-proj-6100a32f8850aaac1372f7af7589a7a51b7ad50b089d42ca";
export async function askAssistant(question) {
  return fetch("https://api.example.invalid/chat", { method: "POST", headers: { Authorization: `Bearer ${apiKey}` }, body: JSON.stringify({question}) });
}
