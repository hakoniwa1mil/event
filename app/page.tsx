"use client";

import { useEffect, useState } from "react";
import type { PrepInput, PrepResult } from "./api/generate/route";

const STORAGE_KEY = "event-prep-v1";

const emptyInput: PrepInput = {
  name: "",
  eventName: "",
  eventDetail: "トークセッションと参加者同士の交流会",
  working: "",
  started: "",
  struggle: "",
  wantToAsk: "",
};

interface Step {
  label: string;
  title: string;
  hint: string;
  fields: {
    key: keyof PrepInput;
    label?: string;
    placeholder: string;
    multiline?: boolean;
  }[];
}

const steps: Step[] = [
  {
    label: "STEP 1 / 5",
    title: "どんなイベントに参加しますか?",
    hint: "イベント名と内容を教えてください",
    fields: [
      {
        key: "eventName",
        label: "イベント名",
        placeholder: "例: noteのイベント(那須開催)",
      },
      {
        key: "eventDetail",
        label: "内容",
        placeholder: "例: トークセッションと参加者同士の交流会",
        multiline: true,
      },
    ],
  },
  {
    label: "STEP 2 / 5",
    title: "あなたのことを教えてください",
    hint: "名前(ニックネームOK)と、普段やっていること・肩書きなど",
    fields: [
      {
        key: "name",
        placeholder: "例: 山口在住の◯◯です。会社員をしながらnoteで発信しています",
        multiline: true,
      },
    ],
  },
  {
    label: "STEP 3 / 5",
    title: "今、頑張っていることは?",
    hint: "仕事でも趣味でも発信でも。熱を持って取り組んでいることを書いてください",
    fields: [
      {
        key: "working",
        placeholder: "例: noteで週1本の執筆を続けている。フォロワーを増やしたい…",
        multiline: true,
      },
    ],
  },
  {
    label: "STEP 4 / 5",
    title: "新しく始めたこと・困っていることは?",
    hint: "最近の挑戦と、いま悩んでいること。ここが会話の種になります",
    fields: [
      {
        key: "started",
        label: "新しく始めたこと",
        placeholder: "例: 一人ハッカソンを始めた",
        multiline: true,
      },
      {
        key: "struggle",
        label: "困っていること・悩み",
        placeholder: "例: 発信のネタが続かない、仲間がいない…",
        multiline: true,
      },
    ],
  },
  {
    label: "STEP 5 / 5",
    title: "話しかけたい人・聞いてみたいことは?",
    hint: "登壇者への質問でも「こんな人と話したい」でもOK。思いつくまま書いてください",
    fields: [
      {
        key: "wantToAsk",
        placeholder:
          "例: 登壇者の◯◯さんに継続のコツを聞きたい。地方で活動している人と繋がりたい…",
        multiline: true,
      },
    ],
  },
];

export default function Home() {
  const [input, setInput] = useState<PrepInput>(emptyInput);
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<"form" | "loading" | "result">("form");
  const [result, setResult] = useState<PrepResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.input) setInput({ ...emptyInput, ...data.input });
        if (data.result) {
          setResult(data.result);
          setPhase("result");
        }
      }
    } catch {
      /* 保存データが壊れていたら初期状態から */
    }
  }, []);

  const save = (nextInput: PrepInput, nextResult: PrepResult | null) => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ input: nextInput, result: nextResult })
    );
  };

  const update = (key: keyof PrepInput, value: string) => {
    const next = { ...input, [key]: value };
    setInput(next);
    save(next, result);
  };

  const currentFilled = steps[step].fields.some(
    (f) => input[f.key].trim().length > 0
  );

  const generate = async () => {
    setPhase("loading");
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? `エラーが発生しました (${res.status})`);
      }
      setResult(data);
      save(input, data);
      setPhase("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "通信に失敗しました");
      setPhase("form");
    }
  };

  const copy = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  const restart = () => {
    setPhase("form");
    setStep(0);
  };

  return (
    <main className="container">
      <header className="header">
        <h1>🎒 イベント準備キット</h1>
        <p>参加するイベントで最大の収穫を得よう</p>
      </header>

      {phase === "form" && (
        <>
          <div className="progress">
            {steps.map((_, i) => (
              <span key={i} className={i <= step ? "done" : ""} />
            ))}
          </div>
          <section className="step-card">
            <span className="step-label">{steps[step].label}</span>
            <h2>{steps[step].title}</h2>
            <p className="step-hint">{steps[step].hint}</p>
            {steps[step].fields.map((f) => (
              <div className="field" key={f.key}>
                {f.label && <label>{f.label}</label>}
                {f.multiline ? (
                  <textarea
                    value={input[f.key]}
                    placeholder={f.placeholder}
                    onChange={(e) => update(f.key, e.target.value)}
                  />
                ) : (
                  <input
                    type="text"
                    value={input[f.key]}
                    placeholder={f.placeholder}
                    onChange={(e) => update(f.key, e.target.value)}
                  />
                )}
              </div>
            ))}
            <div className="nav">
              {step > 0 && (
                <button className="btn-ghost" onClick={() => setStep(step - 1)}>
                  戻る
                </button>
              )}
              {step < steps.length - 1 ? (
                <button
                  className="btn-primary"
                  disabled={!currentFilled}
                  onClick={() => setStep(step + 1)}
                >
                  次へ
                </button>
              ) : (
                <button
                  className="btn-primary"
                  disabled={!currentFilled}
                  onClick={generate}
                >
                  ✨ 準備キットを生成する
                </button>
              )}
            </div>
            {error && <div className="error-box">{error}</div>}
          </section>
        </>
      )}

      {phase === "loading" && (
        <div className="loading">
          <div className="spinner" />
          <p>あなた専用の準備キットを作成中…</p>
          <p className="step-hint">30秒ほどかかることがあります</p>
        </div>
      )}

      {phase === "result" && result && (
        <>
          <section className="result-section">
            <h3>🏷 あなたのキャッチフレーズ</h3>
            <div className="result-card hook-card">{result.hook}</div>
          </section>

          <section className="result-section">
            <h3>🎤 自己紹介(15秒版)</h3>
            <div className="result-card">
              <button
                className="copy-btn"
                onClick={() => copy("short", result.selfIntroShort)}
              >
                {copied === "short" ? "コピーしました!" : "コピー"}
              </button>
              <p>{result.selfIntroShort}</p>
            </div>
          </section>

          <section className="result-section">
            <h3>🎤 自己紹介(1分版)</h3>
            <div className="result-card">
              <button
                className="copy-btn"
                onClick={() => copy("long", result.selfIntroLong)}
              >
                {copied === "long" ? "コピーしました!" : "コピー"}
              </button>
              <p>{result.selfIntroLong}</p>
            </div>
          </section>

          <section className="result-section">
            <h3>🧭 このイベントで答えを見つけたい問い</h3>
            {result.insights.map((ins, i) => (
              <div className="result-card" key={i}>
                <p className="q-question">
                  Q{i + 1}. {ins.question}
                </p>
                <p className="insight-why">{ins.why}</p>
                <p className="insight-how">{ins.how}</p>
              </div>
            ))}
          </section>

          <section className="result-section">
            <h3>💬 質問カード — この一言から始めよう</h3>
            {result.questionCards.map((card, i) => (
              <div className="result-card" key={i}>
                <span className="q-target">{card.target}</span>
                <p className="q-question">{card.question}</p>
                <p className="q-opener">「{card.opener}」</p>
              </div>
            ))}
          </section>

          <section className="result-section">
            <h3>🔥 直前に読み返すメッセージ</h3>
            <div className="result-card encouragement">
              {result.encouragement}
            </div>
          </section>

          <div className="result-actions">
            <button className="btn-primary" onClick={restart}>
              入力を編集してもう一度生成する
            </button>
          </div>
        </>
      )}
    </main>
  );
}
