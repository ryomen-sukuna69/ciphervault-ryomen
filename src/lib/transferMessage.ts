export type CanonicalTransferMessage = {
  v: 1;
  transferId: string;
  senderId: string;
  recipientId: string;
  ivB64: string;
  wrappedAesKeyB64: string;
  ciphertextSha256B64: string;
};

export function canonicalTransferMessage(m: CanonicalTransferMessage): string {
  // Fixed field order to ensure stable signing/verifying across runtimes.
  return JSON.stringify({
    v: 1,
    transferId: m.transferId,
    senderId: m.senderId,
    recipientId: m.recipientId,
    ivB64: m.ivB64,
    wrappedAesKeyB64: m.wrappedAesKeyB64,
    ciphertextSha256B64: m.ciphertextSha256B64,
  });
}

