const HEX64 = /^[0-9a-f]{64}$/;

export function normalizeSerialHash(value: string): string {
  const text = value.trim().toLowerCase();
  const hex = text.startsWith("0x") ? text.slice(2) : text;
  if (!HEX64.test(hex)) {
    throw new Error("serial_hash must be exactly 32 bytes (64 hex characters)");
  }
  return hex;
}

export function isSerialHash(value: string): boolean {
  try {
    normalizeSerialHash(value);
    return true;
  } catch {
    return false;
  }
}

export async function hashSerialText(value: string): Promise<string> {
  const text = value.trim();
  if (!text) throw new Error("Serial text is required");
  if (isSerialHash(text)) return normalizeSerialHash(text);
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
