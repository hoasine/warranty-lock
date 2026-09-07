export function shortAddr(addr: string, size = 4): string {
  if (!addr || addr.length < 10) return addr || "—";
  return `${addr.slice(0, 2 + size)}…${addr.slice(-size)}`;
}

export function formatGen(wei: number | string | bigint, digits = 4): string {
  try {
    const n =
      typeof wei === "bigint"
        ? wei
        : typeof wei === "string"
          ? BigInt(wei)
          : BigInt(Math.trunc(wei));
    const whole = n / 10n ** 18n;
    const frac = n % 10n ** 18n;
    const fracStr = frac.toString().padStart(18, "0").slice(0, digits).replace(/0+$/, "");
    return fracStr ? `${whole}.${fracStr}` : whole.toString();
  } catch {
    return String(wei);
  }
}

export function parseGenToWei(amount: string): bigint {
  const t = amount.trim();
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,18})?$/.test(t)) {
    throw new Error("Enter a valid GEN amount with at most 18 decimal places");
  }
  const [w, f = ""] = t.split(".");
  const frac = (f + "000000000000000000").slice(0, 18);
  const value = BigInt(w || "0") * 10n ** 18n + BigInt(frac);
  if (value <= 0n) throw new Error("Amount must be greater than 0");
  return value;
}

export function formatCountdown(epochSeconds: number, nowMs = Date.now()): string {
  const seconds = Math.max(0, epochSeconds - Math.floor(nowMs / 1000));
  if (seconds === 0) return "Ready now";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${minutes}m`;
  if (minutes) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

export function sameAddress(left?: string | null, right?: string | null): boolean {
  return Boolean(left && right && left.toLowerCase() === right.toLowerCase());
}

export function isZeroAddress(value: string): boolean {
  return /^0x0{40}$/i.test(value.trim());
}
