import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserFromBearer } from "@/lib/supabase/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

const FinalizeSchema = z.object({
  transferId: z.string().uuid(),
});

export async function POST(req: Request) {
  try {
    const sender = await requireUserFromBearer(req);
    const body = FinalizeSchema.parse(await req.json());

    const admin = supabaseAdmin();
    const { data, error } = await admin
      .from("transfers")
      .update({ status: "ready" })
      .eq("id", body.transferId)
      .eq("sender_id", sender.id)
      .select("id")
      .maybeSingle();
    if (error || !data) throw error ?? new Error("Not found");

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "finalize failed" },
      { status: 400 }
    );
  }
}

