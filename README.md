# 🎒 イベント準備キット

**お題: 参加するイベントで最大の収穫を得よう!**

主催者がイベントURLを発行し、参加者はそのURLを開いて質問に答えるだけ。AI (Claude) があなた専用の「準備キット」を生成するWebアプリです。

## 解決したい後悔

- 話しかけたい人に話しかけられなかった
- 事前準備がなく「ただ参加しただけ」になった
- 収穫 = 「自分の人生を前に進めるための知見」を得られなかった

## 使い方の流れ

1. **主催者**: `/create` でイベント名・内容を登録 → 共有URL (`/e/<id>`) を発行して参加者に配布
2. **参加者**: 共有URLを開き、Xの名前・ID・アイコンを登録して質問に回答
3. AIが生成: キャッチフレーズ / 自己紹介 (15秒・1分) / 答えを見つけたい問い / 質問カード(第一声つき) / 応援メッセージ
4. 入力と結果はSupabaseに保存され、当日スマホで見返せる

## 技術構成

- **Next.js (App Router)** — Vercelにデプロイ
- **Claude API** (`claude-haiku-4-5`) — `@anthropic-ai/sdk` の `messages.parse` + Zod構造化出力。APIキーはサーバー側のみ
- **Supabase** — イベント情報・参加者データの保存

## セットアップ

### 1. Supabase

1. [supabase.com](https://supabase.com) でプロジェクト作成 (無料枠でOK)
2. ダッシュボードの **SQL Editor** で `supabase/schema.sql` の内容を実行
3. **Settings > API** から `Project URL` と `service_role` キーを控える

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
