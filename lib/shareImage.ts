// 自己紹介カードを、日本の官製はがきサイズ(100mm×148mm・300dpi)で1枚画像にする。ブラウザ側で実行
// 文章量に応じて全体のスケールを自動調整し、はがきいっぱいにきれいに収まるようにする

export interface ShareImageData {
  eventName: string;
  xName: string;
  xId: string;
  icon: string | null; // data URL
  purposeTitle: string;
  challengeLine: string;
  overthinkLine: string;
  questionLine: string;
}

// はがき: 100mm × 148mm を 300dpi で出力
const W = 1181;
const H = 1748;

const FONT =
  '"Hiragino Kaku Gothic ProN", "Hiragino Sans", "Noto Sans JP", sans-serif';

const ACCENT = "#2cb696";
const ACCENT_DARK = "#219a7e";
const ACCENT_PALE = "#e6f7f2";
const INK = "#222222";
const INK_SOFT = "#666666";
const BG = "#fafaf8";

const MIN_SCALE = 0.5;

// 基準サイズ (以前のSNS用画像 幅1080px設計) を、はがき幅に合わせて拡大した基準値
const K0 = W / 1080;

interface Metrics {
  pad: number;
  barGap: number;
  eventFont: number;
  eventGap: number;
  icon: number;
  nameGap: number;
  nameFont: number;
  nameOffset: number;
  idFont: number;
  idOffset: number;
  profileGap: number;
  titleFont: number;
  titleLineH: number;
  titleGap: number;
  dividerGap: number;
  labelFont: number;
  labelBlockH: number;
  bodyFont: number;
  bodyLineH: number;
  trailingGap: number;
  footerFont: number;
  footerBand: number;
  footerMargin: number;
}

function metrics(k: number): Metrics {
  return {
    pad: 80 * k,
    barGap: 14 * k,
    eventFont: 30 * k,
    eventGap: 84 * k,
    icon: 130 * k,
    nameGap: 36 * k,
    nameFont: 50 * k,
    nameOffset: 58 * k,
    idFont: 34 * k,
    idOffset: 108 * k,
    profileGap: 72 * k,
    titleFont: 58 * k,
    titleLineH: 82 * k,
    titleGap: 48 * k,
    dividerGap: 40 * k,
    labelFont: 30 * k,
    labelBlockH: 54 * k,
    bodyFont: 38 * k,
    bodyLineH: 58 * k,
    trailingGap: 28 * k,
    footerFont: 26 * k,
    footerBand: 150 * k,
    footerMargin: 52 * k,
  };
}

// 行頭に来てはいけない文字 (句読点・閉じ括弧・小書き文字など)
const NO_LINE_START =
  "、。，．・：；？！゛゜ヽヾゝゞ々ー）］｝」』】〉》〕｣ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮ,.:;?!)]}」』";
// 行末に来てはいけない文字 (始め括弧など)
const NO_LINE_END = "（［｛「『【〈《〔｢([{";

// 日本語は単語区切りがないので1文字ずつ折り返すが、句読点や括弧が行頭・行末で
// 不自然に孤立しないよう簡易的な禁則処理を行う
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const lines: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const ch of para) {
      if (ctx.measureText(line + ch).width > maxWidth && line.length > 0) {
        // 行末が始め括弧などで終わる場合は、次の行の先頭に送る (行末禁則)
        if (NO_LINE_END.includes(line[line.length - 1])) {
          const carried = line.slice(-1);
          lines.push(line.slice(0, -1));
          line = carried + ch;
          continue;
        }
        // 次の文字が句読点・閉じ括弧などの行頭禁止文字なら、はみ出しても現在行に含める
        if (NO_LINE_START.includes(ch)) {
          line += ch;
          continue;
        }
        lines.push(line);
        line = ch;
      } else {
        line += ch;
      }
    }
    lines.push(line);
  }
  if (lines.length > maxLines) {
    const cut = lines.slice(0, maxLines);
    cut[maxLines - 1] = cut[maxLines - 1].replace(/.{1}$/, "") + "…";
    return cut;
  }
  return lines;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

interface Layout {
  titleLines: string[];
  sectionLines: string[][];
  contentHeight: number; // イベント名行〜最後のセクションまでの高さ (topOffset・フッター分は含まない)
}

function computeLayout(
  ctx: CanvasRenderingContext2D,
  data: ShareImageData,
  sections: { label: string; text: string }[],
  m: Metrics
): Layout {
  const contentW = W - m.pad * 2;

  ctx.font = `800 ${m.titleFont}px ${FONT}`;
  const titleLines = wrapText(ctx, data.purposeTitle, contentW, 6);

  ctx.font = `500 ${m.bodyFont}px ${FONT}`;
  const sectionLines = sections.map((sec) => wrapText(ctx, sec.text, contentW, 5));

  let h = m.eventGap; // イベント名行
  h += m.icon + m.profileGap; // プロフィール行
  h += titleLines.length * m.titleLineH + m.titleGap; // タイトル
  sections.forEach((_, i) => {
    h += m.dividerGap + m.labelBlockH;
    h += sectionLines[i].length * m.bodyLineH + m.trailingGap;
  });

  return { titleLines, sectionLines, contentHeight: h };
}

export async function renderShareImage(data: ShareImageData): Promise<string> {
  const measureCanvas = document.createElement("canvas");
  measureCanvas.width = W;
  const mctx = measureCanvas.getContext("2d")!;

  const sections: { label: string; text: string }[] = [
    { label: "🔥 最近の挑戦", text: data.challengeLine },
    { label: "💭 最近もやもやしていること", text: data.overthinkLine },
    { label: "🙋 聞いてみたいこと", text: data.questionLine },
  ];

  // 1段目: 基準スケールで組んでみる
  let k = K0;
  let m = metrics(k);
  let layout = computeLayout(mctx, data, sections, m);
  let topMin = m.pad + m.barGap;
  let available = H - m.footerBand;

  // はみ出す場合だけ、全体を縮小して収まるスケールに引き直す
  if (topMin + layout.contentHeight > available) {
    const shrink = Math.max(
      MIN_SCALE,
      (available - topMin) / layout.contentHeight
    );
    k = K0 * shrink;
    m = metrics(k);
    layout = computeLayout(mctx, data, sections, m);
    topMin = m.pad + m.barGap;
    available = H - m.footerBand;
  }

  // 余裕があれば縦方向中央に配置する
  const slack = Math.max(0, available - topMin - layout.contentHeight);
  const startY = topMin + slack / 2;

  // ---- 本描画 ----
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = ACCENT;
  ctx.fillRect(0, 0, W, m.barGap);

  let cy = startY;

  ctx.fillStyle = INK_SOFT;
  ctx.font = `600 ${m.eventFont}px ${FONT}`;
  ctx.fillText(`🌱 ${data.eventName}`, m.pad, cy + m.eventFont);
  cy += m.eventGap;

  if (data.icon) {
    try {
      const img = await loadImage(data.icon);
      ctx.save();
      ctx.beginPath();
      ctx.arc(m.pad + m.icon / 2, cy + m.icon / 2, m.icon / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, m.pad, cy, m.icon, m.icon);
      ctx.restore();
    } catch {
      /* アイコン読込失敗は無視 */
    }
  } else {
    ctx.fillStyle = ACCENT_PALE;
    ctx.beginPath();
    ctx.arc(m.pad + m.icon / 2, cy + m.icon / 2, m.icon / 2, 0, Math.PI * 2);
    ctx.fill();
  }
  const textX = m.pad + m.icon + m.nameGap;
  ctx.fillStyle = INK;
  ctx.font = `700 ${m.nameFont}px ${FONT}`;
  ctx.fillText(data.xName, textX, cy + m.nameOffset);
  ctx.fillStyle = INK_SOFT;
  ctx.font = `400 ${m.idFont}px ${FONT}`;
  ctx.fillText(`@${data.xId}`, textX, cy + m.idOffset);
  cy += m.icon + m.profileGap;

  ctx.fillStyle = ACCENT_DARK;
  ctx.font = `800 ${m.titleFont}px ${FONT}`;
  for (const line of layout.titleLines) {
    ctx.fillText(line, m.pad, cy + m.titleFont);
    cy += m.titleLineH;
  }
  cy += m.titleGap;

  sections.forEach((sec, i) => {
    ctx.strokeStyle = "#e5e5e0";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(m.pad, cy);
    ctx.lineTo(W - m.pad, cy);
    ctx.stroke();
    cy += m.dividerGap;

    ctx.fillStyle = ACCENT_DARK;
    ctx.font = `700 ${m.labelFont}px ${FONT}`;
    ctx.fillText(sec.label, m.pad, cy + m.labelFont);
    cy += m.labelBlockH;

    ctx.fillStyle = INK;
    ctx.font = `500 ${m.bodyFont}px ${FONT}`;
    for (const line of layout.sectionLines[i]) {
      ctx.fillText(line, m.pad, cy + m.bodyFont);
      cy += m.bodyLineH;
    }
    cy += m.trailingGap;
  });

  ctx.fillStyle = INK_SOFT;
  ctx.font = `400 ${m.footerFont}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText("たねまき — イベントで最大の収穫を得よう", W / 2, H - m.footerMargin);
  ctx.textAlign = "left";

  return canvas.toDataURL("image/png");
}
