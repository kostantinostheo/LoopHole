import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

// Per-user integration secrets live in encrypted files, never in the database.
const VAULT_DIR = process.env.VAULT_DIR || path.join(process.cwd(), 'vault-data');
const VAULT_KEY = process.env.VAULT_KEY ? Buffer.from(process.env.VAULT_KEY, 'hex') : null;

mkdirSync(VAULT_DIR, { recursive: true });

const vaultFile = (userId) => path.join(VAULT_DIR, `${userId}.vault`);

export function isVaultConfigured() {
  return VAULT_KEY?.length === 32;
}

// Payload layout: base64(iv[12] + authTag[16] + ciphertext), AES-256-GCM.
function encrypt(values) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', VAULT_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(values), 'utf8'), cipher.final()]);

  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64');
}

function decrypt(payload) {
  const data = Buffer.from(payload, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', VAULT_KEY, data.subarray(0, 12));
  decipher.setAuthTag(data.subarray(12, 28));

  return JSON.parse(Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString('utf8'));
}

export function readVault(userId) {
  if (!isVaultConfigured()) {
    throw new Error('Vault is not configured (missing VAULT_KEY on the server)');
  }

  const file = vaultFile(userId);
  if (!existsSync(file)) return {};

  // Legacy EmailJS credentials are hidden here and dropped on the next save.
  const values = Object.entries(decrypt(readFileSync(file, 'utf8')));
  return Object.fromEntries(values.filter(([key]) => !key.startsWith('emailjs')));
}

export function saveVault(userId, values) {
  const merged = { ...readVault(userId), ...values };
  writeFileSync(vaultFile(userId), encrypt(merged), 'utf8');

  return merged;
}

export function listVaultUserIds() {
  return readdirSync(VAULT_DIR)
    .filter((file) => file.endsWith('.vault'))
    .map((file) => file.slice(0, -'.vault'.length));
}
