import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "資産レビュー",
  description: "ローカルで資産を見直すダッシュボード",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-canvas text-ink">{children}</body>
    </html>
  );
}
