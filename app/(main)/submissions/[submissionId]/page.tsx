'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useDataContext } from '@/context/DataContext';
import FeedbackDisplay from '@/components/FeedbackDisplay';
import LockClosedIcon from '@/components/icons/LockClosedIcon';

export default function SubmissionResultPage({ params }: { params: { submissionId: string } }) {
    const router = useRouter();
    const { submissions, problems, users, currentUser } = useDataContext();

    if (!currentUser) return null; // Or a loading spinner

    const submission = submissions.find(s => s.id === params.submissionId);
    if (!submission) return <p className="p-8">Lỗi: Không tìm thấy bài nộp.</p>;

    const problem = problems.find(p => p.id === submission.problemId);
    if (!problem) return <p className="p-8">Lỗi: Không tìm thấy bài tập tương ứng.</p>;
    
    const submitter = users.find(u => u.id === submission.submitterId);
    
    const canView = currentUser.id === submission.submitterId || currentUser.role === 'teacher' || currentUser.role === 'admin';

    const onBack = () => {
        // Use router.back() for simplicity, or specific logic if needed
        router.back();
    };
    
    const backButtonText = submission.examId ? 'Quay lại chi tiết đề thi' : 'Quay lại chi tiết bài tập';

    if (!canView) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-7xl text-center animate-fade-in flex items-center justify-center min-h-[calc(100vh-100px)]">
                <div className="bg-white p-12 rounded-2xl shadow-lg border border-slate-200">
                    <div className="mx-auto bg-red-100 rounded-full h-20 w-20 flex items-center justify-center">
                        <LockClosedIcon className="h-10 w-10 text-red-500" />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-800 mt-6">Truy cập bị từ chối</h1>
                    <p className="text-slate-600 mt-2">Bạn không có quyền xem bài nộp này.</p>
                    <button 
                        onClick={onBack} 
                        className="mt-8 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors"
                    >
                        &larr; Quay lại
                    </button>
                </div>
            </div>
        );
    }
    
    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl animate-fade-in">
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