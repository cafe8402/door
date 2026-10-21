export async function askAssistant(question) {
  return fetch("/api/assistant", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({question}) });
}
