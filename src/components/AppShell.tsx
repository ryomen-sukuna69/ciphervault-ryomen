"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { useSupabase } from "@/components/SupabaseBrowserProvider";

export function AppShell(props: { children: React.ReactNode }) {
  const supabase = useSupabase();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    if (!supabase.client) return;
    supabase.client.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.client.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, [supabase]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/40 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link href="/" className="font-semibold tracking-tight">
            CipherVault
          </Link>
          <nav className="flex items-center gap-4 text-sm text-zinc-300">
            <Link className="hover:text-white" href="/send">
              Send
            </Link>
            <Link className="hover:text-white" href="/history">
              History
            </Link>
            <Link className="hover:text-white" href="/vault">
              Vault
            </Link>
            {!supabase.client ? null : !session ? (
              <Link
                className="rounded-full border border-white/15 px-4 py-2 hover:border-white/30"
                href="/auth"
              >
                Sign in
              </Link>
            ) : (
              <button
                className="rounded-full border border-white/15 px-4 py-2 hover:border-white/30"
                onClick={async () => {
                  await supabase.client!.auth.signOut();
                }}
              >
                Sign out
              </button>
            )}
          </nav>
        </div>
      </header>
      {!supabase.ready ? (
        <div className="mx-auto w-full max-w-6xl px-5 py-4 text-sm text-zinc-400">
          Initializing…
        </div>
      ) : supabase.error ? (
        <div className="mx-auto w-full max-w-6xl px-5 py-4 text-sm text-red-300">
          {supabase.error}
        </div>
      ) : null}
      <main className="flex-1">{props.children}</main>
      <footer className="border-t border-white/10 py-8 text-center text-xs text-zinc-500">
        CipherVault stores only ciphertext + metadata. Private keys stay in your
        browser vault.
      </footer>
    </div>
  );
}

