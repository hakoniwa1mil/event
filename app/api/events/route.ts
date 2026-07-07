import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

// イベント作成 (主催者用)
export async function POST(req: Request) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabaseが未設定です。SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を設定してください。" },
      { status: 500 }
    );
  }

  let body: { name?: string; detail?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が不正です" }, { status: 400 });
  }

  const name = body.name?.trim();
  const detail = body.detail?.trim();
  if (!name || !detail) {
    return NextResponse.json({ error: "イベント名と内容を入力してください" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("events")
    .insert({ name, detail })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json(
      { error: `イベントの保存に失敗しました: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ id: data.id });
}
