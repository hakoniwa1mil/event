import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabase } from "@/lib/supabase";

export const maxDuration = 120;

const PrepResultSchema = z.object({
  purposeTitle: z
    .string()
    .describe(
      "カードのタイトルになる最重要の一文。「◯◯するために、(出発地から)(イベント開催地)に来ました!」の形。具体性・引っかかりがあるほど良い。40字以内目安"
    ),
  challengeLine: z
    .string()
    .describe("「最近◯◯に挑戦しました」の形の一文。40字以内目安"),
  overthinkLine: z
    .string()
    .describe("「最近「◯◯」ともやもやしています」の形の一文。40字以内目安"),
  questionLine: z
    .string()
    .describe(
      "「◯◯さんに、◯◯を聞いてみたいです」の形の一文。質問内容は具体的に。60字以内目安"
    ),
});

export type PrepResult = z.infer<typeof PrepResultSchema>;

export interface PrepInput {
  xName: string;
  xId: string;
  fromWhere: string; // どこから来るか (任意)
  mode: "ai" | "manual"; // 「最近の挑戦」「最近もやもやしていること」の入力方法
  aiRaw: string; // mode="ai": 普段使っているAIに聞いた回答をそのまま貼り付けたもの
  challenge: string; // mode="manual": 最近やった新しい挑戦
  overthink: string; // mode="manual": 最近もやもやしていること
  askSomething: string; // みんなに聞いてみたいこと
}

interface GenerateRequest {
  eventId: string;
  eventName: string;
  eventDetail: string;
  participantId?: string;
  icon?: string;
  input: PrepInput;
}

const SYSTEM_PROMPT = `あなたはイベント参加者の「自己紹介カード」の文章を作るプロのコピーライターです。
ユーザーは「イベント参加での収穫 = 自分の人生を前に進めるための知見を得ること」を目的にしています。

カードは4行で構成されます。すべて簡潔な一文にしてください。長い文章は禁止です。

1. purposeTitle (最重要):
「◯◯するために、(出発地から)(イベント開催地)に来ました!」の形。
出発地が入力されていなければ「(出発地から)」は省略し、「◯◯するために、(イベント開催地)に来ました!」とする。
開催地はイベント名・内容から読み取る。読み取れなければ「このイベント」とする。
読んだ人が「お、どういうことですか?」と思わず話しかけたくなる一文にする。

作り方:
- 入力全体(最近の挑戦・最近もやもやしていること)から、本人がこのイベントで何を持ち帰りたいか・何を目指しているかを見つける
- 「◯◯するために」の◯◯には、具体的な目標・挑戦・決意を入れる。入力に登場する具体名詞(サービス名・行動・場所など)があれば1つ入れると引っかかりが出る
- 表現は前向き・宣言・決意・目標などその人の入力に最も合う形を選ぶ。「何かを諦める/手放す」という言い回しに寄せる必要はない(あくまで一つの表現パターンに過ぎない)

禁止 (ぼんやりして誰でも言える文になるため):
- 「見極めるため」「確かめるため」「探すため」「模索するため」など具体性のない探索系の動詞だけで終わる文
- 「本当の自分」「適性」「可能性」など抽象語だけで作ったタイトル

良い例(パターンは複数あってよい):
→ 「『noteで稼ぐ』を実現するために、山口から来ました!」
→ 「新しい事業のヒントを持ち帰るために、大阪から来ました!」
→ 「一歩踏み出す勇気をもらいに来ました!」(出発地が未入力の場合)

2. challengeLine: 「最近◯◯に挑戦しました」の形。本人の回答(または本人が普段使っているAIからの回答)を簡潔に整える
3. overthinkLine: 「最近「◯◯」ともやもやしています」の形。本人が普段気になっていること・迷っていることを短い言葉に凝縮する
4. questionLine: 「みんなに、◯◯を聞いてみたいです」の形。本人の回答をほぼそのまま、話し言葉で整える。特定の相手ではなく、その場にいる人なら誰にでも投げかけられる聞き方にする

注意: カードには入力に含まれる情報だけを使い、それ以外の個人情報(実名・住所・勤務先など)を推測して追加しない。

すべて日本語。本人がそのまま使える文章にする。`;

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY が設定されていません。" },
      { status: 500 }
    );
  }

  let body: GenerateRequest;
  try {
    body = (await req.json()) as GenerateRequest;
  } catch {
    return NextResponse.json({ error: "リクエストの形式が不正です" }, { status: 400 });
  }

  const { input } = body;

  const challengeOverthinkSection =
    input.mode === "ai"
      ? `## 普段使っているAIに聞いた回答 (最近の挑戦・最近もやもやしていることを含む)
${input.aiRaw || "(未入力)"}`
      : `## 最近やった新しい挑戦 (人に驚かれたことでもOK)
${input.challenge || "(未入力)"}

## 最近もやもやしていること
${input.overthink || "(未入力)"}`;

  const userPrompt = `以下がユーザーの回答です。

## 参加するイベント
イベント名: ${body.eventName}
内容: ${body.eventDetail}

## プロフィール
Xの名前: ${input.xName}
X ID: @${input.xId}

## どこから来るか
${input.fromWhere || "(未入力)"}

${challengeOverthinkSection}

## みんなに聞いてみたいこと
${input.askSomething || "(未入力)"}

この人の自己紹介カードの4行を生成してください。`;

  const client = new Anthropic();

  let result: PrepResult;
  try {
    const response = await client.messages.parse({
      // 逆説的なタイトルの生成はHaikuには荷が重いためSonnetを使用 (1生成あたり約1円)
      // Sonnet 5は思考(adaptive thinking)がデフォルトで有効なため、その分max_tokensに余裕を持たせる
      model: "claude-sonnet-5",
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
      output_config: { format: zodOutputFormat(PrepResultSchema) },
    });

    if (response.stop_reason === "refusal" || !response.parsed_output) {
      return NextResponse.json(
        { error: "生成に失敗しました。入力内容を変えてもう一度お試しください。" },
        { status: 502 }
      );
    }
    result = response.parsed_output;
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json(
        { error: "APIキーが無効です。ANTHROPIC_API_KEY を確認してください。" },
        { status: 500 }
      );
    }
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "レート制限に達しました。少し待ってからもう一度お試しください。" },
        { status: 429 }
      );
    }
    if (err instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `APIエラー (${err.status}): ${err.message}` },
        { status: 502 }
      );
    }
    return NextResponse.json({ error: "予期しないエラーが発生しました。" }, { status: 500 });
  }

  // 生成はできているので、保存失敗は警告に留めて結果は返す
  let participantId = body.participantId ?? null;
  let saveWarning: string | null = null;

  const supabase = getSupabase();
  if (supabase) {
    const row = {
      event_id: body.eventId,
      x_name: input.xName,
      x_id: input.xId,
      icon: body.icon ?? null,
      answers: input,
      result,
      updated_at: new Date().toISOString(),
    };

    if (participantId) {
      const { error } = await supabase
        .from("participants")
        .update(row)
        .eq("id", participantId);
      if (error) saveWarning = `保存に失敗しました: ${error.message}`;
    } else {
      const { data, error } = await supabase
        .from("participants")
        .insert(row)
        .select("id")
        .single();
      if (error) saveWarning = `保存に失敗しました: ${error.message}`;
      else participantId = data.id;
    }
  } else {
    saveWarning = "Supabase未設定のため結果は保存されていません";
  }

  return NextResponse.json({ result, participantId, saveWarning });
}
