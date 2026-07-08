import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "気ぃあえ ~Kikkakeから気が合うように~",
  description:
    "質問に答えるだけで、あなた専用の自己紹介カードが完成するイベント事前準備ツール「気ぃあえ」",
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
