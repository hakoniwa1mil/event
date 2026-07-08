import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "たねまき ~イベントで最大の収穫を得よう @9ji2neru~",
  description:
    "質問に答えるだけで、あなた専用の自己紹介カードが完成するイベント事前準備ツール「たねまき」",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
