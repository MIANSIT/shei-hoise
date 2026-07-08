import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function parseKey(source: string, value: string): Buffer {
  const buf = Buffer.from(value, "hex");
  if (buf.length !== 32) {
    throw new Error(`${source} must be a 32-byte hex string (64 hex characters)`);
  }
  return buf;
}

function getCurrentVersion(): number {
  const raw = process.env.ENCRYPTION_KEY_VERSION;
  return raw ? Number(raw) : 1;
}

/**
 * Resolves the key for a given version. The current version always reads
 * ENCRYPTION_KEY; any older version needed to decrypt data from before a
 * rotation must have its original key preserved under
 * ENCRYPTION_KEY_V{version} (e.g. ENCRYPTION_KEY_V1) — see encrypt()'s doc
 * comment for the full rotation procedure.
 */
function getKeyForVersion(version: number): Buffer {
  if (version === getCurrentVersion()) {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) throw new Error("ENCRYPTION_KEY environment variable is not set");
    return parseKey("ENCRYPTION_KEY", key);
  }

  const envVarName = `ENCRYPTION_KEY_V${version}`;
  const key = process.env[envVarName];
  if (!key) {
    throw new Error(
      `${envVarName} is not set — needed to decrypt data encrypted under key version ${version}`,
    );
  }
  return parseKey(envVarName, key);
}

/**
 * Encrypts a string for storage. Output format: v{version}:iv:authTag:ciphertext
 * (all hex). `version` is ENCRYPTION_KEY_VERSION (defaults to 1) at the time
 * of encryption, so rotating the key doesn't strand every secret encrypted
 * under the old one:
 *
 *   1. Before changing ENCRYPTION_KEY, copy its current value into a new
 *      env var named ENCRYPTION_KEY_V{currentVersion} (e.g. ENCRYPTION_KEY_V1
 *      if ENCRYPTION_KEY_VERSION was unset/1).
 *   2. Set ENCRYPTION_KEY to the new key and bump ENCRYPTION_KEY_VERSION.
 *   3. Old ciphertext keeps decrypting via the preserved versioned var; new
 *      ciphertext uses the new ENCRYPTION_KEY. Nothing needs re-encrypting
 *      immediately — only if you want to eventually retire the old var.
 */
export function encrypt(plaintext: string): string {
  const version = getCurrentVersion();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKeyForVersion(version), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [
    `v${version}`,
    iv.toString("hex"),
    authTag.toString("hex"),
    encrypted.toString("hex"),
  ].join(":");
}

/**
 * Decrypts a string produced by encrypt(). Ciphertext written before this
 * versioning scheme existed has no version prefix (3 parts, not 4) and is
 * treated as version 1. Throws if the ciphertext or key is invalid.
 */
export function decrypt(ciphertext: string): string {
  const parts = ciphertext.split(":");

  let version: number;
  let ivHex: string | undefined;
  let authTagHex: string | undefined;
  let dataHex: string | undefined;

  if (parts.length === 4) {
    const [versionTag, iv, tag, data] = parts;
    version = Number(versionTag.replace(/^v/, ""));
    ivHex = iv;
    authTagHex = tag;
    dataHex = data;
  } else if (parts.length === 3) {
    version = 1;
    [ivHex, authTagHex, dataHex] = parts;
  } else {
    throw new Error("Invalid ciphertext format");
  }

  if (!ivHex || !authTagHex || !dataHex || Number.isNaN(version)) {
    throw new Error("Invalid ciphertext format");
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, getKeyForVersion(version), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
