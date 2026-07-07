import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// サーバー側専用。service roleキーはAPIルートの中でのみ使う
export function getSupabase(): SupabaseClient | null {
  const rawUrl = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!rawUrl || !key) return null;

  // コピペ事故対策:
  // - 末尾スラッシュを除去 (https://xxx.supabase.co/ → https://xxx.supabase.co)
  // - 誤って /rest/v1 などのパスを付けてしまった場合は origin だけに正規化
  let url = rawUrl;
  try {
    url = new URL(rawUrl).origin;
  } catch {
    url = rawUrl.replace(/\/+$/, "");
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
