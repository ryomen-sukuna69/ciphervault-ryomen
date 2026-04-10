"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";

type SupabaseCtx = {
  client: SupabaseClient | null;
  error: string | null;
  ready: boolean;
};

const Ctx = createContext<SupabaseCtx>({
  client: null,
  error: null,
  ready: false,
});

export function SupabaseBrowserProvider(props: { children: React.ReactNode }) {
  const [init] = useState(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (typeof window === "undefined") {
      return { client: null as SupabaseClient | null, error: null as string | null };
    }
    if (!url || !anon) {
      return {
        client: null as SupabaseClient | null,
        error:
          "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local",
      };
    }
    return { client: createClient(url, anon), error: null as string | null };
  });

  const ctx = useMemo<SupabaseCtx>(
    () => ({ client: init.client, error: init.error, ready: true }),
    [init]
  );

  return <Ctx.Provider value={ctx}>{props.children}</Ctx.Provider>;
}

export function useSupabase() {
  return useContext(Ctx);
}

