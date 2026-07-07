import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { NextResponse } from "next/server";
import { z } from "zod";

export const maxDuration = 120;

const PrepResultSchema = z.object({
  selfIntroShort: z
    .string()
    .describe(
      "交流会で口頭で言える15秒程度の自己紹介。名前から始まり、相手が思わず質問したくなるフックを1つ含める"
    ),
  selfIntroLong: z
    .string()
    .describe(
      "1分程度の自己紹介。今頑張っていること・始めたこと・困っていることを織り込み、会話のきっかけを複数散りばめる"
    ),
  hook: z
    .string()
    .describe("相手に覚えてもらうためのキャッチフレーズ的な一言(20字以内目安)"),
  insights: z
    .array(
      z.object({
        question: z.string().describe("このイベントで答えを見つけたい問い"),
        why: z.string().describe("なぜこの問いが本人の人生を前に進めるのかの短い説明"),
        how: z.string().describe("イベント中にどう動けばこの問いの答えに近づけるかの具体的アクション"),
      })
    )
    .describe("イベントで得たい知見を「問い」として言語化したもの。3つ程度"),
  questionCards: z
    .array(
      z.object({
        target: z.string().describe("話しかけたい相手(例: 登壇者の〇〇さん、地方で活動しているクリエイター)"),
        question: z.string().describe("その人にしたい具体的な質問"),
        opener: z.string().describe("話しかける最初の一言の例。自然で勇気が出るもの"),
      })
    )
    .describe("質問カード。相手ごとに1枚"),
  encouragement: z
    .string()
    .describe("イベント直前に読み返す、本人への短い応援メッセージ"),
});

export type PrepResult = z.infer<typeof PrepResultSchema>;

export interface PrepInput {
  name: string;
  eventName: string;
  eventDetail: string;
  working: string;
  started: string;
  struggle: string;
  wantToAsk: string;
}

const SYSTEM_PROMPT = `あなたはイベント参加準備のプロフェッショナルコーチです。
ユーザーは「イベント参加での収穫 = 自分の人生を前に進めるための知見を得ること」と定義しており、
過去に「話しかけたい人に話しかけられなかった」「準備なしで参加しただけになった」という後悔を持っています。

ユーザーの回答をもとに、以下を生成してください:
- インパクトのある自己紹介(短い版・長い版): 暗記調ではなく話し言葉。相手が質問したくなる「フック」を含める
- 得たい知見の言語化: 本人の状況から「このイベントで答えを見つけるべき問い」を導く。抽象論ではなく本人の言葉を使う
- 質問カード: 話しかける勇気が出るよう、opener(第一声)は自然でハードルの低いものにする
- すべて日本語で、本人がそのまま使える具体的な文章にする`;

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        error:
          "ANTHROPIC_API_KEY が設定されていません。.env.local にAPIキーを設定してください。",
      },
      { status: 500 }
    );
  }

  let input: PrepInput;
  try {
    input = (await req.json()) as PrepInput;
  } catch {
    return NextResponse.json({ error: "リクエストの形式が不正です" }, { status: 400 });
  }

  const userPrompt = `以下がユーザーの回答です。

## 参加するイベント
イベント名: ${input.eventName}
内容: ${input.eventDetail}

## 名前・肩書き
${input.name}

## 今頑張っていること
${input.working}

## 新しく始めたこと
${input.started}

## 困っていること・悩んでいること
${input.struggle}

## 話しかけたい人・聞いてみたいこと
${input.wantToAsk}

この人がこのイベントで最大の収穫(=人生を前に進める知見)を得られるよう、準備キットを生成してください。`;

  const client = new Anthropic();

  try {
    const response = await client.messages.parse({
      model: "claude-opus-4-8",
      max_tokens: 16000,
      thinking: { type: "adaptive" },
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

    return NextResponse.json(response.parsed_output);
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
    return NextResponse.json(
      { error: "予期しないエラーが発生しました。" },
      { status: 500 }
    );
  }
}
