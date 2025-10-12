'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useDataContext } from '@/context/DataContext';
import FeedbackDisplay from '@/components/FeedbackDisplay';

export default function SubmissionResultPage({ params }: { params: { submissionId: string } }) {
    const router = useRouter();
    const { submissions, problems, users } = useDataContext();

    const submission = submissions.find(s => s.id === params.submissionId);
    if (!submission) return <p className="p-8">Lỗi: Không tìm thấy bài nộp.</p>;

    const problem = problems.find(p => p.id === submission.problemId);
    if (!problem) return <p className="p-8">Lỗi: Không tìm thấy bài tập tương ứng.</p>;
    
    const submitter = users.find(u => u.id === submission.submitterId);
    
    const onBack = () => {
        if (submission.examId) {
            router.push(`/exams/${submission.examId}`);
        } else {
            router.push(`/problems/${submission.problemId}`);
        }
    };
    
    const backButtonText = submission.examId ? 'Quay lại chi tiết đề thi' : 'Quay lại chi tiết bài tập';
    
    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            <button onClick={onBack} className="mb-6 text-blue-600 font-semibold hover:underline">
                &larr; {backButtonText}
            </button>
            
            <header className="my-6 text-center border-b border-slate-200 pb-6">
                <h1 className="text-4xl font-bold text-slate-900">{problem.title}</h1>
                <p className="text-slate-600 mt-2 text-lg">
                    Bài làm của: <span className="font-semibold text-slate-800">{submitter?.name || 'Người nộp ẩn danh'}</span>
                </p>
                <p className="text-sm text-slate-500 mt-1">
                    Nộp lúc: {new Date(submission.submittedAt).toLocaleString()}
                </p>
            </header>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                {/* Essay Content */}
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200">
                    <h2 className="text-2xl font-bold text-slate-800 mb-4 sticky top-4 bg-white pb-2">Nội dung bài làm</h2>
                    <div className="prose prose-slate max-w-none text-slate-800 leading-relaxed whitespace-pre-wrap">
                        {submission.essay}
                    </div>
                </div>
                
                {/* Feedback */}
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200">
                     <h2 className="text-2xl font-bold text-slate-800 mb-4 sticky top-4 bg-white pb-2">Kết quả chấm của AI</h2>
                    <FeedbackDisplay feedback={submission.feedback} />
                </div>
            </div>
        </div>
    );
};
