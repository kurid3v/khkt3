import React from 'react';
import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { SessionProvider } from "@/context/SessionContext"; // Updated import
import { DataProvider } from "@/context/DataContext";
import "@/styles/globals.css";


const inter = Inter({ 
  subsets: ["latin"],
  variable: '--font-inter',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ['700', '800'],
  variable: '--font-plus-jakarta-sans',
})

export const metadata: Metadata = {
  title: "Lớp học Văn AI",
  description: "Một ứng dụng web dành cho giáo viên để tạo bài tập làm văn và cho học sinh nộp bài, nhận điểm và phản hồi được hỗ trợ bởi AI. Có bảng xếp hạng và lịch sử nộp bài.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${inter.variable} ${plusJakartaSans.variable}`}>
      <body className="font-sans">
        <SessionProvider> {/* Updated Provider */}
          <DataProvider>{children}</DataProvider>
        </SessionProvider>
      </body>
    </html>
  );
}