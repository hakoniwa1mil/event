// 自己紹介カードをSNS投稿用の1枚画像にする。ブラウザ側で実行
// 高さはコンテンツ量に応じて動的に決定し、どのセクションも欠けずに収まるようにする

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

const W = 1080;
const PAD = 80;
const FONT =
  '"Hiragino Kaku Gothic ProN", "Hiragino Sans", "Noto Sans JP", sans-serif';

const ACCENT = "#2cb696";
const ACCENT_DARK = "#219a7e";
const ACCENT_PALE = "#e6f7f2";
const INK = "#222222";
const INK_SOFT = "#666666";
const BG = "#fafaf8";

// 日本語は単語区切りがないので1文字ずつ折り返す
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

export async function renderShareImage(data: ShareImageData): Promise<string> {
  // 計測用の仮キャンバス (幅だけ合わせればフォントの折り返し計算はできる)
  const measureCanvas = document.createElement("canvas");
  measureCanvas.width = W;
  const mctx = measureCanvas.getContext("2d")!;
  const contentW = W - PAD * 2;

  mctx.font = `800 58px ${FONT}`;
  const titleLines = wrapText(mctx, data.purposeTitle, contentW, 6);

  const sections: { label: string; text: string }[] = [
    { label: "🔥 最近の挑戦", text: data.challengeLine },
    { label: "💭 最近もやもやしていること", text: data.overthinkLine },
    { label: "🙋 聞いてみたいこと", text: data.questionLine },
  ];
  mctx.font = `500 38px ${FONT}`;
  const sectionLines = sections.map((sec) => wrapText(mctx, sec.text, contentW, 5));

  // ---- 高さを積み上げて計算する ----
  const iconSize = 130;
  let y = PAD + 14; // top帯 + 余白
  y += 84; // イベント名行
  y += iconSize + 72; // プロフィール行
  y += titleLines.length * 82 + 48; // タイトル
  sections.forEach((_, i) => {
    y += 40 + 54; // 区切り線+ラベル
    y += sectionLines[i].length * 58 + 28; // 本文
  });
  const H = y + 150; // フッター分の余白を確保

  // ---- 本描画 ----
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = ACCENT;
  ctx.fillRect(0, 0, W, 14);

  let cy = PAD + 14;

  ctx.fillStyle = INK_SOFT;
  ctx.font = `600 30px ${FONT}`;
  ctx.fillText(`🌱 ${data.eventName}`, PAD, cy + 30);
  cy += 84;

  if (data.icon) {
    try {
      const img = await loadImage(data.icon);
      ctx.save();
      ctx.beginPath();
      ctx.arc(PAD + iconSize / 2, cy + iconSize / 2, iconSize / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, PAD, cy, iconSize, iconSize);
      ctx.restore();
    } catch {
      /* アイコン読込失敗は無視 */
    }
  } else {
    ctx.fillStyle = ACCENT_PALE;
    ctx.beginPath();
    ctx.arc(PAD + iconSize / 2, cy + iconSize / 2, iconSize / 2, 0, Math.PI * 2);
    ctx.fill();
  }
  const textX = PAD + iconSize + 36;
  ctx.fillStyle = INK;
  ctx.font = `700 50px ${FONT}`;
  ctx.fillText(data.xName, textX, cy + 58);
  ctx.fillStyle = INK_SOFT;
  ctx.font = `400 34px ${FONT}`;
  ctx.fillText(`@${data.xId}`, textX, cy + 108);
  cy += iconSize + 72;

  ctx.fillStyle = ACCENT_DARK;
  ctx.font = `800 58px ${FONT}`;
  for (const line of titleLines) {
    ctx.fillText(line, PAD, cy + 58);
    cy += 82;
  }
  cy += 48;

  sections.forEach((sec, i) => {
    ctx.strokeStyle = "#e5e5e0";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(PAD, cy);
    ctx.lineTo(W - PAD, cy);
    ctx.stroke();
    cy += 40;

    ctx.fillStyle = ACCENT_DARK;
    ctx.font = `700 30px ${FONT}`;
    ctx.fillText(sec.label, PAD, cy + 30);
    cy += 54;

    ctx.fillStyle = INK;
    ctx.font = `500 38px ${FONT}`;
    for (const line of sectionLines[i]) {
      ctx.fillText(line, PAD, cy + 38);
      cy += 58;
    }
    cy += 28;
  });

  ctx.fillStyle = INK_SOFT;
  ctx.font = `400 26px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText("たねまき — イベントで最大の収穫を得よう", W / 2, H - 52);
  ctx.textAlign = "left";

  return canvas.toDataURL("image/png");
}
