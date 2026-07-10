import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Care-Bridge AI",
  description: "병동 간호사 인수인계 자동 요약 및 환자 위험도 스크리닝 시스템",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  );
}
