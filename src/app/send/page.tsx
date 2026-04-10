"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { SessionGate } from "@/components/SessionGate";
import { useVault } from "@/components/VaultProvider";
import {
  aesGcmEncrypt,
  generateAesKey,
  importEncPublicKey,
  importSigPrivateKey,
  randomIv,
  sha256B64,
  signB64,
  wrapAesKey,
} from "@/lib/crypto";
import { bytesToB64 } from "@/lib/encoding";
import { canonicalTransferMessage } from "@/lib/transferMessage";
import { errMsg } from "@/lib/errors";
import { useSupabase } from "@/components/SupabaseBrowserProvider";

export default function SendPage() {
  const supabase = useSupabase();
  const { state, unlock } = useVault();
  const vaultPayload = state.status === "unlocked" ? state.payload : null;

  const [recipientId, setRecipientId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [vaultPassword, setVaultPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [transferLink, setTransferLink] = useState<string | null>(null);

  return (
    <AppShell>
      <SessionGate>
        <div className="mx-auto max-w-3xl p-8">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h1 className="text-xl font-semibold tracking-tight">Send</h1>
            <p className="mt-2 text-sm text-zinc-300">
              Your file is encrypted in your browser with AES-GCM. Only the
              recipient can unwrap the session key with their private key.
            </p>

            <div className="mt-6 grid gap-3">
              <label className="grid gap-1 text-sm">
                <span className="text-zinc-300">Recipient User ID (UUID)</span>
                <input
                  className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-white/25"
                  value={recipientId}
                  onChange={(e) => setRecipientId(e.target.value)}
                  placeholder="e.g. 3f9e6f2f-...."
                />
              </label>

              <label className="grid gap-1 text-sm">
                <span className="text-zinc-300">File</span>
                <input
                  className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm"
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>

              {state.status !== "unlocked" ? (
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <div className="text-sm font-semibold">Unlock your vault</div>
                  <div className="mt-1 text-xs text-zinc-400">
                    Needed to sign the transfer metadata.
                  </div>
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
                  !recipientId ||
                  !file ||
                  state.status !== "unlocked" ||
                  !vaultPayload ||
                  !supabase.client
                }
                className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black disabled:opacity-60"
                onClick={async () => {
                  setBusy(true);
                  setStatus(null);
                  setTransferLink(null);
                  try {
                    if (!vaultPayload) throw new Error("Vault is locked");
                    if (!supabase.client) throw new Error("Supabase not configured");
                    const { data: sess } = await supabase.client.auth.getSession();
                    const session = sess.session;
                    if (!session) throw new Error("Not signed in");
                    const senderId = session.user.id;

                    const { data: recipientKeys, error: rkErr } = await supabase.client
                      .from("user_public_keys")
                      .select("enc_public_key_jwk")
                      .eq("user_id", recipientId)
                      .maybeSingle();
                    if (rkErr || !recipientKeys)
                      throw rkErr ?? new Error("Recipient keys not found");

                    const recipientEncPublic = await importEncPublicKey(
                      recipientKeys.enc_public_key_jwk as JsonWebKey
                    );

                    const aesKey = await generateAesKey();
                    const iv = randomIv();
                    const plaintext = await file!.arrayBuffer();
                    const ciphertext = await aesGcmEncrypt({
                      aesKey,
                      iv,
                      plaintext,
                    });

                    const ciphertextSha256B64 = await sha256B64(
                      Uint8Array.from(ciphertext)
                    );
                    const ivB64 = bytesToB64(iv);
                    const wrappedAesKeyB64 = await wrapAesKey({
                      aesKey,
                      recipientEncPublicKey: recipientEncPublic,
                    });

                    const sigPriv = await importSigPrivateKey(
                      vaultPayload.sigPrivateJwk
                    );

                    const initPayload = {
                      recipientId,
                      filename: file!.name,
                      mime: file!.type || "application/octet-stream",
                      byteSize: file!.size,
                      wrappedAesKeyB64,
                      ivB64,
                      ciphertextSha256B64,
                      senderSignatureB64: "", // placeholder
                    };

                    // We sign after we know transferId (server mints it), so init is 2-step.
                    const initRes = await fetch("/api/transfers/init", {
                      method: "POST",
                      headers: {
                        "content-type": "application/json",
                        authorization: `Bearer ${session.access_token}`,
                      },
                      body: JSON.stringify({
                        ...initPayload,
                        senderSignatureB64: "pending",
                      }),
                    });
                    const initJson = await initRes.json();
                    if (!initRes.ok) throw new Error(initJson.error);

                    const transferId = initJson.transferId as string;

                    const msg = canonicalTransferMessage({
                      v: 1,
                      transferId,
                      senderId,
                      recipientId,
                      ivB64,
                      wrappedAesKeyB64,
                      ciphertextSha256B64,
                    });
                    const senderSignatureB64 = await signB64({
                      sigPrivateKey: sigPriv,
                      messageUtf8: msg,
                    });

                    // Patch signature into record (sender only)
                    const { error: sigUpdateErr } = await supabase.client
                      .from("transfers")
                      .update({ sender_signature_b64: senderSignatureB64 })
                      .eq("id", transferId)
                      .eq("sender_id", senderId);
                    if (sigUpdateErr) throw sigUpdateErr;

                    const bucket = initJson.bucket as string;
                    const path = initJson.path as string;
                    const token = initJson.token as string;

                    const safeCt = Uint8Array.from(ciphertext);
                    const { error: upErr } = await supabase.client.storage
                      .from(bucket)
                      .uploadToSignedUrl(
                        path,
                        token,
                        new Blob([safeCt.buffer], {
                          type: "application/octet-stream",
                        })
                      );
                    if (upErr) throw upErr;

                    const finRes = await fetch("/api/transfers/finalize", {
                      method: "POST",
                      headers: {
                        "content-type": "application/json",
                        authorization: `Bearer ${session.access_token}`,
                      },
                      body: JSON.stringify({ transferId }),
                    });
                    const finJson = await finRes.json();
                    if (!finRes.ok) throw new Error(finJson.error);

                    setStatus("Uploaded encrypted file.");
                    setTransferLink(`${window.location.origin}/receive/${transferId}`);
                  } catch (e: unknown) {
                    setStatus(errMsg(e) || "Send failed");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? "Encrypting & uploading…" : "Send encrypted file"}
              </button>

              {transferLink ? (
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <div className="text-sm font-semibold">Share this link</div>
                  <div className="mt-2 break-all text-xs text-zinc-300">
                    <a
                      href={transferLink}
                      target="_blank"
                      rel="noreferrer"
                      className="text-cyan-300 hover:text-cyan-200"
                    >
                      {transferLink}
                    </a>
                  </div>
                </div>
              ) : null}

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

