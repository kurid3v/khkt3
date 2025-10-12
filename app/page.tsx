'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDataContext } from '@/context/DataContext';

export default function HomePage() {
  const { currentUser, isLoading } = useDataContext();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (currentUser) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [currentUser, isLoading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
    </div>
  );
}
