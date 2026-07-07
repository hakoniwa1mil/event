import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

// イベント情報の取得 (参加者が共有URLを開いたとき)
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabaseが未設定です。SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を設定してください。" },
      { status: 500 }
    );
  }

  const { id } = await params;

  const { data, error } = await supabase
    .from("events")
    .select("id, name, detail")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "イベントが見つかりません。URLが正しいか確認してください。" },
      { status: 404 }
    );
  }

  return NextResponse.json(data);
}
