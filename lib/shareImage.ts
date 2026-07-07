// 生成結果をSNS投稿用の1枚画像 (1080x1350) にまとめる。ブラウザ側で実行

export interface ShareImageData {
  eventName: string;
  xName: string;
  xId: string;
  icon: string | null; // data URL
  hook: string;
  takeawayStatement: string;
  takeawayNote: string;
  selfIntro: string;
}

const W = 1080;
const H = 1350;
const PAD = 72;
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

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
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
  // 上部アクセントバー
  ctx.fillStyle = ACCENT;
  ctx.fillRect(0, 0, W, 14);

  let y = PAD + 14;
  const contentW = W - PAD * 2;

  // イベント名
  ctx.fillStyle = INK_SOFT;
  ctx.font = `600 30px ${FONT}`;
  ctx.fillText(`🎒 ${data.eventName}`, PAD, y + 30);
  y += 76;

  // プロフィール行
  const iconSize = 120;
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
  const textX = PAD + iconSize + 32;
  ctx.fillStyle = INK;
  ctx.font = `700 46px ${FONT}`;
  ctx.fillText(data.xName, textX, y + 52);
  ctx.fillStyle = INK_SOFT;
  ctx.font = `400 32px ${FONT}`;
  ctx.fillText(`@${data.xId}`, textX, y + 100);
  y += iconSize + 56;

  // キャッチフレーズ
  ctx.fillStyle = ACCENT_DARK;
  ctx.font = `700 54px ${FONT}`;
  for (const line of wrapText(ctx, data.hook, contentW, 2)) {
    ctx.fillText(line, PAD, y + 54);
    y += 72;
  }
  y += 36;

  // 持ち帰ること (ボックス)
  ctx.font = `700 44px ${FONT}`;
  const stLines = wrapText(ctx, data.takeawayStatement, contentW - 80, 3);
  ctx.font = `400 30px ${FONT}`;
  const noteLines = wrapText(ctx, data.takeawayNote, contentW - 80, 3);
  const boxH = 60 + stLines.length * 62 + 16 + noteLines.length * 44 + 40;

  ctx.fillStyle = ACCENT_PALE;
  roundRect(ctx, PAD, y, contentW, boxH, 24);
  ctx.fill();
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 3;
  roundRect(ctx, PAD, y, contentW, boxH, 24);
  ctx.stroke();

  let by = y + 60;
  ctx.fillStyle = ACCENT_DARK;
  ctx.font = `700 30px ${FONT}`;
  ctx.fillText("🎯 このイベントで持ち帰ること", PAD + 40, by);
  by += 62;
  ctx.fillStyle = INK;
  ctx.font = `700 44px ${FONT}`;
  for (const line of stLines) {
    ctx.fillText(line, PAD + 40, by);
    by += 62;
  }
  by += 8;
  ctx.fillStyle = INK_SOFT;
  ctx.font = `400 30px ${FONT}`;
  for (const line of noteLines) {
    ctx.fillText(line, PAD + 40, by);
    by += 44;
  }
  y += boxH + 56;

  // 自己紹介
  ctx.fillStyle = ACCENT_DARK;
  ctx.font = `700 30px ${FONT}`;
  ctx.fillText("🎤 自己紹介", PAD, y + 30);
  y += 68;
  ctx.fillStyle = INK;
  ctx.font = `400 34px ${FONT}`;
  const maxIntroLines = Math.max(
    2,
    Math.floor((H - 120 - y) / 54) // フッター分を残して入るだけ
  );
  for (const line of wrapText(ctx, data.selfIntro, contentW, maxIntroLines)) {
    ctx.fillText(line, PAD, y + 34);
    y += 54;
  }

  // フッター
  ctx.fillStyle = INK_SOFT;
  ctx.font = `400 26px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText("イベント準備キット — 最大の収穫を得よう", W / 2, H - 48);
  ctx.textAlign = "left";

  return canvas.toDataURL("image/png");
}
