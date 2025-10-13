import React from 'react';
import type { Problem, Submission, User } from '../types';
import Leaderboard from '../components/Leaderboard';
import StudentGraderView from '../components/StudentGraderView';

interface ProblemDetailPageProps {
    problem: Problem;
    submissions: Submission[];
    users: User[];
    currentUser: User;
    onAddSubmission: (submission: Submission) => void;
    onSelectSubmission: (submissionId: string) => void;
    onBack: () => void;
}

const ProblemDetailPage: React.FC<ProblemDetailPageProps> = ({ problem, submissions, users, currentUser, onAddSubmission, onSelectSubmission, onBack }) => {

    const problemSubmissions = submissions.filter(s => s.problemId === problem.id)
        .sort((a, b) => b.submittedAt - a.submittedAt);
    const teacher = users.find(u => u.id === problem.createdBy);
    const userSubmissions = problemSubmissions.filter(s => s.submitterId === currentUser.id);

    const backButtonText = problem.examId ? 'Quay lại đề thi' : 'Quay lại danh sách';

    // FIX: Create an async wrapper function to match the expected prop type for onSubmissionComplete.
    const handleSubmissionComplete = async (submissionData: Omit<Submission, 'id' | 'submittedAt'>): Promise<void> => {
        const newSubmission: Submission = {
            ...submissionData,
            id: crypto.randomUUID(),
            submittedAt: Date.now(),
        };
        onAddSubmission(newSubmission);
    };


    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            <button onClick={onBack} className="mb-6 text-blue-600 font-semibold hover:underline">
                &larr; {backButtonText}
            </button>
            <header className="mb-10 p-6 bg-white rounded-2xl shadow-lg border border-slate-200">
                <h1 className="text-4xl font-bold text-slate-900">{problem.title}</h1>
                <p className="text-slate-500 mt-2">Giao bởi: {teacher?.name || 'Không rõ'}</p>
                <p className="mt-4 text-slate-700 whitespace-pre-wrap">{problem.prompt}</p>
            </header>

            <main>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left/Main Column - Common for all users */}
                    <div className="lg:col-span-2 space-y-8">
                        {(currentUser.role !== 'student' || !problem.isRubricHidden) && (
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800 mb-4">Hướng dẫn chấm</h2>
                                <div className="p-6 bg-slate-50 rounded-lg border border-slate-200 space-y-4">
                                    <div>
                                        <h4 className="font-semibold text-slate-700">Thang điểm:</h4>
                                        <p className="text-slate-600">
                                            Bài làm sẽ được chấm và quy đổi về thang điểm <strong>{problem.customMaxScore || 10}</strong>.
                                        </p>
                                    </div>

                                    {(problem.rawRubric || (problem.rubricItems && problem.rubricItems.length > 0)) && (
                                        <div className="pt-4 border-t border-slate-200">
                                            <h4 className="font-semibold text-slate-700 mb-2">Biểu điểm chi tiết:</h4>
                                            {problem.rawRubric && problem.rawRubric.trim() ? (
                                                <p className="text-slate-600 whitespace-pre-wrap">{problem.rawRubric}</p>
                                            ) : problem.rubricItems && problem.rubricItems.length > 0 ? (
                                                <>
                                                    <ul className="list-disc list-inside space-y-1 text-slate-600">
                                                        {problem.rubricItems.map(item => (
                                                            <li key={item.id}>
                                                                <strong>{item.criterion}:</strong> {item.maxScore} điểm
                                                            </li>
                                                        ))}
                                                    </ul>
                                                    <p className="text-right font-bold text-slate-700 mt-2">
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
                            <h2 className="text-2xl font-bold text-slate-800 mb-4">
                                {currentUser.role === 'student' ? 'Nộp bài & Chấm thử' : 'Nộp bài / Chấm thử nghiệm'}
                            </h2>
                            <StudentGraderView problem={problem} user={currentUser} onSubmissionComplete={handleSubmissionComplete} />
                        </div>
                    </div>

                    {/* Right/Side Column */}
                    <div className="lg:col-span-1 space-y-8">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800 mb-4">Lịch sử nộp bài</h2>
                                {userSubmissions.length > 0 ? (
                                <div className="space-y-3">
                                    {userSubmissions.map(sub => (
                                        <button 
                                            key={sub.id} 
                                            onClick={() => onSelectSubmission(sub.id)}
                                            className="w-full text-left bg-white p-4 rounded-lg shadow-sm border border-slate-200 hover:bg-slate-50 hover:border-blue-400 transition-all"
                                        >
                                            <div className="flex justify-between items-center">
                                                <p className="text-slate-600 text-sm">{new Date(sub.submittedAt).toLocaleString()}</p>
                                                <p className="font-bold text-lg text-blue-600">{sub.feedback.totalScore.toFixed(2)} điểm</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                                ) : (
                                    <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 text-center">
                                    <p className="text-slate-600">Bạn chưa nộp bài nào cho đề bài này.</p>
                                </div>
                                )}
                        </div>
                         {/* Leaderboard for students remains in the sidebar */}
                        {currentUser.role === 'student' && (
                            <Leaderboard submissions={problemSubmissions} users={users} />
                        )}
                    </div>
                </div>

                {/* Teacher/Admin Only Section: Leaderboard now replaces the old submission list */}
                {(currentUser.role === 'teacher' || currentUser.role === 'admin') && (
                    <div className="mt-12 pt-8 border-t border-slate-200">
                        <Leaderboard submissions={problemSubmissions} users={users} />
                    </div>
                )}
            </main>
        </div>
    );
};

export default ProblemDetailPage;