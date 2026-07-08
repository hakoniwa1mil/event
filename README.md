# 🌱 たねまき

**~イベントで最大の収穫を得よう @9ji2neru~**

主催者がイベントURLを発行し、参加者はそのURLを開いて質問に答えるだけ。AI (Claude) があなた専用の自己紹介カードを生成するWebアプリです。

## 解決したい後悔

- 話しかけたい人に話しかけられなかった
- 事前準備がなく「ただ参加しただけ」になった
- 収穫 = 「自分の人生を前に進めるための知見」を得られなかった

## 使い方の流れ

1. **主催者**: `/create` でイベント名・内容を登録 → 共有URL (`/e/<id>`) を発行して参加者に配布
2. **参加者**: 共有URLを開き、3ステップで回答
   - Q1: Xの名前・ID・アイコン(任意)・出発地(任意)
   - Q2: 「最近挑戦したこと」「最近もやもやしていること」「このイベントで得るべきこと」。普段使いのAI(ChatGPT・Claude・Geminiなど)に聞いて貼り付けるか、自分で入力
   - Q3: みんなに聞いてみたいこと
3. AIが自己紹介カード(タイトル・最近の挑戦・最近もやもやしていること・聞いてみたいこと)を生成。気になる箇所は手動で調整可能
4. SNS投稿用の画像を作成してシェア
5. 入力と結果はSupabaseに保存され、当日スマホで見返せる

## 技術構成

- **Next.js (App Router)** — Vercelにデプロイ
- **Claude API** (`claude-sonnet-5`) — `@anthropic-ai/sdk` の `messages.parse` + Zod構造化出力。APIキーはサーバー側のみ
- **Supabase** — イベント情報・参加者データの保存、および同一IPからのカード生成回数の制限(1IPにつき5回まで)

## セットアップ

### 1. Supabase

1. [supabase.com](https://supabase.com) でプロジェクト作成 (無料枠でOK)
2. ダッシュボードの **SQL Editor** で `supabase/schema.sql` の内容を実行
3. **Settings > API** から `Project URL` と `service_role` キーを控える

既存プロジェクトを更新する場合も、`supabase/schema.sql` は再実行してください(`create table if not exists` なので安全に再適用できます)。生成回数の制限に使う `generate_calls` テーブルが追加されます。

### 2. ローカル開発

```bash
npm install
cp .env.local.example .env.local
# .env.local に ANTHROPIC_API_KEY / SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY を設定
npm run dev
```

### 3. Vercelにデプロイ (共有用)

1. [vercel.com](https://vercel.com) でGitHubリポジトリをインポート
2. **Environment Variables** に上記3つを設定
3. Deploy → 発行されたURLの `/create` からイベントを作成

## 今後の拡張アイデア

- 参加者一覧ページ: アイコンに矢印を向けて「〇〇さんがこんな質問をしたいと言っています」を可視化 (データは既にSupabaseに保存済み)
- イベント後の振り返り: 問いに対する答えが得られたかを記録
