import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserFromBearer } from "@/lib/supabase/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

const ParamsSchema = z.object({ id: z.string().uuid() });

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUserFromBearer(req);
    const { id } = ParamsSchema.parse(await ctx.params);

    const admin = supabaseAdmin();
    const { data: transfer, error } = await admin
      .from("transfers")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error || !transfer) throw error ?? new Error("Not found");

    if (transfer.sender_id !== user.id && transfer.recipient_id !== user.id) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const { data: signed, error: signedErr } = await admin.storage
      .from(transfer.storage_bucket)
      .createSignedUrl(transfer.storage_path, 60 * 10);
    if (signedErr || !signed) throw signedErr ?? new Error("No signed url");

    const { data: senderKeys } = await admin
      .from("user_public_keys")
      .select("sig_public_key_jwk")
      .eq("user_id", transfer.sender_id)
      .maybeSingle();

    return NextResponse.json({
      transfer: {
        id: transfer.id,
        senderId: transfer.sender_id,
        recipientId: transfer.recipient_id,
        filename: transfer.filename,
        mime: transfer.mime,
        byteSize: transfer.byte_size,
        wrappedAesKeyB64: transfer.wrapped_aes_key_b64,
        ivB64: transfer.iv_b64,
        ciphertextSha256B64: transfer.ciphertext_sha256_b64,
        senderSignatureB64: transfer.sender_signature_b64,
        createdAt: transfer.created_at,
        status: transfer.status,
      },
      downloadUrl: signed.signedUrl,
      senderSigPublicJwk: senderKeys?.sig_public_key_jwk ?? null,
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "get failed" },
      { status: 400 }
    );
  }
}

