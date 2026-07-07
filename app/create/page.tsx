"use client";

import { useState } from "react";

export default function CreateEvent() {
  const [name, setName] = useState("");
  const [detail, setDetail] = useState("トークセッションと参加者同士の交流会");
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, detail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `エラー (${res.status})`);
      setUrl(`${window.location.origin}/e/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "通信に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <main className="container">
      <header className="header">
        <h1>🎪 イベントURLを作成</h1>
        <p>参加者に配る共有リンクを発行します</p>
      </header>

      {!url ? (
        <section className="step-card">
          <div className="field">
            <label>イベント名</label>
            <input
              type="text"
              value={name}
              placeholder="例: noteのイベント(那須開催)"
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="field">
            <label>内容</label>
            <textarea
              value={detail}
              placeholder="例: トークセッションと参加者同士の交流会"
              onChange={(e) => setDetail(e.target.value)}
            />
          </div>
          <div className="nav">
            <button
              className="btn-primary"
              disabled={busy || !name.trim() || !detail.trim()}
              onClick={create}
            >
              {busy ? "作成中…" : "共有URLを発行する"}
            </button>
          </div>
          {error && <div className="error-box">{error}</div>}
        </section>
      ) : (
        <section className="step-card">
          <h2>✅ 共有URLができました</h2>
          <p className="step-hint">
            このURLを参加者に配ってください。開いた人はそれぞれ自分の準備キットを作れます。
          </p>
          <div className="share-box">{url}</div>
          <div className="nav">
            <button className="btn-primary" onClick={copy}>
              {copied ? "コピーしました!" : "URLをコピー"}
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
