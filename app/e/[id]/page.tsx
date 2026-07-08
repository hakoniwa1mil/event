"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import type { PrepInput, PrepResult } from "../../api/generate/route";
import { renderShareImage } from "@/lib/shareImage";

const emptyInput: PrepInput = {
  xName: "",
  xId: "",
  fromWhere: "",
  mode: "ai",
  aiRaw: "",
  challenge: "",
  overthink: "",
  eventGoal: "",
  askSomething: "",
};

interface EventInfo {
  id: string;
  name: string;
  detail: string;
}

const STEP_COUNT = 3;

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

  const update = <K extends keyof PrepInput>(key: K, value: PrepInput[K]) => {
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
  })に参加します。これまでの私とのやり取りや記憶をふまえて、次の3点を深堀りして、各2〜3文で教えてください。
(1) 私が最近挑戦したこと(人に驚かれたこと・笑われたことでもOK。小さなことで構いません)
(2) 私が最近もやもやしていること(迷っていること・気になっていること・引っかかっていることなど)
(3) 私がこのイベントで得るべきこと(達成したい目標や持ち帰りたい知見)
※回答には、実名・住所・勤務先・具体的な人名など、個人を特定できる情報は含めないでください。`;

  const [copiedAi, setCopiedAi] = useState(false);
  const copyAiInstruction = async () => {
    await navigator.clipboard.writeText(aiInstruction);
    setCopiedAi(true);
    setTimeout(() => setCopiedAi(false), 1500);
  };

  const currentFilled =
    step === 0
      ? input.xName.trim().length > 0 && input.xId.trim().length > 0
      : step === 1
      ? input.mode === "ai"
        ? input.aiRaw.trim().length > 0
        : input.challenge.trim().length > 0 &&
          input.overthink.trim().length > 0 &&
          input.eventGoal.trim().length > 0
      : input.askSomething.trim().length > 0;

  const generate = async () => {
    if (!event) return;
    const hadResult = result !== null;
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
      // 「もう一度生成する」からの失敗時は、直前の結果を残したまま結果画面にとどまる
      setPhase(hadResult ? "result" : "form");
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
          <h1>🌱 たねまき</h1>
        </header>
        <div className="error-box">{eventError}</div>
      </main>
    );
  }

  return (
    <main className="container">
      <header className="header">
        <h1>🌱 たねまき</h1>
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
            {Array.from({ length: STEP_COUNT }).map((_, i) => (
              <span key={i} className={i <= step ? "done" : ""} />
            ))}
          </div>
          <section className="step-card">
            <span className="step-label">STEP {step + 1} / {STEP_COUNT}</span>

            {step === 0 && (
              <>
                <h2>あなたのプロフィール</h2>
                <p className="step-hint">
                  X (Twitter) の名前とIDを教えてください。アイコン・出発地は任意です(あると当日顔を覚えてもらいやすくなります)
                </p>
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
                <div className="field">
                  <label>Xの名前</label>
                  <input
                    type="text"
                    value={input.xName}
                    placeholder="例: くじにねる"
                    onChange={(e) => update("xName", e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>X ID (@は不要)</label>
                  <input
                    type="text"
                    value={input.xId}
                    placeholder="例: 9ji2neru"
                    onChange={(e) => update("xId", e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>出発地 (任意)</label>
                  <input
                    type="text"
                    value={input.fromWhere}
                    placeholder="例: 山口"
                    onChange={(e) => update("fromWhere", e.target.value)}
                  />
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <h2>最近の挑戦 & もやもや & 得るべきこと</h2>
                <p className="step-hint">
                  普段使っているAI (ChatGPT・Claude・Geminiなど)
                  に聞くと、自分で考えるより早く&深く言語化できます。AIを使わない場合は直接入力してください
                </p>

                <div className="mode-toggle">
                  <button
                    type="button"
                    className={input.mode === "ai" ? "mode-btn active" : "mode-btn"}
                    onClick={() => update("mode", "ai")}
                  >
                    🤖 AIに聞く
                  </button>
                  <button
                    type="button"
                    className={input.mode === "manual" ? "mode-btn active" : "mode-btn"}
                    onClick={() => update("mode", "manual")}
                  >
                    ✍️ 自分で入力
                  </button>
                </div>

                {input.mode === "ai" ? (
                  <>
                    <div className="ai-box">
                      <p className="ai-box-label">📋 AIに送る指示文</p>
                      <p className="ai-box-text">{aiInstruction}</p>
                      <button className="btn-primary small" onClick={copyAiInstruction}>
                        {copiedAi ? "コピーしました!" : "指示文をコピー"}
                      </button>
                    </div>
                    <div className="field">
                      <label>AIからの回答を貼り付け</label>
                      <textarea
                        value={input.aiRaw}
                        placeholder="AIの回答をここに貼り付けてください"
                        onChange={(e) => update("aiRaw", e.target.value)}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="field">
                      <label>最近やった新しい挑戦</label>
                      <textarea
                        value={input.challenge}
                        placeholder="例: フェリーの中で一人ハッカソンに挑戦した"
                        onChange={(e) => update("challenge", e.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label>最近もやもやしていること</label>
                      <textarea
                        value={input.overthink}
                        placeholder="例: 安定した復職か、自分の事業への飛び込みか、決めきれていない"
                        onChange={(e) => update("overthink", e.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label>このイベントで得るべきこと</label>
                      <textarea
                        value={input.eventGoal}
                        placeholder="例: 自分の事業を軌道に乗せるための、具体的な次の一歩"
                        onChange={(e) => update("eventGoal", e.target.value)}
                      />
                    </div>
                  </>
                )}
              </>
            )}

            {step === 2 && (
              <>
                <h2>みんなに聞いてみたいこと</h2>
                <p className="step-hint">
                  会場にいる誰にでも投げかけられる質問を1つ考えてください。当日の話しかけるきっかけになります
                </p>
                <div className="field">
                  <textarea
                    value={input.askSomething}
                    placeholder="例: 受託ビジネスで顧客にイラっとすることはありますか?"
                    onChange={(e) => update("askSomething", e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="nav">
              {step < STEP_COUNT - 1 ? (
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
              {step > 0 && (
                <button className="btn-ghost" onClick={() => setStep(step - 1)}>
                  戻る
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

          {error && <div className="error-box">{error}</div>}

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
              <p className="intro-label">💭 最近もやもやしていること</p>
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
                    download="tanemaki-card.png"
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
            <button className="btn-primary" onClick={generate}>
              🔁 もう一度生成する
            </button>
          </div>
        </>
      )}
    </main>
  );
}
