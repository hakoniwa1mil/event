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
      "カードのタイトルになる最重要の一文。「◯◯するために、(出身地)から(イベント開催地)に来ました」の形。意外性・逆説があるほど良い。40字以内目安"
    ),
  challengeLine: z
    .string()
    .describe("「最近◯◯に挑戦しました」の形の一文。40字以内目安"),
  overthinkLine: z
    .string()
    .describe("「ふとした瞬間に「◯◯」を考えています」の形の一文。40字以内目安"),
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
  fromWhere: string; // どこから来るか
  challenge: string; // 新しい挑戦 (インパクト枠を合併)
  overthink: string; // ふとした瞬間に考えてしまうこと
  askWho: string; // 誰に聞きたいか
  askWhat: string; // 何を聞きたいか
  aiSummary: string; // 普段使っているAIによる本人分析 (任意)
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
「◯◯するために、(出身地)から(イベント開催地)に来ました」の形。
読んだ人が「え、どういうこと?」と思わず話しかけたくなる一文にする。

作り方:
- 本人の「最大目標」と「その手前にある矛盾・遠回り」を見つける。AIによる本人分析があれば最優先の材料にする
- 「目標に近づくために、あえて(具体的な何か)を諦める / 手放す / 決める」という決断の宣言の形にする
- 入力に登場する具体名詞(サービス名・行動・場所など)を必ず1つ入れる

禁止 (ぼんやりして誰でも言える文になるため):
- 「見極めるため」「確かめるため」「探すため」「学ぶため」「模索するため」など探索系の動詞
- 「本当の自分」「適性」「可能性」など抽象語だけで作ったタイトル

良い例:
悩み「noteで稼ぎたいが、今の自分には売れるものがない。まず自分の事業で稼ぐのが先かも」
→ ○「『noteで稼ぐ』をいったん諦めるために、山口から那須に来ました」
悪い例 (同じ入力から作ってはいけない文):
→ ✕「自分の事業への本当の適性を見極めるために、山口から那須に来ました」(抽象的で引っかかりがない)

開催地はイベント名・内容から読み取る。読み取れなければ「(出身地)から来ました」とする。

2. challengeLine: 「最近◯◯に挑戦しました」の形。本人の回答を簡潔に整える
3. overthinkLine: 「ふとした瞬間に「◯◯」を考えています」の形。悩みの核心を短い言葉に凝縮する。AIによる本人分析があれば核心の精度を上げる
4. questionLine: 「◯◯さんに、◯◯を聞いてみたいです」の形。本人の回答をほぼそのまま、話し言葉で整える

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

  const userPrompt = `以下がユーザーの回答です。

## 参加するイベント
イベント名: ${body.eventName}
内容: ${body.eventDetail}

## プロフィール
Xの名前: ${input.xName}
X ID: @${input.xId}

## どこから来るか
${input.fromWhere || "(未入力)"}

## 最近やった新しい挑戦 (人に驚かれたことでもOK)
${input.challenge || "(未入力)"}

## ふとした瞬間についつい考えてしまうこと
${input.overthink || "(未入力)"}

## 聞いてみたいこと
誰に: ${input.askWho || "(未入力)"}
何を: ${input.askWhat || "(未入力)"}

## 普段使っているAIによる本人分析 (最大目標・矛盾・決めるべきこと・エピソード)
${input.aiSummary || "(未入力。他の回答から本人の最大目標と矛盾を推測してください)"}

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
