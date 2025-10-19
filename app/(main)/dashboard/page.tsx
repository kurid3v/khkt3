
'use client';

import React, { useState, useTransition, useOptimistic, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useDataContext } from '@/context/DataContext';
import type { Problem } from '@/types';
import BookOpenIcon from '@/components/icons/BookOpenIcon';
import ClipboardListIcon from '@/components/icons/ClipboardListIcon';
import TrashIcon from '@/components/icons/TrashIcon';
import ConfirmationModal from '@/components/ConfirmationModal';
import { deleteProblem } from '@/app/actions';
import UsersIcon from '@/components/icons/UsersIcon';

export default function DashboardPage() {
    const { problems, submissions, users, currentUser, classrooms, isLoading } = useDataContext();
    const router = useRouter();

    const [problemToDelete, setProblemToDelete] = useState<Problem | null>(null);
    const [isPending, startTransition] = useTransition();

    const [optimisticProblems, setOptimisticProblems] = useOptimistic(
        problems,
        (state, problemId: string) => state.filter(p => p.id !== problemId)
    );

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Đang tải dữ liệu...</p>
            </div>
        );
    }

    if (!currentUser) {
        return <p className="p-8">Vui lòng đăng nhập...</p>;
    }

    const filteredProblems = useMemo(() => {
        if (currentUser.role === 'student') {
            const studentClassroomIds = classrooms
                .filter(c => c.studentIds.includes(currentUser.id))
                .map(c => c.id);
            
            return optimisticProblems.filter(p => 
                !p.classroomIds || p.classroomIds.length === 0 || p.classroomIds.some(cid => studentClassroomIds.includes(cid))
            );
        }
        // Teachers and admins see all problems
        return optimisticProblems;
    }, [optimisticProblems, currentUser, classrooms]);


    const standaloneProblems = filteredProblems
        .filter(p => !p.examId)
        .sort((a, b) => b.createdAt - a.createdAt);

    const handleDeleteClick = (e: React.MouseEvent, problem: Problem) => {
        e.stopPropagation();
        setProblemToDelete(problem);
    };

    const confirmDeleteProblem = () => {
        if (problemToDelete) {
            startTransition(async () => {
                setOptimisticProblems(problemToDelete.id);
                await deleteProblem(problemToDelete.id);
            });
            setProblemToDelete(null);
        }
    };

    const getSubmissionStatusForStudent = (problemId: string) => {
        const userSubmissions = submissions.filter(s => s.submitterId === currentUser.id && s.problemId === problemId);
        if (userSubmissions.length > 0) {
            const highestScore = Math.max(...userSubmissions.map(s => s.feedback.totalScore));
            return {
                submitted: true,
                text: `Đã nộp (${userSubmissions.length} lần)`,
                scoreText: `Điểm cao nhất: ${highestScore.toFixed(2).replace(/\.00$/, '')}`
            };
        }
        return { submitted: false, text: 'Chưa nộp' };
    };

    const getSubmissionCountForTeacher = (problemId: string) => {
        return submissions.filter(s => s.problemId === problemId).length;
    };

    const ProblemCard: React.FC<{ problem: Problem }> = ({ problem }) => {
        const teacher = users.find(u => u.id === problem.createdBy);
        const isEssay = problem.type === 'essay';
        const problemClassrooms = classrooms.filter(c => problem.classroomIds?.includes(c.id));

        return (
            <div
                onClick={() => router.push(`/problems/${problem.id}`)}
                className="block bg-card p-6 rounded-xl shadow-card hover:shadow-card-hover border border-border transition-all duration-200 cursor-pointer relative group flex flex-col"
            >
                {(currentUser.role === 'teacher' || currentUser.role === 'admin') && (
                    <button
                        onClick={(e) => handleDeleteClick(e, problem)}
                        className="absolute top-3 right-3 p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label={`Xóa bài tập ${problem.title}`}
                        title="Xóa bài tập"
                    >
                        <TrashIcon />
                    </button>
                )}
                <div className="flex-grow">
                    <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                            <h3 className="font-bold text-foreground pr-8">{problem.title}</h3>
                            <p className="text-sm text-muted-foreground mt-1">Giao bởi: {teacher?.displayName || 'Không rõ'}</p>
                             {problemClassrooms.length > 0 && (
                                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground" title={problemClassrooms.map(c => c.name).join(', ')}>
                                    <UsersIcon className="h-4 w-4" />
                                    <span className="truncate">
                                        {problemClassrooms.length > 1 ? `${problemClassrooms.length} lớp` : problemClassrooms[0].name}
                                    </span>
                                </div>
                            )}
                        </div>
                        <div className={`flex-shrink-0 p-2.5 rounded-full ${isEssay ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                           {isEssay ? <BookOpenIcon className="w-5 h-5" /> : <ClipboardListIcon className="w-5 h-5" />}
                        </div>
                    </div>
                </div>
                <div className="mt-4 pt-4 border-t border-border/80 text-sm">
                    {currentUser.role === 'student' ? (
                        (() => {
                            const status = getSubmissionStatusForStudent(problem.id);
                            return (
                                <div className="flex justify-between items-center">
                                    <span className={`font-semibold px-2.5 py-1 rounded-md text-xs ${status.submitted ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                      {status.text}
                                    </span>
                                    {status.submitted && <span className="text-muted-foreground font-semibold">{status.scoreText}</span>}
                                </div>
                            );
                        })()
                    ) : (
                        <p className="font-semibold text-muted-foreground">
                            {getSubmissionCountForTeacher(problem.id)} lượt nộp
                        </p>
                    )}
                </div>
            </div>
        );
    };

    return (
        <>
            <div className="container mx-auto px-4 py-8 max-w-7xl">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-foreground">
                        Danh sách bài tập
                    </h1>
                    {(currentUser.role === 'teacher' || currentUser.role === 'admin') && (
                        <button
                            onClick={() => router.push('/problems/create')}
                            className="btn-primary px-5 py-2.5"
                        >
                            + Tạo bài tập mới
                        </button>
                    )}
                </div>
                
                {standaloneProblems.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {standaloneProblems.map(problem => (
                            <ProblemCard key={problem.id} problem={problem} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-card rounded-xl border-2 border-dashed">
                         <h3 className="text-xl font-semibold text-foreground">Không có bài tập nào</h3>
                         <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                            {currentUser.role === 'student'
                                ? 'Giáo viên của bạn chưa giao bài tập nào. Hãy quay lại sau nhé!'
                                : 'Bạn chưa tạo bài tập nào. Nhấn nút "Tạo bài tập mới" để bắt đầu.'}
                        </p>
                        {(currentUser.role === 'teacher' || currentUser.role === 'admin') && (
                          <button
                            onClick={() => router.push('/problems/create')}
                            className="mt-6 btn-primary px-5 py-2.5"
                          >
                            Tạo bài tập đầu tiên
                          </button>
                        )}
                    </div>
                )}
            </div>
            <ConfirmationModal
                isOpen={!!problemToDelete}
                onClose={() => setProblemToDelete(null)}
                onConfirm={confirmDeleteProblem}
                title="Xác nhận xóa bài tập"
                message={`Bạn có chắc chắn muốn xóa bài tập "${problemToDelete?.title}" không? Hành động này sẽ xóa vĩnh viễn tất cả các bài nộp liên quan.`}
            />
        </>
    );
}