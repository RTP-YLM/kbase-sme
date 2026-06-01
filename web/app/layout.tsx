import type { Metadata } from "next";
import { Sarabun } from "next/font/google";
import "./globals.css";

// D3: Thai-only — ใช้ Sarabun font หลัก
const sarabun = Sarabun({
  weight: ["400", "500", "600", "700"],
  subsets: ["thai", "latin"],
  variable: "--font-sarabun",
  display: "swap",
});

export const metadata: Metadata = {
  title: "KbaseSME — ผู้ช่วย AI ความรู้องค์กร",
  description: "ระบบถามตอบจากเอกสารบริษัท ด้วย AI ภาษาไทย",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${sarabun.variable} h-full`}>
      <body className="min-h-full bg-gray-50 font-sans antialiased">{children}</body>
    </html>
  );
}
