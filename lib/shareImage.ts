// 自己紹介カードをSNS投稿用の1枚画像 (1080x1350) にする。ブラウザ側で実行

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
const H = 1350;
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
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // 背景
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = ACCENT;
  ctx.fillRect(0, 0, W, 14);

  let y = PAD + 14;
  const contentW = W - PAD * 2;

  // イベント名
  ctx.fillStyle = INK_SOFT;
  ctx.font = `600 30px ${FONT}`;
  ctx.fillText(`🎒 ${data.eventName}`, PAD, y + 30);
  y += 84;

  // プロフィール行
  const iconSize = 130;
  if (data.icon) {
    try {
      const img = await loadImage(data.icon);
      ctx.save();
      ctx.beginPath();
      ctx.arc(PAD + iconSize / 2, y + iconSize / 2, iconSize / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, PAD, y, iconSize, iconSize);
      ctx.restore();
    } catch {
      /* アイコン読込失敗は無視 */
    }
  } else {
    ctx.fillStyle = ACCENT_PALE;
    ctx.beginPath();
    ctx.arc(PAD + iconSize / 2, y + iconSize / 2, iconSize / 2, 0, Math.PI * 2);
    ctx.fill();
  }
  const textX = PAD + iconSize + 36;
  ctx.fillStyle = INK;
  ctx.font = `700 50px ${FONT}`;
  ctx.fillText(data.xName, textX, y + 58);
  ctx.fillStyle = INK_SOFT;
  ctx.font = `400 34px ${FONT}`;
  ctx.fillText(`@${data.xId}`, textX, y + 108);
  y += iconSize + 72;

  // ② 目的タイトル (メインビジュアル)
  ctx.fillStyle = ACCENT_DARK;
  ctx.font = `800 58px ${FONT}`;
  for (const line of wrapText(ctx, data.purposeTitle, contentW, 4)) {
    ctx.fillText(line, PAD, y + 58);
    y += 82;
  }
  y += 48;

  // ③④⑤ の各行
  const sections: { label: string; text: string }[] = [
    { label: "🔥 最近の挑戦", text: data.challengeLine },
    { label: "💭 ふとした瞬間に", text: data.overthinkLine },
    { label: "🙋 聞いてみたいこと", text: data.questionLine },
  ];

  // フッターと本文が被らないよう、本文の下限を確保する
  const CONTENT_BOTTOM = H - 150;

  for (const sec of sections) {
    if (y + 100 > CONTENT_BOTTOM) break; // 見出しすら入らないならセクションごと省略

    // 区切り線
    ctx.strokeStyle = "#e5e5e0";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(PAD, y);
    ctx.lineTo(W - PAD, y);
    ctx.stroke();
    y += 40;

    ctx.fillStyle = ACCENT_DARK;
    ctx.font = `700 30px ${FONT}`;
    ctx.fillText(sec.label, PAD, y + 30);
    y += 54;

    ctx.fillStyle = INK;
    ctx.font = `500 38px ${FONT}`;
    for (const line of wrapText(ctx, sec.text, contentW, 3)) {
      if (y + 58 > CONTENT_BOTTOM) break; // 下限を超える行は描かない
      ctx.fillText(line, PAD, y + 38);
      y += 58;
    }
    y += 28;
  }

  // フッター
  ctx.fillStyle = INK_SOFT;
  ctx.font = `400 26px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText("イベント準備キット — 最大の収穫を得よう", W / 2, H - 52);
  ctx.textAlign = "left";

  return canvas.toDataURL("image/png");
}
