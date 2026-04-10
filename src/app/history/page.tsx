"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { SessionGate } from "@/components/SessionGate";
import { useSupabase } from "@/components/SupabaseBrowserProvider";

type TransferRow = {
  id: string;
  sender_id: string;
  recipient_id: string;
  filename: string;
  mime: string;
  byte_size: number;
  created_at: string;
  status: string;
};

export default function HistoryPage() {
  const supabase = useSupabase();
  const [rows, setRows] = useState<TransferRow[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setStatus(null);
      if (!supabase.client) return;
      const { data } = await supabase.client.auth.getSession();
      const session = data.session;
      if (!session) return;
      const uid = session.user.id;

      const { data: trs, error } = await supabase.client
        .from("transfers")
        .select("id,sender_id,recipient_id,filename,mime,byte_size,created_at,status")
        .or(`sender_id.eq.${uid},recipient_id.eq.${uid}`)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) {
        setStatus(error.message);
        return;
      }
      setRows(((trs ?? []) as TransferRow[]) ?? []);
    })();
  }, [supabase]);

  return (
    <AppShell>
      <SessionGate>
        <div className="mx-auto max-w-5xl p-8">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-xl font-semibold tracking-tight">History</h1>
              <Link
                href="/send"
                className="rounded-full border border-white/15 px-4 py-2 text-sm hover:border-white/30"
              >
                New transfer
              </Link>
            </div>

            <div className="mt-6 grid gap-2">
              {rows.length === 0 ? (
                <div className="text-sm text-zinc-300">
                  No transfers yet.
                </div>
              ) : (
                rows.map((t) => (
                  <Link
                    key={t.id}
                    href={`/receive/${t.id}`}
                    className="group rounded-xl border border-white/10 bg-black/30 p-4 hover:border-white/20"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-semibold group-hover:text-white">
                          {t.filename}
                        </div>
                        <div className="mt-1 text-xs text-zinc-400">
                          {new Date(t.created_at).toLocaleString()} •{" "}
                          {t.byte_size.toLocaleString()} bytes • {t.status}
                        </div>
                        <div className="mt-1 text-xs text-zinc-500">
                          Sender: {t.sender_id}
                        </div>
                        <div className="text-xs text-zinc-500">
                          Recipient: {t.recipient_id}
                        </div>
                      </div>
                      <div className="text-xs text-zinc-400">Open</div>
                    </div>
                  </Link>
                ))
              )}
            </div>

            {status ? (
              <div className="mt-4 text-sm text-zinc-300">{status}</div>
            ) : null}
          </div>
        </div>
      </SessionGate>
    </AppShell>
  );
}

