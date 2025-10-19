
'use client';

import { useDataContext } from '@/context/DataContext';
import ExamsView from './ExamsView';

export default function ExamsPage() {
    const { currentUser, exams, problems, classrooms, isLoading } = useDataContext();

    if (isLoading) {
      return (
        <div className="container mx-auto px-4 py-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Đang tải dữ liệu...</p>
        </div>
      );
    }
    
    if (!currentUser) {
        // This should be handled by layout, but as a safeguard.
        return <p className="p-8">Vui lòng đăng nhập...</p>;
    }
    
    // Pass the client-side data as props to the client component.
    return (
        <ExamsView 
            initialExams={exams} 
            problems={problems} 
            currentUser={currentUser}
            classrooms={classrooms}
        />
    );
}