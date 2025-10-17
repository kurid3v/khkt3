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
  title: "AVinci",
  description: "AVinci: Nền tảng học tập và sáng tạo được hỗ trợ bởi AI, giúp giáo viên giao bài và học sinh nhận phản hồi tức thì.",
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