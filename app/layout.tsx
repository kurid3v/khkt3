// FIX: Add missing React import to resolve 'Cannot find namespace' error.
import React from 'react';
import type { Metadata } from "next";
import { DataProvider } from "@/context/DataContext";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "AI Literature Essay Grader",
  description: "A web application for teachers to create essay assignments and for students to submit and receive AI-powered grading and feedback. Features leaderboards and submission history.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-slate-50">
        <DataProvider>
          {children}
        </DataProvider>
      </body>
    </html>
  );
}