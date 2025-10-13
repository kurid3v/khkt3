'use client';

import React, { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Problem, Submission, User } from '@/types';
import Leaderboard from '@/components/Leaderboard';
import StudentGraderView from '@/components/StudentGraderView';
import { useDataContext } from '@/context/DataContext';
import { runProblemSimilarityCheck } from '@/app/actions';
import ShieldCheckIcon from '@/components/icons/ShieldCheckIcon';

interface ProblemDetailViewProps {
    problem: Problem;
    problemSubmissions: Submission[];
    users: Omit<User, 'password'>[];
    currentUser: Omit<User, 'password'> | null;
    teacherName: string;
}

// Teacher/Admin view of submissions for this problem
const TeacherSubmissionsView: React.FC<{ submissions: Submission[], users: Omit<User, 'password'>[], problemId: string }> = ({ submissions, users, problemId }) => {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const handleRunCheck = () => {
        startTransition(() => {
            runProblemSimilarityCheck(problemId);
        });
    };

    if (submissions.length === 0) {
        return (
            <div className="bg-card p-6 rounded-lg border border-dashed text-center">
                <p className="text-muted-foreground">Chưa có học sinh nào nộp bài.</p>
            </div>
        );
    }

    const getSimilarityColor = (percentage: number) => {
        if (percentage > 70) return 'text-destructive';
        if (percentage > 40) return 'text-orange-500';
        return 'text-primary';
    };

    return (
        <div className="bg-card p-4 rounded-xl shadow-sm border border-border">
            <div className="flex justify-end mb-4">
                 <button 
                    onClick={handleRunCheck}
                    disabled={isPending || submissions.length < 2}
                    className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground font-semibold rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                    {isPending ? (
                        <>
                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Đang kiểm tra...</span>
                        </>
                    ) : (
                        <>
                            <ShieldCheckIcon />
                            <span>Kiểm tra tương đồng</span>
                        </>
                    )}
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full min-w-max">
                    <thead>
                        <tr className="border-b border-border">
                            <th className="p-3 text-left text-sm font-semibold text-muted-foreground">Học sinh</th>
                            <th className="p-3 text-left text-sm font-semibold text-muted-foreground">Ngày nộp</th>
                            <th className="p-3 text-right text-sm font-semibold text-muted-foreground">Điểm</th>
                            <th className="p-3 text-right text-sm font-semibold text-muted-foreground">Tương đồng</th>
                        </tr>
                    </thead>
                    <tbody>
                        {submissions.map(sub => {
                            const submitter = users.find(u => u.id === sub.submitterId);
                            const similarity = sub.similarityCheck;
                            return (
                                <tr key={sub.id} onClick={() => router.push(`/submissions/${sub.id}`)} className="cursor-pointer hover:bg-muted/50 border-b border-border last:border-b-0">
                                    <td className="p-3 font-semibold text-foreground">{submitter?.name || 'Không rõ'}</td>
                                    <td className="p-3 text-muted-foreground text-sm">{new Date(sub.submittedAt).toLocaleString()}</td>
                                    <td className="p-3 font-bold text-primary text-right">{sub.feedback.totalScore.toFixed(2)}</td>
                                    <td className="p-3 text-right">
                                        {similarity ? (
                                            <div>
                                                <span className={`font-bold ${getSimilarityColor(similarity.similarityPercentage)}`}>
                                                    {similarity.similarityPercentage.toFixed(0)}%
                                                </span>
                                                {similarity.mostSimilarToStudentName && (
                                                    <p className="text-xs text-muted-foreground">(với {similarity.mostSimilarToStudentName})</p>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground text-sm">Chưa KT</span>
                                        )}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};


export default function ProblemDetailView({ problem, problemSubmissions, users, currentUser, teacherName }: ProblemDetailViewProps) {
    const router = useRouter();
    const { addSubmissionAndSyncState } = useDataContext();
    
    if (!currentUser) {
        // This case should be handled by the main layout's auth guard
        return null;
    }

    const userSubmissions = problemSubmissions.filter(s => s.submitterId === currentUser.id);

    const handleSubmissionComplete = async (newSubmissionData: Omit<Submission, 'id' | 'submittedAt'>) => {
        try {
            const newSubmission = await addSubmissionAndSyncState(newSubmissionData);
            if (newSubmission && !newSubmission.examId) {
                // Navigate to the result page for immediate feedback
                router.push(`/submissions/${newSubmission.id}`);
            }
        } catch (error) {
            console.error(error);
        }
    };
    
    const backPath = problem.examId ? `/exams/${problem.examId}` : '/dashboard';
    const backButtonText = problem.examId ? 'Quay lại đề thi' : 'Quay lại danh sách';

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            <Link href={backPath} className="mb-6 text-primary font-semibold hover:underline inline-block">
                &larr; {backButtonText}
            </Link>
            <header className="mb-10 p-6 bg-card rounded-xl shadow-sm border border-border">
                <h1 className="text-3xl font-bold text-foreground">{problem.title}</h1>
                <p className="text-muted-foreground mt-2">Giao bởi: {teacherName}</p>
                <div className="mt-4 text-foreground/90 whitespace-pre-wrap prose prose-slate max-w-none">{problem.prompt}</div>
            </header>

            <main>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left/Main Column */}
                    <div className="lg:col-span-2 space-y-8">
                        {(currentUser.role !== 'student' || !problem.isRubricHidden) && (
                            <div>
                                <h2 className="text-2xl font-bold text-foreground mb-4">Hướng dẫn chấm</h2>
                                <div className="p-6 bg-card rounded-xl border border-border space-y-4">
                                    <div>
                                        <h4 className="font-semibold text-foreground">Thang điểm:</h4>
                                        <p className="text-muted-foreground">
                                            Bài làm sẽ được chấm và quy đổi về thang điểm <strong>{problem.customMaxScore || 10}</strong>.
                                        </p>
                                    </div>

                                    {(problem.rawRubric || (problem.rubricItems && problem.rubricItems.length > 0)) && (
                                        <div className="pt-4 border-t border-border">
                                            <h4 className="font-semibold text-foreground mb-2">Biểu điểm chi tiết:</h4>
                                            {problem.rawRubric && problem.rawRubric.trim() ? (
                                                <p className="text-muted-foreground whitespace-pre-wrap">{problem.rawRubric}</p>
                                            ) : problem.rubricItems && problem.rubricItems.length > 0 ? (
                                                <>
                                                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                                        {problem.rubricItems.map(item => (
                                                            <li key={item.id}>
                                                                <strong>{item.criterion}:</strong> {item.maxScore} điểm
                                                            </li>
                                                        ))}
                                                    </ul>
                                                    <p className="text-right font-bold text-foreground mt-2">
                                                        Tổng điểm biểu điểm: {problem.rubricItems.reduce((sum, item) => sum + item.maxScore, 0)}
                                                    </p>
                                                </>
                                            ) : null}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        <div>
                            <h2 className="text-2xl font-bold text-foreground mb-4">
                                {currentUser.role === 'student' ? 'Nộp bài & Chấm thử' : 'Nộp bài / Chấm thử nghiệm'}
                            </h2>
                            <StudentGraderView problem={problem} user={currentUser} onSubmissionComplete={handleSubmissionComplete} />
                        </div>
                    </div>

                    {/* Right Sidebar */}
                    <div className="lg:col-span-1 space-y-8">
                        {currentUser.role === 'student' && (
                            <div>
                                <h2 className="text-2xl font-bold text-foreground mb-4">Lịch sử nộp bài</h2>
                                    {userSubmissions.length > 0 ? (
                                    <div className="space-y-3">
                                        {userSubmissions.map(sub => (
                                            <Link 
                                                key={sub.id} 
                                                href={`/submissions/${sub.id}`}
                                                className="w-full text-left block bg-card p-4 rounded-lg shadow-sm border border-border hover:bg-muted/50 hover:border-primary/50"
                                            >
                                                <div className="flex justify-between items-center">
                                                    <p className="text-muted-foreground text-sm">{new Date(sub.submittedAt).toLocaleString()}</p>
                                                    <p className="font-bold text-lg text-primary">{sub.feedback.totalScore.toFixed(2)} điểm</p>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                    ) : (
                                        <div className="bg-card p-6 rounded-lg border border-dashed text-center">
                                        <p className="text-muted-foreground">Bạn chưa nộp bài nào.</p>
                                    </div>
                                    )}
                            </div>
                        )}
                        {(currentUser.role === 'teacher' || currentUser.role === 'admin') && (
                            <div>
                                <h2 className="text-2xl font-bold text-foreground mb-4">Danh sách bài nộp</h2>
                                <TeacherSubmissionsView submissions={problemSubmissions} users={users} problemId={problem.id} />
                            </div>
                        )}
                         {/* Leaderboard for students remains in the sidebar */}
                        <div>
                           <h2 className="text-2xl font-bold text-foreground mb-4">Bảng xếp hạng</h2>
                           <Leaderboard submissions={problemSubmissions} users={users} />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}