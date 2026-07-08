import Link from "next/link";

export default function Home() {
  return (
    <main className="container">
      <header className="header">
        <h1>🌱 たねまき</h1>
        <p>~イベントで最大の収穫を得よう @9ji2neru~</p>
      </header>

      <section className="step-card">
        <h2>参加者の方</h2>
        <p className="step-hint">
          主催者から共有されたイベントURL(<code>/e/…</code>
          で始まるリンク)を開いてください。質問に答えるだけで、あなた専用の自己紹介・問い・質問カードが完成します。
        </p>
      </section>

      <section className="step-card" style={{ marginTop: 16 }}>
        <h2>主催者の方</h2>
        <p className="step-hint">
          イベントを登録して、参加者に配る共有URLを発行できます。
        </p>
        <Link href="/create" className="btn-primary btn-link">
          イベントURLを作成する
        </Link>
      </section>
    </main>
  );
}
