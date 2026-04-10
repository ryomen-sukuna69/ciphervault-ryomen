"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase/browser";

export function SessionGate(props: { children: React.ReactNode }) {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, [supabase]);

  if (!ready) return <div className="p-8 text-zinc-400">Loading…</div>;
  if (!session)
    return (
      <div className="mx-auto max-w-2xl p-8">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="text-lg font-semibold">Sign in required</div>
          <p className="mt-2 text-sm text-zinc-300">
            You need an account to send/receive encrypted files.
          </p>
          <Link
            href="/auth"
            className="mt-4 inline-flex rounded-full border border-white/15 px-4 py-2 text-sm hover:border-white/30"
          >
            Go to Auth
          </Link>
        </div>
      </div>
    );

  return <>{props.children}</>;
}

