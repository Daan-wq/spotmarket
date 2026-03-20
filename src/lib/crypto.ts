/**
 * AES-256-GCM encryption for storing social OAuth access tokens.
 * Key is 32-byte hex stored in ENCRYPTION_KEY env var.
 */

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error("ENCRYPTION_KEY must be a 64-character hex string (32 bytes)");
  }
  return Buffer.from(hex, "hex");
}

export function encrypt(plaintext: string): { ciphertext: string; iv: string } {
  const crypto = require("crypto");
  const key = getKey();
  const iv = crypto.randomBytes(12); // 96-bit IV for GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return {
    ciphertext: encrypted + ":" + authTag,
    iv: iv.toString("hex"),
  };
}

export function decrypt(ciphertext: string, ivHex: string): string {
  const crypto = require("crypto");
  const key = getKey();
  const iv = Buffer.from(ivHex, "hex");

  const [encrypted, authTagHex] = ciphertext.split(":");
  if (!encrypted || !authTagHex) {
    throw new Error("Invalid ciphertext format");
  }

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
