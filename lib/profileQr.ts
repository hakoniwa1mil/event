// Xプロフィールへ飛ぶQRコードを生成する。中央にアイコンを重ねた、従来のTwitterのQRコード風の見た目にする

import QRCode from "qrcode";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function renderProfileQr(
  xId: string,
  icon: string | null
): Promise<string> {
  const SIZE = 360;
  const url = `https://x.com/${encodeURIComponent(xId)}`;

  const canvas = document.createElement("canvas");
  // アイコンで中央を隠しても読み取れるよう、誤り訂正レベルを最高(H)にする
  await QRCode.toCanvas(canvas, url, {
    width: SIZE,
    margin: 1,
    errorCorrectionLevel: "H",
    color: { dark: "#222222", light: "#ffffff" },
  });

  if (icon) {
    const ctx = canvas.getContext("2d")!;
    const img = await loadImage(icon);
    const cx = SIZE / 2;
    const cy = SIZE / 2;
    const holeRadius = SIZE * 0.15;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, holeRadius + 8, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, holeRadius, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, cx - holeRadius, cy - holeRadius, holeRadius * 2, holeRadius * 2);
    ctx.restore();
  }

  return canvas.toDataURL("image/png");
}
