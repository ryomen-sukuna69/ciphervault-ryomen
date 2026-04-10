"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { SessionGate } from "@/components/SessionGate";
import { generateUserKeys } from "@/lib/crypto";
import { vaultClear, vaultCreate, vaultExists } from "@/lib/vault";
import { useVault } from "@/components/VaultProvider";
import { errMsg } from "@/lib/errors";
import { useSupabase } from "@/components/SupabaseBrowserProvider";

export default function VaultPage() {
  const supabase = useSupabase();
  const { state, unlock, lock } = useVault();

  const [hasVault, setHasVault] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    vaultExists().then(setHasVault);
  }, []);

  return (
    <AppShell>
      <SessionGate>
        <div className="mx-auto max-w-3xl p-8">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h1 className="text-xl font-semibold tracking-tight">Vault</h1>
            <p className="mt-2 text-sm text-zinc-300">
              Your private keys live only in your browser, encrypted with your
              Vault Password (IndexedDB). Public keys are published so others
              can send you encrypted files.
            </p>

            <div className="mt-6 grid gap-3">
              <label className="grid gap-1 text-sm">
                <span className="text-zinc-300">Vault Password</span>
                <input
                  className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-white/25"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Choose a strong password"
                  type="password"
                  autoComplete="new-password"
                />
              </label>

              {hasVault ? (
                <button
                  disabled={busy || !password}
                  className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black disabled:opacity-60"
                  onClick={async () => {
                    setBusy(true);
                    setStatus(null);
                    try {
                      await unlock(password);
                      setStatus("Vault unlocked (this session only).");
                      setPassword("");
                    } catch (e: unknown) {
                      setStatus(errMsg(e) || "Unlock failed");
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {busy ? "Unlocking…" : "Unlock vault"}
                </button>
              ) : (
                <button
                  disabled={busy || !password}
                  className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black disabled:opacity-60"
                  onClick={async () => {
                    setBusy(true);
                    setStatus(null);
                    try {
                      if (!supabase.client) throw new Error("Supabase not configured");
                      const keys = await generateUserKeys();
                      await vaultCreate({
                        password,
                        privatePayload: {
                          encPrivateJwk: keys.encPrivateJwk,
                          sigPrivateJwk: keys.sigPrivateJwk,
                          encPublicJwk: keys.encPublicJwk,
                          sigPublicJwk: keys.sigPublicJwk,
                        },
                      });

                      const { data: s } = await supabase.client.auth.getSession();
                      const user = s.session?.user;
                      if (!user) throw new Error("Not signed in");

                      const { error } = await supabase.client
                        .from("user_public_keys")
                        .upsert(
                          {
                            user_id: user.id,
                            enc_public_key_jwk: keys.encPublicJwk,
                            sig_public_key_jwk: keys.sigPublicJwk,
                            updated_at: new Date().toISOString(),
                          },
                          { onConflict: "user_id" }
                        );
                      if (error) throw error;

                      setHasVault(true);
                      setStatus("Vault created and public keys published.");
                      setPassword("");
                    } catch (e: unknown) {
                      setStatus(errMsg(e) || "Vault create failed");
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {busy ? "Creating…" : "Create vault + generate keys"}
                </button>
              )}

              {state.status === "unlocked" ? (
                <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-zinc-200">
                  Status: <span className="font-semibold">Unlocked</span>
                  <button
                    className="ml-3 text-xs text-zinc-300 hover:text-white"
                    onClick={() => lock()}
                  >
                    Lock
                  </button>
                </div>
              ) : (
                <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-zinc-300">
                  Status: <span className="font-semibold">Locked</span>
                </div>
              )}

              <button
                className="mt-3 text-left text-xs text-red-300 hover:text-red-200"
                onClick={async () => {
                  if (
                    !confirm(
                      "This will remove your local private keys from this browser. You will NOT be able to decrypt old transfers unless you have a backup."
                    )
                  )
                    return;
                  await vaultClear();
                  setHasVault(false);
                  setStatus("Vault cleared on this device.");
                }}
              >
                Danger: Clear local vault on this device
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

