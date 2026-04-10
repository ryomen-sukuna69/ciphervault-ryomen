"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { errMsg } from "@/lib/errors";
import { useSupabase } from "@/components/SupabaseBrowserProvider";

export default function AuthPage() {
  const supabase = useSupabase();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl p-8">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          {!supabase.client ? (
            <div className="rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-zinc-300">
              Supabase isn’t configured yet. Add env vars in <code>.env.local</code>{" "}
              (see <code>.env.example</code>), then reload.
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-xl font-semibold tracking-tight">
              {mode === "signin" ? "Sign in" : "Create account"}
            </h1>
            <button
              className="text-sm text-zinc-300 hover:text-white"
              onClick={() =>
                setMode((m) => (m === "signin" ? "signup" : "signin"))
              }
            >
              Switch to {mode === "signin" ? "Sign up" : "Sign in"}
            </button>
          </div>

          <form
            className="mt-6 grid gap-3"
            onSubmit={async (e) => {
              e.preventDefault();
              setStatus(null);
              setBusy(true);
              try {
                if (!supabase.client) throw new Error("Supabase not configured");
                if (mode === "signup") {
                  const { error } = await supabase.client.auth.signUp({
                    email,
                    password,
                  });
                  if (error) throw error;
                  setStatus(
                    "Account created. You can sign in now (or check email if confirmations are enabled)."
                  );
                  setMode("signin");
                } else {
                  const { error } = await supabase.client.auth.signInWithPassword({
                    email,
                    password,
                  });
                  if (error) throw error;
                  setStatus("Signed in.");
                }
              } catch (err: unknown) {
                setStatus(errMsg(err) || "Auth failed");
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="grid gap-1 text-sm">
              <span className="text-zinc-300">Email</span>
              <input
                className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 outline-none ring-0 placeholder:text-zinc-600 focus:border-white/25"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                type="email"
                autoComplete="email"
                required
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-zinc-300">Password</span>
              <input
                className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 outline-none ring-0 placeholder:text-zinc-600 focus:border-white/25"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••"
                type="password"
                autoComplete={
                  mode === "signin" ? "current-password" : "new-password"
                }
                required
              />
            </label>

            <button
              disabled={busy}
              className="mt-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black disabled:opacity-60"
            >
              {busy
                ? "Working…"
                : mode === "signin"
                  ? "Sign in"
                  : "Create account"}
            </button>

            {status ? (
              <div className="text-sm text-zinc-300">{status}</div>
            ) : null}
          </form>
        </div>
      </div>
    </AppShell>
  );
}

