


'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useDataContext } from '@/context/DataContext';
import FeedbackDisplay from '@/components/FeedbackDisplay';
import LockClosedIcon from '@/components/icons/LockClosedIcon';
import type { Question, Option, Answer } from '@/types';
import CheckIcon from '@/components/icons/CheckIcon';
import XCircleIcon from '@/components/icons/XCircleIcon';

const ReadingComprehensionResult: React.FC<{ problem: any, submission: any }> = ({ problem, submission }) => {
    const questions: Question[] = problem.questions || [];

    return (
        <div className="space-y-8">
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200">
                <h2 className="text-2xl font-bold text-slate-800 mb-4">Đoạn văn</h2>
                <div className="prose prose-slate max-w-none text-slate-800 leading-relaxed whitespace-pre-wrap">
                    {problem.passage}
                </div>
            </div>

            <div className="space-y-4">
                 <h2 className="text-2xl font-bold text-slate-800 mb-4">Phân tích câu trả lời</h2>
                {submission.feedback.detailedFeedback.map((item: any, index: number) => {
                    const question = questions[index];
                    if (!question) return null; // Safeguard

                    const studentAnswer: Answer | undefined = submission.answers.find((a: any) => a.questionId === question.id);

                    if (question.questionType === 'multiple_choice') {
                        const isCorrect = item.score === 1;
                        return (
                             <div key={index} className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                                <h4 className="font-semibold text-lg text-slate-900 mb-3">{index + 1}. {item.criterion}</h4>
                                <div className="space-y-2 text-sm">
                                    {question.options?.map((opt: Option) => {
                                        const isStudentChoice = studentAnswer?.selectedOptionId === opt.id;
                                        const isCorrectChoice = question.correctOptionId === opt.id;
                                        let bgClass = "bg-slate-100";
                                        let textClass = "text-slate-800";
                                        let icon = null;

                                        if (isCorrectChoice) {
                                            bgClass = "bg-green-100 border-green-400";
                                            textClass = "text-green-900 font-semibold";
                                            icon = <CheckIcon />;
                                        }
                                        if (isStudentChoice && !isCorrect) {
                                            bgClass = "bg-red-100 border-red-400";
                                            textClass = "text-red-900 font-semibold";
                                            icon = <XCircleIcon />;
                                        }

                                        return (
                                            <div key={opt.id} className={`flex items-center gap-3 p-3 rounded-md border ${bgClass}`}>
                                                <div className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full ${isCorrectChoice ? 'bg-green-500 text-white' : isStudentChoice ? 'bg-red-500 text-white' : 'bg-transparent'}`}>
                                                {icon}
                                                </div>
                                                <span className={`${textClass} flex-grow`}>{opt.text}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="mt-4 bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
                                    <h5 className="font-semibold text-blue-800">Giải thích</h5>
                                    <p className="text-slate-700 text-sm mt-1">{item.feedback}</p>
                                </div>
                            </div>
                        )
                    } else { // short_answer
                        return (
                            <div key={index} className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                               <div className="flex justify-between items-start mb-3 gap-4">
                                   <h4 className="font-semibold text-lg text-slate-900 flex-1">{index + 1}. {item.criterion}</h4>
                                   <span className="font-bold text-lg text-blue-600 bg-blue-100 px-3 py-1 rounded-full whitespace-nowrap">
                                       {item.score.toFixed(2).replace(/\.00$/, '')} điểm
                                   </span>
                               </div>
                               <div className="space-y-3">
                                   <div className="bg-slate-50 p-4 rounded-lg">
                                       <h5 className="font-semibold text-slate-700 text-sm">Câu trả lời của bạn</h5>
                                       <p className="text-slate-800 mt-1 whitespace-pre-wrap">{studentAnswer?.writtenAnswer || "Không có câu trả lời."}</p>
                                   </div>
                                    <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
                                       <h5 className="font-semibold text-blue-800">Nhận xét của AI</h5>
                                       <p className="text-slate-700 text-sm mt-1">{item.feedback}</p>
                                   </div>
                               </div>
                           </div>
                       )
                    }
                })}
            </div>
        </div>
    );
};


export default function SubmissionResultPage({ params }: { params: { submissionId: string } }) {
    const router = useRouter();
    const { submissions, problems, users, currentUser, isLoading } = useDataContext();

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-8 text-center min-h-[calc(100vh-100px)] flex flex-col justify-center items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                <p className="mt-4 text-muted-foreground">Đang tải chi tiết bài nộp...</p>
            </div>
        );
    }

    if (!currentUser) return null;

    const submission = submissions.find(s => s.id === params.submissionId);
    if (!submission) return <p className="p-8">Lỗi: Không tìm thấy bài nộp.</p>;

    const problem = problems.find(p => p.id === submission.problemId);
    if (!problem) return <p className="p-8">Lỗi: Không tìm thấy bài tập tương ứng.</p>;
    
    const submitter = users.find(u => u.id === submission.submitterId);
    const canView = currentUser.id === submission.submitterId || currentUser.role === 'teacher' || currentUser.role === 'admin';
    const onBack = () => router.back();
    const backButtonText = submission.examId ? 'Quay lại chi tiết đề thi' : 'Quay lại chi tiết bài tập';

    if (!canView) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-7xl text-center flex items-center justify-center min-h-[calc(100vh-100px)]">
                <div className="bg-white p-12 rounded-2xl shadow-lg border border-slate-200">
                    <div className="mx-auto bg-red-100 rounded-full h-20 w-20 flex items-center justify-center"><LockClosedIcon className="h-10 w-10 text-red-500" /></div>
                    <h1 className="text-3xl font-bold text-slate-800 mt-6">Truy cập bị từ chối</h1>
                    <p className="text-slate-600 mt-2">Bạn không có quyền xem bài nộp này.</p>
                    <button onClick={onBack} className="mt-8 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700">&larr; Quay lại</button>
                </div>
            </div>
        );
    }
    
    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            <button onClick={onBack} className="mb-6 text-blue-600 font-semibold hover:underline">&larr; {backButtonText}</button>
            <header className="my-6 text-center border-b border-slate-200 pb-6">
                <h1 className="text-4xl font-bold text-slate-900">{problem.title}</h1>
                <p className="text-slate-600 mt-2 text-lg">Bài làm của: <span className="font-semibold text-slate-800">{submitter?.displayName || 'Người nộp ẩn danh'}</span></p>
                <p className="text-sm text-slate-500 mt-1">Nộp lúc: {new Date(submission.submittedAt).toLocaleString()}</p>
            </header>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
                <div className="lg:col-span-2">
                    {problem.type === 'reading_comprehension' ? (
                        <ReadingComprehensionResult problem={problem} submission={submission} />
                    ) : (
                         <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200">
                            <h2 className="text-2xl font-bold text-slate-800 mb-4">Nội dung bài làm</h2>
                            <div className="prose prose-slate max-w-none text-slate-800 leading-relaxed whitespace-pre-wrap">
                                {submission.essay}
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="lg:col-span-1">
                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200 sticky top-24">
                        <h2 className="text-2xl font-bold text-slate-800 mb-4">Kết quả chấm</h2>
                        <FeedbackDisplay feedback={submission.feedback} problem={problem} />
                    </div>
                </div>
            </div>
        </div>
    );
};