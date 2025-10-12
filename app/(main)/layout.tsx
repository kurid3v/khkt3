'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useDataContext } from '@/context/DataContext';
import Header from '@/components/Header';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, isLoading } = useDataContext();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !currentUser) {
      router.replace('/login');
    }
  }, [currentUser, isLoading, router]);

  if (isLoading || !currentUser) {
    return (
       <div className="min-h-screen flex items-center justify-center bg-slate-100">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
      </div>
    );
  }
  
  // Do not show header on the exam taking page
  const isTakingExam = /^\/exams\/.*\/take\//.test(pathname);

  return (
     <div className="min-h-screen bg-slate-100 font-sans text-slate-800">
        {!isTakingExam && <Header user={currentUser} />}
        <main>{children}</main>
    </div>
  );
}
