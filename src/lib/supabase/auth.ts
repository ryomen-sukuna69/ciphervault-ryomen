import type { User } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function requireUserFromBearer(req: Request): Promise<User> {
  const auth = req.headers.get("authorization") ?? "";
  const m = auth.match(/^Bearer (.+)$/i);
  if (!m) throw new Error("Missing bearer token");
  const token = m[1]!;

  const admin = supabaseAdmin();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new Error("Invalid token");
  return data.user;
}

