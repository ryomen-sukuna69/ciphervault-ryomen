import { b64ToBytes, bytesToB64, bytesToUtf8, utf8ToBytes } from "@/lib/encoding";
import { idbDel, idbGet, idbSet } from "@/lib/idb";

type VaultBlob = {
  version: 1;
  kdf: "PBKDF2";
  iterations: number;
  saltB64: string;
  ivB64: string;
  ciphertextB64: string; // AES-GCM(ciphertext) of JSON string containing private keys
};

const VAULT_KEY = "vault_blob_v1";
const DEFAULT_ITERS = 310_000;

async function deriveVaultKey(password: string, salt: Uint8Array, iterations: number) {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    Uint8Array.from(utf8ToBytes(password)),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: Uint8Array.from(salt), iterations, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

function randomBytes(n: number) {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return b;
}

export async function vaultExists(): Promise<boolean> {
  const blob = await idbGet<VaultBlob>("vault", VAULT_KEY);
  return !!blob;
}

export async function vaultClear(): Promise<void> {
  await idbDel("vault", VAULT_KEY);
}

export async function vaultCreate(params: {
  password: string;
  privatePayload: unknown; // { encPrivateJwk, sigPrivateJwk, ... }
  iterations?: number;
}): Promise<void> {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const iterations = params.iterations ?? DEFAULT_ITERS;
  const key = await deriveVaultKey(params.password, salt, iterations);

  const plaintext = Uint8Array.from(utf8ToBytes(JSON.stringify(params.privatePayload)));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: Uint8Array.from(iv) },
    key,
    plaintext
  );

  const blob: VaultBlob = {
    version: 1,
    kdf: "PBKDF2",
    iterations,
    saltB64: bytesToB64(salt),
    ivB64: bytesToB64(iv),
    ciphertextB64: bytesToB64(new Uint8Array(ciphertext)),
  };
  await idbSet("vault", VAULT_KEY, blob);
}

export async function vaultUnlock<T>(params: { password: string }): Promise<T> {
  const blob = await idbGet<VaultBlob>("vault", VAULT_KEY);
  if (!blob) throw new Error("Vault not found");

  const salt = b64ToBytes(blob.saltB64);
  const iv = b64ToBytes(blob.ivB64);
  const ciphertext = b64ToBytes(blob.ciphertextB64);

  const key = await deriveVaultKey(params.password, salt, blob.iterations);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: Uint8Array.from(iv) },
    key,
    Uint8Array.from(ciphertext)
  );
  return JSON.parse(bytesToUtf8(new Uint8Array(plaintext))) as T;
}

