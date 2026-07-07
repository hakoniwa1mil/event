"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import type { PrepInput, PrepResult } from "../../api/generate/route";

const emptyInput: PrepInput = {
  xName: "",
  xId: "",
  workingMain: "",
  workingFun: "",
  startedWhat: "",
  startedWhy: "",
  struggleWhat: "",
  struggleAsk: "",
  talkWho: "",
  talkAsk: "",
};

interface EventInfo {
  id: string;
  name: string;
  detail: string;
}

interface Step {
  label: string;
  title: string;
  hint: string;
  fields: {
    key: keyof PrepInput;
    label: string;
    placeholder: string;
    multiline?: boolean;
  }[];
}

const steps: Step[] = [
  {
    label: "STEP 1 / 5",
    title: "あなたのプロフィール",
    hint: "X (Twitter) の名前とIDを教えてください。アイコンもあると当日顔を覚えてもらいやすくなります",
    fields: [
      { key: "xName", label: "Xの名前", placeholder: "例: やまぐち太郎" },
      { key: "xId", label: "X ID (@は不要)", placeholder: "例: yamaguchi_taro" },
    ],
  },
  {
    label: "STEP 2 / 5",
    title: "いま頑張っていることは?",
    hint: "仕事でも趣味でも発信でもOK。2つに分けると書きやすいです",
    fields: [
      {
        key: "workingMain",
        label: "いちばん力を入れていること",
        placeholder: "例: noteで週1本の執筆を続けている",
        multiline: true,
      },
      {
        key: "workingFun",
        label: "その中で楽しいこと・手応えを感じること",
        placeholder: "例: 読者からコメントをもらえた時が嬉しい",
        multiline: true,
      },
    ],
  },
  {
    label: "STEP 3 / 5",
    title: "新しく始めたことは?",
    hint: "最近の挑戦を教えてください。きっかけは会話の種になります",
    fields: [
      {
        key: "startedWhat",
        label: "最近始めたこと",
        placeholder: "例: 一人ハッカソンを始めた",
        multiline: true,
      },
      {
        key: "startedWhy",
        label: "始めたきっかけ",
        placeholder: "例: アイデアを形にする力をつけたかった",
        multiline: true,
      },
    ],
  },
  {
    label: "STEP 4 / 5",
    title: "困っていることは?",
    hint: "悩みは最高の会話のきっかけです。正直に書くほど良い質問カードができます",
    fields: [
      {
        key: "struggleWhat",
        label: "いま困っていること・モヤモヤ",
        placeholder: "例: 発信を続けているが手応えがない",
        multiline: true,
      },
      {
        key: "struggleAsk",
        label: "経験者に聞けるなら、何を聞きたい?",
        placeholder: "例: 継続のモチベーションをどう保っているか",
        multiline: true,
      },
    ],
  },
  {
    label: "STEP 5 / 5",
    title: "誰と話したい? 何を聞きたい?",
    hint: "具体的な名前でも「こんな人」でもOK",
    fields: [
      {
        key: "talkWho",
        label: "話してみたい人",
        placeholder: "例: 登壇者の◯◯さん、地方で活動しているクリエイター",
        multiline: true,
      },
      {
        key: "talkAsk",
        label: "登壇者や参加者に聞いてみたいこと",
        placeholder: "例: 発信を仕事につなげた最初の一歩は何だったか",
        multiline: true,
      },
    ],
  },
];

export default function EventPrep() {
  const params = useParams<{ id: string }>();
  const eventId = params.id;
  const storageKey = `event-prep-${eventId}`;

  const [event, setEvent] = useState<EventInfo | null>(null);
  const [eventError, setEventError] = useState<string | null>(null);
  const [input, setInput] = useState<PrepInput>(emptyInput);
  const [icon, setIcon] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<"form" | "loading" | "result">("form");
  const [result, setResult] = useState<PrepResult | null>(null);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/events/${eventId}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "イベントの取得に失敗しました");
        setEvent(data);
      })
      .catch((e) => setEventError(e instanceof Error ? e.message : "通信に失敗しました"));

    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.input) setInput({ ...emptyInput, ...data.input });
        if (data.icon) setIcon(data.icon);
        if (data.participantId) setParticipantId(data.participantId);
        if (data.result) {
          setResult(data.result);
          setPhase("result");
        }
      }
    } catch {
      /* 保存データが壊れていたら初期状態から */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const persist = (patch: Record<string, unknown>) => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "{}");
      localStorage.setItem(storageKey, JSON.stringify({ ...saved, ...patch }));
    } catch {
      /* quota等で保存できなくても動作は継続 */
    }
  };

  const update = (key: keyof PrepInput, value: string) => {
    const next = { ...input, [key]: value };
    setInput(next);
    persist({ input: next });
  };

  const onIconSelected = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // 128pxの正方形に切り抜いてデータ量を抑える
        const size = 128;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d")!;
        const scale = Math.max(size / img.width, size / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        setIcon(dataUrl);
        persist({ icon: dataUrl });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const currentFilled = steps[step].fields.some(
    (f) => input[f.key].trim().length > 0
  );

  const generate = async () => {
    if (!event) return;
    setPhase("loading");
    setError(null);
    setWarning(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event.id,
          eventName: event.name,
          eventDetail: event.detail,
          participantId,
          icon,
          input,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? `エラーが発生しました (${res.status})`);
      }
      setResult(data.result);
      if (data.participantId) setParticipantId(data.participantId);
      if (data.saveWarning) setWarning(data.saveWarning);
      persist({ result: data.result, participantId: data.participantId });
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

  if (eventError) {
    return (
      <main className="container">
        <header className="header">
          <h1>🎒 イベント準備キット</h1>
        </header>
        <div className="error-box">{eventError}</div>
      </main>
    );
  }

  return (
    <main className="container">
      <header className="header">
        <h1>🎒 イベント準備キット</h1>
        {event ? (
          <p>
            {event.name} — {event.detail}
          </p>
        ) : (
          <p>イベント情報を読み込み中…</p>
        )}
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

            {step === 0 && (
              <div className="icon-upload">
                <button
                  type="button"
                  className="icon-preview"
                  onClick={() => fileRef.current?.click()}
                >
                  {icon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={icon} alt="アイコン" />
                  ) : (
                    <span>＋</span>
                  )}
                </button>
                <div>
                  <p className="icon-label">アイコン画像</p>
                  <p className="icon-hint">タップしてアップロード(任意)</p>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onIconSelected(f);
                  }}
                />
              </div>
            )}

            {steps[step].fields.map((f) => (
              <div className="field" key={f.key}>
                <label>{f.label}</label>
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
                  disabled={!currentFilled || !event}
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
            <div className="result-card profile-card">
              {icon && (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="profile-icon" src={icon} alt="" />
              )}
              <div>
                <p className="profile-name">{input.xName}</p>
                <p className="profile-id">@{input.xId}</p>
              </div>
            </div>
          </section>

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

          {warning && <div className="error-box">{warning}</div>}

          <div className="result-actions">
            <button
              className="btn-primary"
              onClick={() => {
                setPhase("form");
                setStep(0);
              }}
            >
              入力を編集してもう一度生成する
            </button>
          </div>
        </>
      )}
    </main>
  );
}
