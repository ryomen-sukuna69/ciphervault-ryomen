import { b64ToBytes, bytesToB64, utf8ToBytes } from "@/lib/encoding";

export type PublicJwk = JsonWebKey;
export type PrivateJwk = JsonWebKey;

export type UserKeyMaterial = {
  encPublicJwk: PublicJwk;
  encPrivateJwk: PrivateJwk;
  sigPublicJwk: PublicJwk;
  sigPrivateJwk: PrivateJwk;
};

export async function generateUserKeys(): Promise<UserKeyMaterial> {
  const enc = await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["wrapKey", "unwrapKey"]
  );

  const sig = await crypto.subtle.generateKey(
    {
      name: "RSA-PSS",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"]
  );

  const [encPublicJwk, encPrivateJwk, sigPublicJwk, sigPrivateJwk] =
    await Promise.all([
      crypto.subtle.exportKey("jwk", enc.publicKey),
      crypto.subtle.exportKey("jwk", enc.privateKey),
      crypto.subtle.exportKey("jwk", sig.publicKey),
      crypto.subtle.exportKey("jwk", sig.privateKey),
    ]);

  return { encPublicJwk, encPrivateJwk, sigPublicJwk, sigPrivateJwk };
}

export async function importEncPublicKey(jwk: PublicJwk): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["wrapKey"]
  );
}

export async function importEncPrivateKey(jwk: PrivateJwk): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["unwrapKey"]
  );
}

export async function importSigPublicKey(jwk: PublicJwk): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSA-PSS", hash: "SHA-256" },
    true,
    ["verify"]
  );
}

export async function importSigPrivateKey(jwk: PrivateJwk): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSA-PSS", hash: "SHA-256" },
    true,
    ["sign"]
  );
}

export async function generateAesKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
}

export function randomIv(): Uint8Array {
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  return iv;
}

export async function aesGcmEncrypt(params: {
  aesKey: CryptoKey;
  iv: Uint8Array;
  plaintext: ArrayBuffer;
}): Promise<Uint8Array> {
  const iv = Uint8Array.from(params.iv);
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    params.aesKey,
    params.plaintext
  );
  return new Uint8Array(ct);
}

export async function aesGcmDecrypt(params: {
  aesKey: CryptoKey;
  iv: Uint8Array;
  ciphertext: ArrayBuffer;
}): Promise<Uint8Array> {
  const iv = Uint8Array.from(params.iv);
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    params.aesKey,
    params.ciphertext
  );
  return new Uint8Array(pt);
}

export async function wrapAesKey(params: {
  aesKey: CryptoKey;
  recipientEncPublicKey: CryptoKey;
}): Promise<string> {
  const wrapped = await crypto.subtle.wrapKey(
    "raw",
    params.aesKey,
    params.recipientEncPublicKey,
    { name: "RSA-OAEP" }
  );
  return bytesToB64(new Uint8Array(wrapped));
}

export async function unwrapAesKey(params: {
  wrappedAesKeyB64: string;
  recipientEncPrivateKey: CryptoKey;
}): Promise<CryptoKey> {
  const wrapped = Uint8Array.from(b64ToBytes(params.wrappedAesKeyB64));
  return crypto.subtle.unwrapKey(
    "raw",
    wrapped,
    params.recipientEncPrivateKey,
    { name: "RSA-OAEP" },
    { name: "AES-GCM", length: 256 },
    true,
    ["decrypt"]
  );
}

export async function sha256B64(
  data: ArrayBuffer | Uint8Array
): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    data as unknown as BufferSource
  );
  return bytesToB64(new Uint8Array(digest));
}

export async function signB64(params: {
  sigPrivateKey: CryptoKey;
  messageUtf8: string;
}): Promise<string> {
  const sig = await crypto.subtle.sign(
    { name: "RSA-PSS", saltLength: 32 },
    params.sigPrivateKey,
    Uint8Array.from(utf8ToBytes(params.messageUtf8))
  );
  return bytesToB64(new Uint8Array(sig));
}

export async function verifySigB64(params: {
  sigPublicKey: CryptoKey;
  messageUtf8: string;
  signatureB64: string;
}): Promise<boolean> {
  return crypto.subtle.verify(
    { name: "RSA-PSS", saltLength: 32 },
    params.sigPublicKey,
    Uint8Array.from(b64ToBytes(params.signatureB64)),
    Uint8Array.from(utf8ToBytes(params.messageUtf8))
  );
}

