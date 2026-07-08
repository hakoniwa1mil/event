"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import type { PrepInput, PrepResult } from "../../api/generate/route";
import { renderShareImage } from "@/lib/shareImage";

const emptyInput: PrepInput = {
  xName: "",
  xId: "",
  fromWhere: "",
  challenge: "",
  overthink: "",
  askWho: "",
  askWhat: "",
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
      { key: "xName", label: "Xの名前", placeholder: "例: くじにねる" },
      { key: "xId", label: "X ID (@は不要)", placeholder: "例: 9ji2neru" },
    ],
  },
  {
    label: "STEP 2 / 6",
    title: "どこから来ますか?",
    hint: "県名や街の名前でOK。遠くから来るほど良いネタになります",
    fields: [
      { key: "fromWhere", placeholder: "例: 山口" },
    ],
  },
  {
    label: "STEP 3 / 6",
    title: "最近やった「新しい挑戦」は?",
    hint: "人に驚かれたこと・笑われたことでもOK。小さなことで大丈夫です",
    fields: [
      {
        key: "challenge",
        placeholder: "例: フェリーの中で一人ハッカソンに挑戦した",
        multiline: true,
      },
    ],
  },
  {
    label: "STEP 4 / 6",
    title: "いま「AかBか」で決めきれていないことは?",
    hint: "「復職か起業か」「続けるかやめるか」のような二択で書くと簡単です。決めきれていないこと=このイベントで持ち帰るべき収穫の種。ここからカードのタイトルを導きます",
    fields: [
      {
        key: "overthink",
        placeholder: "例: 安定した復職か、自分の事業への飛び込みか",
        multiline: true,
      },
    ],
  },
  {
    label: "STEP 5 / 6",
    title: "「この人にこれを聞いてみたい!」はありますか?",
    hint: "登壇者でも「こんな活動をしている人」でもOK",
    fields: [
      {
        key: "askWho",
        label: "誰に",
        placeholder: "例: たくろうさん、登壇者の方",
      },
      {
        key: "askWhat",
        label: "何を聞きたい?",
        placeholder: "例: 受託ビジネスで顧客にイラっとすることはありますか?",
        multiline: true,
      },
    ],
  },
  {
    label: "STEP 6 / 6",
    title: "AIにあなたのことを聞いてみよう(任意)",
    hint: "普段使っているAI (ChatGPT・Claude・Geminiなど) に下の指示文を送り、返ってきた回答を貼り付けてください。あなたのことを知っているAIの分析が入ると、カードのタイトルが格段に濃くなります。スキップしてもOK",
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
        if (data.result?.purposeTitle) {
          // 旧フォーマットの保存結果はスキップ (新カード形式のみ復元)
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
  })に参加します。この交流会で「自分の人生を前に進める収穫」を一つ持ち帰りたいです。これまでの私とのやり取りや記憶をふまえて、次の4点を各1〜2文で簡潔に教えてください。
(1) 私が本当に達成したい最大の目標
(2) その目標に対して、今の私が引っかかっている矛盾や遠回り
(3) このイベントで私が「決めるべきこと」や「いったん手放すべきこと」
(4) 初対面の人に驚かれそうな、私のエピソードや行動
※回答には、実名・住所・勤務先・具体的な人名など、個人を特定できる情報は含めないでください。`;

  const [copiedAi, setCopiedAi] = useState(false);
  const copyAiInstruction = async () => {
    await navigator.clipboard.writeText(aiInstruction);
    setCopiedAi(true);
    setTimeout(() => setCopiedAi(false), 1500);
  };

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

  const makeImage = async () => {
    if (!result || !event) return;
    setMakingImg(true);
    try {
      const url = await renderShareImage({
        eventName: event.name,
        xName: input.xName,
        xId: input.xId,
        icon,
        purposeTitle: result.purposeTitle,
        challengeLine: result.challengeLine,
        overthinkLine: result.overthinkLine,
        questionLine: result.questionLine,
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

            {currentStep.optional && (
              <div className="ai-box">
                <p className="ai-box-label">📋 AIに送る指示文</p>
                <p className="ai-box-text">{aiInstruction}</p>
                <button className="btn-primary small" onClick={copyAiInstruction}>
                  {copiedAi ? "コピーしました!" : "指示文をコピー"}
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
                  ✨ 自己紹介カードを生成する
                </button>
              )}
            </div>
            {error && <div className="error-box">{error}</div>}
          </section>

          <p className="privacy-note">
            🔒 入力内容はカード生成のためにAnthropic (Claude API)
            へ送信されます。API経由のデータがAIの学習に使われることはありません。入力と生成結果はこのイベントのデータベースに保存されます。実名や住所などの個人情報は書かないでください。
          </p>
        </>
      )}

      {phase === "loading" && (
        <div className="loading">
          <div className="spinner" />
          <p>あなたの自己紹介カードを作成中…</p>
          <p className="step-hint">30秒ほどかかることがあります</p>
        </div>
      )}

      {phase === "result" && result && (
        <>
          <p className="step-hint" style={{ textAlign: "center", marginBottom: 12 }}>
            ✏️ をタップすると自分の言葉に編集できます
          </p>

          <div className="intro-card">
            {/* ① プロフィール */}
            <div className="profile-card intro-profile">
              {icon && (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="profile-icon" src={icon} alt="" />
              )}
              <div>
                <p className="profile-name">{input.xName}</p>
                <p className="profile-id">@{input.xId}</p>
              </div>
            </div>

            {/* ② 目的タイトル */}
            <div className="intro-title">
              <Editable
                big
                text={result.purposeTitle}
                onSave={(v) => patchResult((r) => (r.purposeTitle = v))}
              />
            </div>

            {/* ③ 挑戦 */}
            <div className="intro-line">
              <p className="intro-label">🔥 最近の挑戦</p>
              <Editable
                text={result.challengeLine}
                onSave={(v) => patchResult((r) => (r.challengeLine = v))}
              />
            </div>

            {/* ④ ふと考えること */}
            <div className="intro-line">
              <p className="intro-label">💭 ふとした瞬間に</p>
              <Editable
                text={result.overthinkLine}
                onSave={(v) => patchResult((r) => (r.overthinkLine = v))}
              />
            </div>

            {/* ⑤ 聞いてみたいこと */}
            <div className="intro-line">
              <p className="intro-label">🙋 聞いてみたいこと</p>
              <Editable
                text={result.questionLine}
                onSave={(v) => patchResult((r) => (r.questionLine = v))}
              />
            </div>
          </div>

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
                <p className="step-hint">スマホは画像を長押しで保存できます</p>
                <div className="nav">
                  <a
                    className="btn-primary btn-link"
                    style={{ flex: 1 }}
                    href={shareImg}
                    download="event-prep-card.png"
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
