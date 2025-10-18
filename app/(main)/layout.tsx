'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from '@/context/SessionContext';
import Header from '@/components/Header';
import ImpersonationBanner from '@/components/ImpersonationBanner';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, isLoading, impersonatedUser } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !currentUser) {
      router.replace('/login');
    }
  }, [currentUser, isLoading, router]);

  if (isLoading || !currentUser) {
    return (
       <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary"></div>
      </div>
    );
  }
  
  // A regex to dynamically check if the user is on any exam taking page.
  const isTakingExam = /^\/exams\/.*\/take\//.test(pathname || '');

  return (
      <div className={`min-h-screen bg-secondary ${impersonatedUser ? 'pt-12' : ''}`}>
          {impersonatedUser && <ImpersonationBanner />}
          {!isTakingExam && <Header user={currentUser} />}
          <main>
            {children}
          </main>
      </div>
  );
}
