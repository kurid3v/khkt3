'use client';

import Link from 'next/link';
import { useDataContext } from '@/context/DataContext';
import type { Problem } from '@/types';
import BookOpenIcon from '@/components/icons/BookOpenIcon';
import ClipboardListIcon from '@/components/icons/ClipboardListIcon';
import React, { useState, useTransition, useOptimistic } from 'react';
import { deleteProblem } from '@/app/actions';
import TrashIcon from '@/components/icons/TrashIcon';
import ConfirmationModal from '@/components/ConfirmationModal';

interface ProblemCardContentProps {
    problem: Problem;
    onDelete: (problemId: string) => void;
    isOwnerOrAdmin: boolean;
}

function ProblemCardContent({ problem, onDelete, isOwnerOrAdmin }: ProblemCardContentProps) {
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete(problem.id);
  };
  
  return (
    <>
        {isOwnerOrAdmin && (
            <button
                onClick={handleDeleteClick}
                className="absolute top-2 right-2 p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                aria-label={`Xóa bài tập ${problem.title}`}
                title="Xóa bài tập"
            >
                <TrashIcon />
            </button>
        )}
        <div className="flex items-start justify-between">
            <h3 className="text-lg font-bold text-foreground pr-4">{problem.title}</h3>
            <div className="p-2 bg-secondary rounded-md">
                {problem.type === 'reading_comprehension'
                    ? <ClipboardListIcon className="w-5 h-5 text-primary"/>
                    : <BookOpenIcon className="w-5 h-5 text-primary"/>
                }
            </div>
        </div>
        <p className="text-muted-foreground mt-2 text-sm h-10 overflow-hidden text-ellipsis">
            {problem.type === 'reading_comprehension' ? problem.passage : problem.prompt}
        </p>
        <div className="text-right mt-4 text-sm font-semibold text-primary">
            <span className="inline-block group-hover:translate-x-1 motion-reduce:transform-none">
                Xem chi tiết &rarr;
            </span>
        </div>
    </>
  );
}

export default function DashboardPage() {
    const { currentUser, problems: allProblems, isLoading } = useDataContext();
    const [problemToDelete, setProblemToDelete] = useState<Problem | null>(null);
    const [isPending, startTransition] = useTransition();

    if (isLoading) {
      return (
        <div className="container mx-auto px-4 py-8 text-center">
            <div className="rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Đang tải dữ liệu...</p>
        </div>
      );
    }
    
    if (!currentUser) return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p>Đang chuyển hướng đến trang đăng nhập...</p>
      </div>
    );

    const teacherProblems = allProblems.filter(p => p.createdBy === currentUser.id && !p.examId);
    const displayedProblems = currentUser.role === 'teacher' 
        ? teacherProblems 
        : allProblems.filter(p => !p.examId);
  
    const [optimisticProblems, removeOptimisticProblem] = useOptimistic(
        displayedProblems,
        (state, problemId: string) => state.filter(p => p.id !== problemId)
    );

    const handleDeleteClick = (problemId: string) => {
        const problem = displayedProblems.find(p => p.id === problemId);
        if (problem) {
            setProblemToDelete(problem);
        }
    };
    
    const confirmDelete = () => {
        if (problemToDelete) {
            startTransition(() => {
                removeOptimisticProblem(problemToDelete.id);
                deleteProblem(problemToDelete.id);
            });
            setProblemToDelete(null);
        }
    };

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
        <>
            <div className="container mx-auto px-4 py-8 max-w-7xl">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-foreground">
                        {getHeading()}
                    </h1>
                    {(currentUser.role === 'teacher' || currentUser.role === 'admin') && (
                        <Link href="/problems/create" passHref>
                            <button
                                className="px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-md shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring"
                            >
                                + Tạo bài tập mới
                            </button>
                        </Link>
                    )}
                </div>

                {optimisticProblems.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {optimisticProblems.map(problem => (
                            <Link 
                                key={problem.id}
                                href={`/problems/${problem.id}`}
                                className="bg-card p-6 rounded-lg shadow-sm hover:shadow-md hover:border-primary/50 cursor-pointer border border-border group relative"
                            >
                                <ProblemCardContent 
                                    problem={problem}
                                    onDelete={handleDeleteClick}
                                    isOwnerOrAdmin={currentUser.role === 'admin' || currentUser.id === problem.createdBy}
                                />
                            </Link>
                        ))}
                    </div>
                ) : (
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
            <ConfirmationModal
                isOpen={!!problemToDelete}
                onClose={() => setProblemToDelete(null)}
                onConfirm={confirmDelete}
                title="Xác nhận xóa bài tập"
                message={`Bạn có chắc chắn muốn xóa bài tập "${problemToDelete?.title}" không? Hành động này sẽ xóa vĩnh viễn tất cả các bài nộp liên quan.`}
            />
        </>
    );
};