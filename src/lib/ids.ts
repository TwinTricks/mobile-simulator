export function newId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") return crypto.randomUUID();
  return `d_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}
