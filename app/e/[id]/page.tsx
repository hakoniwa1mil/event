"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import type { PrepInput, PrepResult } from "../../api/generate/route";
import { renderShareImage } from "@/lib/shareImage";

const emptyInput: PrepInput = {
  xName: "",
  xId: "",
  surprise: "",
  challenge: "",
  overthink: "",
  wantToAsk: "",
  aiSummary: "",
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
  optional?: boolean;
  fields: {
    key: keyof PrepInput;
    label?: string;
    placeholder: string;
    multiline?: boolean;
  }[];
}

const steps: Step[] = [
  {
    label: "STEP 1 / 6",
    title: "あなたのプロフィール",
    hint: "X (Twitter) の名前とIDを教えてください。アイコンもあると当日顔を覚えてもらいやすくなります",
    fields: [
      { key: "xName", label: "Xの名前", placeholder: "例: やまぐち太郎" },
      { key: "xId", label: "X ID (@は不要)", placeholder: "例: yamaguchi_taro" },
    ],
  },
  {
    label: "STEP 2 / 6",
    title: "最近した「ちょっと突拍子もないこと」は?",
    hint: "人に驚かれたこと・笑われたことなど、小さなことでOK。自己紹介のフックになります",
    fields: [
      {
        key: "surprise",
        placeholder: "例: イベントのために山口からフェリーで那須まで来た",
        multiline: true,
      },
    ],
  },
  {
    label: "STEP 3 / 6",
    title: "最近始めた「新しい挑戦」は?",
    hint: "いま続けていること・これからやることもOK。STEP 2が一度きりの出来事なら、こちらは続いている挑戦",
    fields: [
      {
        key: "challenge",
        placeholder: "例: 一人ハッカソンでアプリづくりを始めた",
        multiline: true,
      },
    ],
  },
  {
    label: "STEP 4 / 6",
    title: "ふとした瞬間に、つい考えすぎてしまうことは?",
    hint: "夜や移動中に頭でぐるぐるしてしまうこと。ここから「持ち帰るべき収穫」を導きます",
    fields: [
      {
        key: "overthink",
        placeholder: "例: このままの働き方でいいのか。発信を続けた先に何があるのか",
        multiline: true,
      },
    ],
  },
  {
    label: "STEP 5 / 6",
    title: "「この人にこれを聞いてみたい!」はありますか?",
    hint: "登壇者でも「こんな活動をしている人」でもOK。誰に・何を、をセットで書くと質問カードの精度が上がります",
    fields: [
      {
        key: "wantToAsk",
        placeholder: "例: 登壇者の◯◯さんに、発信を仕事につなげた最初の一歩を聞きたい",
        multiline: true,
      },
    ],
  },
  {
    label: "STEP 6 / 6",
    title: "AIにあなたのことを聞いてみよう(任意)",
    hint: "普段使っているAI (ChatGPT・Claude・Geminiなど) に下の指示文を送り、返ってきた回答を貼り付けてください。スキップしてもOK",
    optional: true,
    fields: [
      {
        key: "aiSummary",
        label: "AIからの回答",
        placeholder: "AIの回答をここに貼り付け(スキップ可)",
        multiline: true,
      },
    ],
  },
];

function Editable({
  text,
  onSave,
  big = false,
}: {
  text: string;
  onSave: (v: string) => void;
  big?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);

  if (!editing) {
    return (
      <div className="editable">
        <p className={big ? "big-text" : undefined}>{text}</p>
        <button
          className="edit-btn"
          onClick={() => {
            setDraft(text);
            setEditing(true);
          }}
        >
          ✏️
        </button>
      </div>
    );
  }
  return (
    <div className="editable editing">
      <textarea
        className="edit-area"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
      />
      <div className="edit-actions">
        <button className="btn-ghost small" onClick={() => setEditing(false)}>
          キャンセル
        </button>
        <button
          className="btn-primary small"
          onClick={() => {
            onSave(draft);
            setEditing(false);
          }}
        >
          保存
        </button>
      </div>
    </div>
  );
}

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
  const [shareImg, setShareImg] = useState<string | null>(null);
  const [makingImg, setMakingImg] = useState(false);
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
        if (data.result?.takeaway) {
          // 旧フォーマットの保存結果はスキップ (takeawayがあるもののみ復元)
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

  const aiInstruction = `私は${event?.name ?? "交流会イベント"}(${
    event?.detail ?? ""
  })に参加します。目的は「自分の人生を前に進める収穫を一つ得ること」です。これまでの私とのやり取りや記憶をふまえて、次の3点を各1〜2文で簡潔に教えてください。(1) 私が最近特に気にかけている・引っかかっていること (2) このイベントで得られると効きそうなこと (3) 私の強み、話すと面白がられそうな点。`;

  const currentStep = steps[step];
  const currentFilled =
    currentStep.optional ||
    currentStep.fields.some((f) => input[f.key].trim().length > 0);

  const generate = async () => {
    if (!event) return;
    setPhase("loading");
    setError(null);
    setWarning(null);
    setShareImg(null);
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

  // 手動編集: state更新 + localStorage + Supabase
  const patchResult = (mutate: (r: PrepResult) => void) => {
    setResult((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      mutate(next);
      persist({ result: next });
      if (participantId) {
        fetch(`/api/participants/${participantId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ result: next }),
        }).catch(() => {
          setWarning("編集内容のサーバー保存に失敗しました(端末には保存済み)");
        });
      }
      return next;
    });
  };

  const copy = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  const makeImage = async () => {
    if (!result || !event) return;
    setMakingImg(true);
    try {
      const url = await renderShareImage({
        eventName: event.name,
        xName: input.xName,
        xId: input.xId,
        icon,
        hook: result.hook,
        takeawayStatement: result.takeaway?.statement ?? "",
        takeawayNote: result.takeaway?.note ?? "",
        selfIntro: result.selfIntroShort,
      });
      setShareImg(url);
    } finally {
      setMakingImg(false);
    }
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
            <span className="step-label">{currentStep.label}</span>
            <h2>{currentStep.title}</h2>
            <p className="step-hint">{currentStep.hint}</p>

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

            {step === 5 && (
              <div className="ai-box">
                <p className="ai-box-label">📋 AIに送る指示文</p>
                <p className="ai-box-text">{aiInstruction}</p>
                <button
                  className="btn-primary small"
                  onClick={() => copy("ai", aiInstruction)}
                >
                  {copied === "ai" ? "コピーしました!" : "指示文をコピー"}
                </button>
              </div>
            )}

            {currentStep.fields.map((f) => (
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
            <h3>🎯 このイベントで必ず持ち帰ること</h3>
            <div className="result-card takeaway-card">
              <Editable
                big
                text={result.takeaway?.statement ?? ""}
                onSave={(v) => patchResult((r) => (r.takeaway.statement = v))}
              />
              <Editable
                text={result.takeaway?.note ?? ""}
                onSave={(v) => patchResult((r) => (r.takeaway.note = v))}
              />
            </div>
          </section>

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
            <div className="result-card hook-card">
              <Editable
                big
                text={result.hook}
                onSave={(v) => patchResult((r) => (r.hook = v))}
              />
            </div>
          </section>

          <section className="result-section">
            <h3>🎤 自己紹介(15秒)</h3>
            <div className="result-card">
              <button
                className="copy-btn"
                onClick={() => copy("intro", result.selfIntroShort)}
              >
                {copied === "intro" ? "コピーしました!" : "コピー"}
              </button>
              <Editable
                text={result.selfIntroShort}
                onSave={(v) => patchResult((r) => (r.selfIntroShort = v))}
              />
            </div>
          </section>

          <section className="result-section">
            <h3>🧭 答えを見つけたい問い</h3>
            {result.insights.map((ins, i) => (
              <div className="result-card" key={i}>
                <p className="q-label">Q{i + 1}.</p>
                <Editable
                  text={ins.question}
                  onSave={(v) => patchResult((r) => (r.insights[i].question = v))}
                />
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
                <Editable
                  text={card.question}
                  onSave={(v) =>
                    patchResult((r) => (r.questionCards[i].question = v))
                  }
                />
                <div className="q-opener">
                  <Editable
                    text={card.opener}
                    onSave={(v) =>
                      patchResult((r) => (r.questionCards[i].opener = v))
                    }
                  />
                </div>
              </div>
            ))}
          </section>

          <section className="result-section">
            <h3>🔥 直前に読み返すメッセージ</h3>
            <div className="result-card encouragement">
              <Editable
                text={result.encouragement}
                onSave={(v) => patchResult((r) => (r.encouragement = v))}
              />
            </div>
          </section>

          {warning && <div className="error-box">{warning}</div>}

          <section className="result-section">
            <h3>📸 SNS投稿用の画像</h3>
            {!shareImg ? (
              <button
                className="btn-primary"
                style={{ width: "100%" }}
                disabled={makingImg}
                onClick={makeImage}
              >
                {makingImg ? "作成中…" : "画像を作成する"}
              </button>
            ) : (
              <div className="share-preview">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={shareImg} alt="SNS投稿用画像" />
                <p className="step-hint">
                  スマホは画像を長押しで保存できます
                </p>
                <div className="nav">
                  <a
                    className="btn-primary btn-link"
                    style={{ flex: 1 }}
                    href={shareImg}
                    download="event-prep.png"
                  >
                    画像をダウンロード
                  </a>
                  <button className="btn-ghost" onClick={makeImage}>
                    作り直す
                  </button>
                </div>
              </div>
            )}
          </section>

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
