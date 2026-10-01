import "server-only";

/**
 * Time-based one-time codes (RFC 6238), compatible with Google Authenticator, Microsoft Authenticator,
 * Authy, 1Password and every other authenticator app. 6 digits, 30-second steps, SHA-1.
 */
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const STEP = 30;

export function base32Encode(bytes: Uint8Array) {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(input: string) {
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    value = (value << 5) | ALPHABET.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

/** 160-bit random secret, the size authenticator apps expect (32 base32 characters) */
export function newTotpSecret() {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return base32Encode(bytes);
}

async function codeAt(secret: string, step: number) {
  const key = await crypto.subtle.importKey("raw", base32Decode(secret), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const msg = new ArrayBuffer(8);
  const view = new DataView(msg);
  view.setUint32(0, Math.floor(step / 2 ** 32));
  view.setUint32(4, step >>> 0);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, msg));
  const offset = mac[mac.length - 1] & 15;
  const bin = ((mac[offset] & 0x7f) << 24) | (mac[offset + 1] << 16) | (mac[offset + 2] << 8) | mac[offset + 3];
  return String(bin % 1_000_000).padStart(6, "0");
}

/**
 * Checks a code against the current step and one step either side (clock drift).
 * Returns the matching step so the caller can refuse to accept the same code twice.
 */
export async function verifyTotp(secret: string, input: string): Promise<number | null> {
  const code = input.replace(/\D/g, "");
  if (code.length !== 6) return null;
  const now = Math.floor(Date.now() / 1000 / STEP);
  for (const step of [now, now - 1, now + 1]) {
    const expected = await codeAt(secret, step);
    let diff = 0;
    for (let i = 0; i < 6; i++) diff |= expected.charCodeAt(i) ^ code.charCodeAt(i);
    if (diff === 0) return step;
  }
  return null;
}

export function otpauthUri(secret: string, account: string, issuer: string) {
  const label = encodeURIComponent(`${issuer}:${account}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=${STEP}`;
}
