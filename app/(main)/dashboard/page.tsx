'use client';
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDataContext } from '@/context/DataContext';
import type { Problem } from '@/types';
import BookOpenIcon from '@/components/icons/BookOpenIcon';

export default function DashboardPage() {
    const { currentUser, problems } = useDataContext();
    const router = useRouter();

    if (!currentUser) return null; // Or a loading indicator

    const teacherProblems = problems.filter(p => p.createdBy === currentUser.id && !p.examId);
    const displayedProblems = currentUser.role === 'teacher' 
        ? teacherProblems 
        : problems.filter(p => !p.examId);

    const ProblemCard: React.FC<{ problem: Problem }> = ({ problem }) => (
        <div 
            className="bg-card p-6 rounded-lg shadow-sm hover:shadow-md hover:border-primary/50 transition-all cursor-pointer border border-border group"
            onClick={() => router.push(`/problems/${problem.id}`)}
        >
            <div className="flex items-start justify-between">
                <h3 className="text-lg font-bold text-foreground pr-4">{problem.title}</h3>
                <div className="p-2 bg-secondary rounded-md">
                    <BookOpenIcon className="w-5 h-5 text-primary"/>
                </div>
            </div>
            <p className="text-muted-foreground mt-2 text-sm h-10 overflow-hidden text-ellipsis">{problem.prompt}</p>
            <div className="text-right mt-4 text-sm font-semibold text-primary">
                <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
                    Xem chi tiết &rarr;
                </span>
            </div>
        </div>
    );
  
    const getHeading = () => {
        switch (currentUser.role) {
        case 'teacher':
            return 'Bài tập của bạn';
        case 'admin':
            return 'Tổng quan bài tập';
        default:
            return 'Danh sách bài tập';
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl animate-fade-in">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-foreground">
                    {getHeading()}
                </h1>
                {(currentUser.role === 'teacher' || currentUser.role === 'admin') && (
                    <Link href="/problems/create" passHref>
                        <button
                            className="px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-md shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring transition-colors"
                        >
                            + Tạo bài tập mới
                        </button>
                    </Link>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayedProblems.map(problem => (
                    <ProblemCard key={problem.id} problem={problem} />
                ))}
            </div>
            
            {displayedProblems.length === 0 && (
                <div className="text-center py-16 bg-card rounded-lg border border-dashed">
                     <p className="text-muted-foreground">
                        {currentUser.role === 'teacher' 
                            ? 'Bạn chưa tạo bài tập nào.' 
                            : 'Chưa có bài tập nào được giao.'
                        }
                    </p>
                    {currentUser.role === 'teacher' &&
                        <p className="text-muted-foreground text-sm mt-1">Nhấn "Tạo bài tập mới" để bắt đầu.</p>
                    }
                </div>
            )}
        </div>
    );
};