"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { PrivateJwk, PublicJwk } from "@/lib/crypto";
import { vaultExists, vaultUnlock } from "@/lib/vault";

export type VaultPrivatePayload = {
  encPrivateJwk: PrivateJwk;
  sigPrivateJwk: PrivateJwk;
  encPublicJwk?: PublicJwk;
  sigPublicJwk?: PublicJwk;
};

type VaultState =
  | { status: "unknown" }
  | { status: "locked"; hasVault: boolean }
  | { status: "unlocked"; payload: VaultPrivatePayload };

type VaultCtx = {
  state: VaultState;
  refresh: () => Promise<void>;
  unlock: (password: string) => Promise<void>;
  lock: () => void;
};

const Ctx = createContext<VaultCtx | null>(null);

export function VaultProvider(props: { children: React.ReactNode }) {
  const [state, setState] = useState<VaultState>({ status: "unknown" });

  const api = useMemo<VaultCtx>(
    () => ({
      state,
      refresh: async () => {
        const exists = await vaultExists();
        setState({ status: "locked", hasVault: exists });
      },
      unlock: async (password: string) => {
        const payload = await vaultUnlock<VaultPrivatePayload>({ password });
        setState({ status: "unlocked", payload });
      },
      lock: () =>
        setState((prev) =>
          prev.status === "locked"
            ? prev
            : { status: "locked", hasVault: true }
        ),
    }),
    [state]
  );

  return <Ctx.Provider value={api}>{props.children}</Ctx.Provider>;
}

export function useVault() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("VaultProvider missing");
  return ctx;
}

