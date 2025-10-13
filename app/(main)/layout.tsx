'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from '@/context/SessionContext';
import Header from '@/components/Header';
import { AnimatePresence } from 'framer-motion';
import PageTransition from '@/components/PageTransition';
// FIX: Import the DataProvider to make application data available to child components.
import { DataProvider } from '@/context/DataContext';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, isLoading } = useSession();
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
  
  const isTakingExam = /^\/exams\/.*\/take\//.test(pathname || '');

  return (
    <DataProvider>
      <div className="min-h-screen bg-background">
          {!isTakingExam && <Header user={currentUser} />}
          <main>
            <AnimatePresence mode="wait">
              <PageTransition key={pathname}>
                {children}
              </PageTransition>
            </AnimatePresence>
          </main>
      </div>
    </DataProvider>
  );
}
