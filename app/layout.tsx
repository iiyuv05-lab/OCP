import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://ocp-reality-map-jiyoung.plum-tetra-3335.chatgpt.site"),
  title: "OCP — Work with context",
  description: "어디에서 일을 시작하든 필요한 맥락과 함께 이어가는 인간·AI 업무 운영 환경.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "OCP — Work with context",
    description: "Start anywhere. Continue with context. Finish through governed state.",
    type: "website",
    images: [{ url: "https://ocp-reality-map-jiyoung.plum-tetra-3335.chatgpt.site/og.png", width: 1731, height: 909, alt: "OCP Reality Map — Reality, observed." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "OCP — Work with context",
    description: "Start anywhere. Continue with context. Finish through governed state.",
    images: ["https://ocp-reality-map-jiyoung.plum-tetra-3335.chatgpt.site/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
