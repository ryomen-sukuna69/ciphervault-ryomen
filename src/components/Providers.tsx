"use client";

import { SupabaseBrowserProvider } from "@/components/SupabaseBrowserProvider";
import { VaultProvider } from "@/components/VaultProvider";

export function Providers(props: { children: React.ReactNode }) {
  return (
    <SupabaseBrowserProvider>
      <VaultProvider>{props.children}</VaultProvider>
    </SupabaseBrowserProvider>
  );
}

