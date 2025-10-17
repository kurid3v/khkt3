
'use client';

import { useDataContext } from '@/context/DataContext';
import { notFound } from 'next/navigation';
import ProblemDetailView from './ProblemDetailView';

export default function ProblemDetailPage({ params }: { params: { problemId: string } }) {
    const { problems, submissions, users, currentUser, isLoading } = useDataContext();

    if (isLoading) {
      return (
        <div className="container mx-auto px-4 py-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Đang tải dữ liệu...</p>
        </div>
      );
    }
    
    const problem = problems.find(p => p.id === params.problemId);
    
    if (!problem) {
        notFound();
    }
    
    const problemSubmissions = submissions
        .filter(s => s.problemId === problem.id)
        .sort((a, b) => b.submittedAt - a.submittedAt);
        
    const teacher = users.find(u => u.id === problem.createdBy);

    return (
        <ProblemDetailView
            problem={problem}
            problemSubmissions={problemSubmissions}
            users={users}
            currentUser={currentUser}
            teacherName={teacher?.displayName || 'Không rõ'}
        />
    );
};