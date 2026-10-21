// SYNTHETIC TEST FIXTURE: static analysis input only.
const actions = { status: () => "ready" };
export function runTask(input) { return actions[input]?.() ?? "denied"; }
