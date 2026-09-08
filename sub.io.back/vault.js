import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { mkdirSync, existsSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const VAULT_DIR = process.env.VAULT_DIR || path.join(process.cwd(), 'vault-data');
const VAULT_KEY = process.env.VAULT_KEY
  ? Buffer.from(process.env.VAULT_KEY, 'hex')
  : null;

if (!existsSync(VAULT_DIR)) {
  mkdirSync(VAULT_DIR, { recursive: true });
}

export function isVaultConfigured() {
  return Boolean(VAULT_KEY && VAULT_KEY.length === 32);
}

function vaultPath(userId) {
  return path.join(VAULT_DIR, `${userId}.vault`);
}

function encrypt(plainObject) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', VAULT_KEY, iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(plainObject), 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

function decrypt(payload) {
  const buf = Buffer.from(payload, 'base64');
  const iv = buf.subarray(0, 12);
  const authTag = buf.subarray(12, 28);
  const encrypted = buf.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', VAULT_KEY, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return JSON.parse(decrypted.toString('utf8'));
}

export function getVault(userId) {
  if (!isVaultConfigured()) {
    throw new Error('Vault is not configured (missing VAULT_KEY on the server)');
  }
  const file = vaultPath(userId);
  if (!existsSync(file)) return {};
  return decrypt(readFileSync(file, 'utf8'));
}

export function saveVault(userId, values) {
  if (!isVaultConfigured()) {
    throw new Error('Vault is not configured (missing VAULT_KEY on the server)');
  }
  const current = getVault(userId);
  const merged = { ...current, ...values };
  writeFileSync(vaultPath(userId), encrypt(merged), 'utf8');
  return merged;
}

export function listVaultUserIds() {
  if (!existsSync(VAULT_DIR)) return [];
  return readdirSync(VAULT_DIR)
    .filter((f) => f.endsWith('.vault'))
    .map((f) => f.replace(/\.vault$/, ''));
}
