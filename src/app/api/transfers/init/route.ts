import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserFromBearer } from "@/lib/supabase/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

const InitSchema = z.object({
  recipientId: z.string().uuid(),
  filename: z.string().min(1).max(512),
  mime: z.string().min(1).max(255),
  byteSize: z.number().int().nonnegative(),
  wrappedAesKeyB64: z.string().min(1),
  ivB64: z.string().min(1),
  ciphertextSha256B64: z.string().min(1),
  senderSignatureB64: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const sender = await requireUserFromBearer(req);
    const body = InitSchema.parse(await req.json());

    const admin = supabaseAdmin();
    const transferId = crypto.randomUUID();
    const bucket = "ciphervault";
    const path = `${sender.id}/${transferId}`;

    const { error: insertErr } = await admin.from("transfers").insert({
      id: transferId,
      sender_id: sender.id,
      recipient_id: body.recipientId,
      filename: body.filename,
      mime: body.mime,
      byte_size: body.byteSize,
      storage_bucket: bucket,
      storage_path: path,
      wrapped_aes_key_b64: body.wrappedAesKeyB64,
      iv_b64: body.ivB64,
      ciphertext_sha256_b64: body.ciphertextSha256B64,
      sender_signature_b64: body.senderSignatureB64,
      status: "uploading",
    });
    if (insertErr) throw insertErr;

    const { data: signed, error: signedErr } = await admin.storage
      .from(bucket)
      .createSignedUploadUrl(path);
    if (signedErr || !signed) throw signedErr ?? new Error("No signed upload");

    return NextResponse.json({
      transferId,
      bucket,
      path,
      signedUrl: signed.signedUrl,
      token: signed.token,
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "init failed" },
      { status: 400 }
    );
  }
}

