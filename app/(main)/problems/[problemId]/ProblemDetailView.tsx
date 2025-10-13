'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Problem, Submission, User } from '@/types';
import Leaderboard from '@/components/Leaderboard';
import StudentGraderView from '@/components/StudentGraderView';
import { addSubmission } from '@/app/actions';

interface ProblemDetailViewProps {
    problem: Problem;
    problemSubmissions: Submission[];
    users: Omit<User, 'password'>[];
    currentUser: Omit<User, 'password'> | null;
    teacherName: string;
}

export default function ProblemDetailView({ problem, problemSubmissions, users, currentUser, teacherName }: ProblemDetailViewProps) {
    const router = useRouter();
    
    if (!currentUser) {
        // This case should be handled by the main layout's auth guard
        return null;
    }

    const userSubmissions = problemSubmissions.filter(s => s.submitterId === currentUser.id);

    const handleSubmissionComplete = async (newSubmissionData: Omit<Submission, 'id' | 'submittedAt'>) => {
        try {
            const newSubmission = await addSubmission(newSubmissionData);
            if (newSubmission && !newSubmission.examId) {
                // Navigate to the result page for immediate feedback
                router.push(`/submissions/${newSubmission.id}`);
            }
            // For exam submissions, we stay on the page. The logic is handled in the exam taking component.
            // Here, we can just refresh the data if needed, but the server action already revalidates the path.
        } catch (error) {
            console.error(error);
            // Optionally show an error message to the user
        }
    };
    
    const backPath = problem.examId ? `/exams/${problem.examId}` : '/dashboard';
    const backButtonText = problem.examId ? 'Quay lại đề thi' : 'Quay lại danh sách';

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl animate-fade-in">
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
                        <div>
                            <h2 className="text-2xl font-bold text-foreground mb-4">Lịch sử nộp bài</h2>
                                {userSubmissions.length > 0 ? (
                                <div className="space-y-3">
                                    {userSubmissions.map(sub => (
                                        <Link 
                                            key={sub.id} 
                                            href={`/submissions/${sub.id}`}
                                            className="w-full text-left block bg-card p-4 rounded-lg shadow-sm border border-border hover:bg-muted/50 hover:border-primary/50 transition-all"
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
