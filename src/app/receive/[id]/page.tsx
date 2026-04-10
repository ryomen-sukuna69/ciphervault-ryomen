"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { SessionGate } from "@/components/SessionGate";
import { useVault } from "@/components/VaultProvider";
import {
  aesGcmDecrypt,
  importEncPrivateKey,
  importSigPublicKey,
  unwrapAesKey,
  verifySigB64,
} from "@/lib/crypto";
import { b64ToBytes } from "@/lib/encoding";
import { canonicalTransferMessage } from "@/lib/transferMessage";
import { errMsg } from "@/lib/errors";
import { useSupabase } from "@/components/SupabaseBrowserProvider";

type ApiTransfer = {
  id: string;
  senderId: string;
  recipientId: string;
  filename: string;
  mime: string;
  byteSize: number;
  wrappedAesKeyB64: string;
  ivB64: string;
  ciphertextSha256B64: string;
  senderSignatureB64: string;
  createdAt: string;
  status: string;
};

export default function ReceivePage(props: { params: { id: string } }) {
  const supabase = useSupabase();
  const { state, unlock } = useVault();
  const vaultPayload = state.status === "unlocked" ? state.payload : null;

  const [vaultPassword, setVaultPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [transfer, setTransfer] = useState<ApiTransfer | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [senderSigPublicJwk, setSenderSigPublicJwk] = useState<JsonWebKey | null>(
    null
  );

  useEffect(() => {
    (async () => {
      setStatus(null);
      try {
        if (!supabase.client) return;
        const { data } = await supabase.client.auth.getSession();
        const session = data.session;
        if (!session) return;
        const res = await fetch(`/api/transfers/${props.params.id}`, {
          headers: { authorization: `Bearer ${session.access_token}` },
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setTransfer(json.transfer);
        setDownloadUrl(json.downloadUrl);
        setSenderSigPublicJwk(json.senderSigPublicJwk);
      } catch (e: unknown) {
        setStatus(errMsg(e) || "Failed to load transfer");
      }
    })();
  }, [props.params.id, supabase]);

  return (
    <AppShell>
      <SessionGate>
        <div className="mx-auto max-w-3xl p-8">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h1 className="text-xl font-semibold tracking-tight">Receive</h1>
            <p className="mt-2 text-sm text-zinc-300">
              Decryption happens locally in your browser. The server only serves
              ciphertext.
            </p>

            <div className="mt-6 grid gap-3">
              {transfer ? (
                <div className="rounded-xl border border-white/10 bg-black/30 p-4 text-sm">
                  <div className="font-semibold">{transfer.filename}</div>
                  <div className="mt-1 text-xs text-zinc-400">
                    From: {transfer.senderId}
                  </div>
                  <div className="text-xs text-zinc-400">
                    Size: {transfer.byteSize.toLocaleString()} bytes
                  </div>
                </div>
              ) : null}

              {state.status !== "unlocked" ? (
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <div className="text-sm font-semibold">Unlock your vault</div>
                  <div className="mt-3 flex gap-2">
                    <input
                      className="flex-1 rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-white/25"
                      value={vaultPassword}
                      onChange={(e) => setVaultPassword(e.target.value)}
                      placeholder="Vault Password"
                      type="password"
                    />
                    <button
                      className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black disabled:opacity-60"
                      disabled={!vaultPassword}
                      onClick={async () => {
                        setStatus(null);
                        try {
                          await unlock(vaultPassword);
                          setVaultPassword("");
                          setStatus("Vault unlocked.");
                        } catch (e: unknown) {
                          setStatus(errMsg(e) || "Unlock failed");
                        }
                      }}
                    >
                      Unlock
                    </button>
                  </div>
                </div>
              ) : null}

              <button
                disabled={
                  busy ||
                  state.status !== "unlocked" ||
                  !vaultPayload ||
                  !transfer ||
                  !downloadUrl
                }
                className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black disabled:opacity-60"
                onClick={async () => {
                  setBusy(true);
                  setStatus(null);
                  try {
                    if (!vaultPayload) throw new Error("Vault is locked");
                    if (!transfer || !downloadUrl) return;

                    if (!senderSigPublicJwk)
                      throw new Error("Missing sender public key");
                    const sigPub = await importSigPublicKey(senderSigPublicJwk);

                    const msg = canonicalTransferMessage({
                      v: 1,
                      transferId: transfer.id,
                      senderId: transfer.senderId,
                      recipientId: transfer.recipientId,
                      ivB64: transfer.ivB64,
                      wrappedAesKeyB64: transfer.wrappedAesKeyB64,
                      ciphertextSha256B64: transfer.ciphertextSha256B64,
                    });
                    const ok = await verifySigB64({
                      sigPublicKey: sigPub,
                      messageUtf8: msg,
                      signatureB64: transfer.senderSignatureB64,
                    });
                    if (!ok) throw new Error("Signature verification failed");

                    const ctRes = await fetch(downloadUrl);
                    if (!ctRes.ok) throw new Error("Ciphertext download failed");
                    const ctBuf = await ctRes.arrayBuffer();

                    const encPriv = await importEncPrivateKey(
                      vaultPayload.encPrivateJwk
                    );
                    const aesKey = await unwrapAesKey({
                      wrappedAesKeyB64: transfer.wrappedAesKeyB64,
                      recipientEncPrivateKey: encPriv,
                    });

                    const iv = b64ToBytes(transfer.ivB64);
                    const plaintext = await aesGcmDecrypt({
                      aesKey,
                      iv,
                      ciphertext: ctBuf,
                    });

                    const safe = Uint8Array.from(plaintext);
                    const blob = new Blob([safe.buffer], {
                      type: transfer.mime || "application/octet-stream",
                    });
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(blob);
                    a.download = transfer.filename;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();

                    setStatus("Decrypted and downloaded.");
                  } catch (e: unknown) {
                    setStatus(errMsg(e) || "Decrypt failed");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? "Decrypting…" : "Decrypt & download"}
              </button>

              {status ? (
                <div className="text-sm text-zinc-300">{status}</div>
              ) : null}
            </div>
          </div>
        </div>
      </SessionGate>
    </AppShell>
  );
}

