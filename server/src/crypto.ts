// Password hashing and session-token helpers, built on Web Crypto (available
// in Workers). bcrypt/scrypt aren't available on the runtime, so we use
// PBKDF2-SHA256 with a high iteration count and a per-user random salt.

// Cloudflare's Workers runtime caps PBKDF2 at 100,000 iterations.
const PBKDF2_ITERATIONS = 100_000;
const HASH_BYTES = 32;
const SALT_BYTES = 16;

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return [...arr].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function newSalt(): string {
  return randomHex(SALT_BYTES);
}

/** Derive a PBKDF2-SHA256 hash (hex) for a password + salt. */
export async function hashPassword(password: string, saltHex: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: enc.encode(saltHex),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    HASH_BYTES * 8,
  );
  return toHex(bits);
}

/** Constant-time comparison of two hex strings of equal length. */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Generate a fresh opaque session token (returned to the client in a cookie). */
export function newSessionToken(): string {
  return randomHex(32);
}

/**
 * Derive the stored form of a session token: HMAC-SHA256(SESSION_SECRET, token).
 * We never persist the raw token, and peppering with the secret means leaked DB
 * rows can't be turned back into valid cookies without the secret.
 */
export async function signToken(secret: string, token: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(token));
  return toHex(sig);
}
