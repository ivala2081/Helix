// AES-256-GCM encryption for customer exchange API credentials.
// SERVER-ONLY. The plaintext secret must never reach the browser or the DB.
//
// Ciphertext format (single string): base64(iv).base64(authTag).base64(cipher)
// - iv:      12 random bytes (GCM standard)
// - authTag: 16 bytes (integrity — decryption throws if tampered)

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "@/lib/env";

const ALGO = "aes-256-gcm";

function key(): Buffer {
  const raw = env.APP_ENCRYPTION_KEY.trim();
  const buf = Buffer.from(raw, "hex");
  if (buf.length !== 32) {
    throw new Error(
      "APP_ENCRYPTION_KEY must be 32 bytes as 64 hex chars. " +
        "Generate: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
    );
  }
  return buf;
}

/** Encrypt a plaintext secret. Returns an opaque string safe to store in the DB. */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${enc.toString("base64")}`;
}

/** Decrypt a value produced by encryptSecret. Throws if the key is wrong or the
 *  ciphertext was tampered with. */
export function decryptSecret(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(".");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Malformed ciphertext");
  }
  const decipher = createDecipheriv(ALGO, key(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

/** Mask a key for display: first 4 + last 4 chars. */
export function maskKey(value: string): string {
  if (value.length <= 8) return "••••";
  return `${value.slice(0, 4)}••••${value.slice(-4)}`;
}
