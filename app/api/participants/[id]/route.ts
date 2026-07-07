import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

// 生成結果を手動編集したときの保存
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabaseが未設定のため保存できません" },
      { status: 500 }
    );
  }

  const { id } = await params;

  let body: { result?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が不正です" }, { status: 400 });
  }

  if (!body.result || typeof body.result !== "object") {
    return NextResponse.json({ error: "result が必要です" }, { status: 400 });
  }

  const { error } = await supabase
    .from("participants")
    .update({ result: body.result, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: `保存に失敗しました: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
