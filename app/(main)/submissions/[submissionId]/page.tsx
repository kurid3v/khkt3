
'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, notFound } from 'next/navigation';
import { useDataContext } from '@/context/DataContext';
import FeedbackDisplay from '@/components/FeedbackDisplay';
import type { Question, Answer, User, Submission, Problem, DetailedFeedbackItem, Feedback } from '@/types';
import SimilarityCheckDisplay from '@/components/SimilarityCheckDisplay';
import PencilIcon from '@/components/icons/PencilIcon';
import SubmissionHistory from '@/components/SubmissionHistory';
// FIX: Added missing icon imports.
import CheckIcon from '@/components/icons/CheckIcon';
import XCircleIcon from '@/components/icons/XCircleIcon';

const EssayResult: React.FC<{
    submission: Submission,
    problem: Problem,
    currentUser: Omit<User, 'password'>,
    onUpdateSubmission: (submissionId: string, updatedData: Partial<Submission>) => Promise<void>;
}> = ({ submission, problem, currentUser, onUpdateSubmission }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedFeedback, setEditedFeedback] = useState<Feedback>(submission.feedback);
    const [isPending, startTransition] = useTransition();

    const handleDetailChange = (index: number, field: 'score' | 'feedback', value: string | number) => {
        const newDetails = [...editedFeedback.detailedFeedback];
        const item = { ...newDetails[index] };

        if (field === 'score') {
            const newScore = Number(value);
            const rubricItem = problem.rubricItems?.find(r => r.criterion === item.criterion);
            const maxScore = rubricItem?.maxScore ?? Infinity;
            // Clamp score between 0 and maxScore
            item.score = Math.max(0, Math.min(newScore, maxScore));
        } else if (field === 'feedback') {
            item.feedback = String(value);
        }
        
        newDetails[index] = item;

        // Recalculate total score based on rubric weights and then scale to custom max score
        const rubricTotal = problem.rubricItems?.reduce((sum, r) => sum + r.maxScore, 0) || editedFeedback.maxScore;
        const currentRawTotal = newDetails.reduce((acc, curr) => acc + curr.score, 0);
        
        const newTotalScore = (rubricTotal > 0) 
            ? (currentRawTotal / rubricTotal) * editedFeedback.maxScore 
            : currentRawTotal;

        setEditedFeedback(prev => ({ ...prev, detailedFeedback: newDetails, totalScore: newTotalScore }));
    };
    
    const handleGeneralSuggestionChange = (index: number, value: string) => {
        const newSuggestions = [...(editedFeedback.generalSuggestions || [])];
        newSuggestions[index] = value;
        setEditedFeedback(prev => ({ ...prev, generalSuggestions: newSuggestions }));
    }

    const handleSave = () => {
        startTransition(async () => {
            await onUpdateSubmission(submission.id, { 
                feedback: editedFeedback,
                lastEditedByTeacherAt: Date.now()
            });
            setIsEditing(false);
        });
    };

    const handleCancel = () => {
        setEditedFeedback(submission.feedback);
        setIsEditing(false);
    };

    const isTeacherOrAdmin = currentUser.role === 'teacher' || currentUser.role === 'admin';

    if (isEditing) {
        return (
            <div className="bg-card p-6 rounded-xl border border-primary/50 shadow-lg space-y-6">
                 <div>
                    <h3 className="text-xl font-semibold text-foreground mb-3 flex items-center gap-2">
                        <PencilIcon />
                        Chỉnh sửa Phân tích chi tiết
                    </h3>
                    <div className="space-y-4">
                    {editedFeedback.detailedFeedback.map((item, index) => {
                         const rubricItem = problem.rubricItems?.find(r => r.criterion === item.criterion);
                         const maxScore = rubricItem?.maxScore ?? item.score;
                        return(
                        <div key={index} className="bg-secondary/50 p-4 rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="font-semibold text-lg text-foreground">{item.criterion}</h4>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="number" 
                                        value={item.score}
                                        onChange={e => handleDetailChange(index, 'score', e.target.value)}
                                        className="w-24 p-2 text-right font-bold text-lg text-primary bg-background rounded-md border border-border"
                                        step="0.25"
                                        max={maxScore}
                                        min="0"
                                    />
                                    <span className="font-semibold text-muted-foreground">/ {maxScore} điểm</span>
                                </div>
                            </div>
                            <textarea
                                value={item.feedback}
                                onChange={e => handleDetailChange(index, 'feedback', e.target.value)}
                                className="w-full p-2 bg-background border border-border rounded-md resize-y"
                                rows={3}
                            />
                        </div>
                    )})}
                    </div>
                </div>
                 <div>
                    <h3 className="text-xl font-semibold text-foreground mb-3">Chỉnh sửa Gợi ý chung</h3>
                    <div className="space-y-2">
                    {editedFeedback.generalSuggestions?.map((suggestion, index) => (
                         <textarea
                            key={index}
                            value={suggestion}
                            onChange={e => handleGeneralSuggestionChange(index, e.target.value)}
                            className="w-full p-2 bg-background border border-border rounded-md resize-y"
                            rows={2}
                        />
                    ))}
                    </div>
                </div>
                 <div className="flex justify-end gap-4 pt-4 border-t border-border">
                    <button onClick={handleCancel} disabled={isPending} className="btn-secondary px-6 py-2">Hủy</button>
                    <button onClick={handleSave} disabled={isPending} className="btn-primary px-6 py-2">
                        {isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="relative">
            {isTeacherOrAdmin && (
                <button 
                    onClick={() => setIsEditing(true)}
                    className="absolute -top-12 right-0 btn-outline px-4 py-2 text-sm flex items-center gap-2"
                >
                    <PencilIcon className="h-4 w-4" />
                    Chỉnh sửa chấm điểm
                </button>
            )}
            <FeedbackDisplay feedback={submission.feedback} problem={problem} />
        </div>
    );
};


const ReadingComprehensionResult: React.FC<{ 
    problem: Problem, 
    submission: Submission,
    currentUser: Omit<User, 'password'>,
    onUpdateSubmission: (submissionId: string, updatedData: Partial<Submission>) => Promise<void>;
}> = ({ problem, submission, currentUser, onUpdateSubmission }) => {
    const questions: Question[] = problem.questions || [];
    const [isEditing, setIsEditing] = useState(false);
    const [editedScores, setEditedScores] = useState<{ [questionId: string]: number }>({});
    const [editedFeedbacks, setEditedFeedbacks] = useState<{ [questionId: string]: string }>({});
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        const initialScores: { [questionId: string]: number } = {};
        const initialFeedbacks: { [questionId: string]: string } = {};
        
        submission.feedback.detailedFeedback.forEach(item => {
            const qId = item.questionId || questions.find(q => q.questionText === item.criterion)?.id;
            if (qId) {
                initialScores[qId] = item.score;
                initialFeedbacks[qId] = item.feedback;
            }
        });
        setEditedScores(initialScores);
        setEditedFeedbacks(initialFeedbacks);
    }, [submission, questions]);
    
    const handleSave = () => {
        startTransition(async () => {
            const newDetailedFeedback: DetailedFeedbackItem[] = questions.map(q => {
                const score = editedScores[q.id] ?? 0;
                const feedback = editedFeedbacks[q.id] ?? '';
                const originalFeedback = submission.feedback.detailedFeedback.find(item => (item.questionId || questions.find(q_find => q_find.questionText === item.criterion)?.id) === q.id);
                return {
                    ...(originalFeedback || { criterion: q.questionText }),
                    questionId: q.id,
                    score,
                    feedback,
                };
            });

            const newTotalScore = newDetailedFeedback.reduce((acc, item) => acc + item.score, 0);
            const newMaxScore = questions.reduce((acc, q) => acc + (q.maxScore ?? 1), 0);

            const updatedFeedback: Feedback = {
                ...submission.feedback,
                detailedFeedback: newDetailedFeedback,
                totalScore: newTotalScore,
                maxScore: newMaxScore,
            };

            await onUpdateSubmission(submission.id, { 
                feedback: updatedFeedback,
                lastEditedByTeacherAt: Date.now() 
            });
            setIsEditing(false);
        });
    };

    const handleCancel = () => {
        const initialScores: { [questionId: string]: number } = {};
        const initialFeedbacks: { [questionId: string]: string } = {};
        submission.feedback.detailedFeedback.forEach(item => {
            const qId = item.questionId || questions.find(q => q.questionText === item.criterion)?.id;
            if (qId) {
                initialScores[qId] = item.score;
                initialFeedbacks[qId] = item.feedback;
            }
        });
        setEditedScores(initialScores);
        setEditedFeedbacks(initialFeedbacks);
        setIsEditing(false);
    };

    const isTeacherOrAdmin = currentUser.role === 'teacher' || currentUser.role === 'admin';

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-foreground">Chi tiết bài làm</h2>
                {isTeacherOrAdmin && !isEditing && (
                    <button onClick={() => setIsEditing(true)} className="btn-outline px-4 py-2 text-sm flex items-center gap-2">
                        <PencilIcon className="h-4 w-4" />
                        Chỉnh sửa chấm điểm
                    </button>
                )}
            </div>

            {questions.map((q, index) => {
                const answer = submission.answers?.find(a => a.questionId === q.id);
                const feedbackItem = submission.feedback.detailedFeedback.find(item => (item.questionId || questions.find(q_find => q_find.questionText === item.criterion)?.id) === q.id);
                const isCorrect = feedbackItem ? feedbackItem.score === (q.maxScore ?? 1) : false;
                
                return (
                    <div key={q.id} className="bg-card p-5 rounded-lg border border-border">
                        <p className="font-semibold text-foreground text-lg">Câu {index + 1}: {q.questionText}</p>
                        {q.questionType === 'multiple_choice' ? (
                            <div className="mt-3 space-y-2">
                                {q.options?.map(opt => {
                                    const isSelected = answer?.selectedOptionId === opt.id;
                                    const isCorrectAnswer = q.correctOptionId === opt.id;
                                    let stateClass = '';
                                    if (isSelected && !isCorrectAnswer) stateClass = 'bg-red-100 border-red-300';
                                    if (isCorrectAnswer) stateClass = 'bg-green-100 border-green-300';

                                    return (
                                        <div key={opt.id} className={`flex items-center gap-3 p-2 rounded-md border ${stateClass}`}>
                                            <input type="radio" checked={isSelected} readOnly className="form-radio" />
                                            <span>{opt.text}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="mt-2 p-3 bg-secondary rounded-md whitespace-pre-wrap">
                                {answer?.writtenAnswer || <span className="text-muted-foreground italic">Không có câu trả lời</span>}
                            </p>
                        )}
                        <div className={`mt-4 pt-4 border-t border-dashed ${isCorrect ? 'border-green-300' : 'border-red-300'}`}>
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex-grow">
                                    <div className="flex items-center gap-2">
                                        {isCorrect ? <CheckIcon /> : <XCircleIcon />}
                                        <h4 className="font-semibold text-foreground">Nhận xét của AI:</h4>
                                    </div>
                                    {isEditing ? (
                                        <textarea 
                                            value={editedFeedbacks[q.id] || ''}
                                            onChange={e => setEditedFeedbacks(prev => ({...prev, [q.id]: e.target.value}))}
                                            className="w-full p-2 mt-1 bg-background border border-border rounded-md"
                                            rows={2}
                                        />
                                    ) : (
                                        <p className="text-muted-foreground pl-8">{feedbackItem?.feedback}</p>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                     {isEditing ? (
                                        <input 
                                            type="number"
                                            value={editedScores[q.id] ?? 0}
                                            onChange={e => setEditedScores(prev => ({...prev, [q.id]: Number(e.target.value)}))}
                                            className="w-20 p-2 text-right font-bold text-lg text-primary bg-background rounded-md border border-border"
                                            max={q.maxScore || 1}
                                            min={0}
                                            step="0.25"
                                        />
                                     ) : (
                                        <span className={`font-bold text-lg px-3 py-1 rounded-full ${isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {feedbackItem?.score ?? 0}
                                        </span>
                                     )}
                                     <span className="font-semibold text-muted-foreground">/ {q.maxScore || 1} điểm</span>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
             {isEditing && (
                <div className="flex justify-end gap-4 pt-4 border-t border-border">
                    <button onClick={handleCancel} disabled={isPending} className="btn-secondary px-6 py-2">Hủy</button>
                    <button onClick={handleSave} disabled={isPending} className="btn-primary px-6 py-2">
                         {isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                </div>
            )}
        </div>
    );
};


export default function SubmissionResultPage({ params }: { params: { submissionId: string } }) {
    const { submissions, problems, users, currentUser, updateSubmission, isLoading } = useDataContext();
    const router = useRouter();

    const submission = submissions.find(s => s.id === params.submissionId);

    if (isLoading) {
        return <div className="container mx-auto p-8 text-center">Đang tải kết quả...</div>;
    }

    if (!submission || !currentUser) {
        // Let notFound handle it, or redirect if not found
        notFound();
        return null;
    }
    
    // Authorization check
    if (currentUser.role !== 'admin' && currentUser.role !== 'teacher' && currentUser.id !== submission.submitterId) {
        router.replace('/dashboard');
        return null;
    }

    const problem = problems.find(p => p.id === submission.problemId);
    const submitter = users.find(u => u.id === submission.submitterId);
    
    // FIX: Retrieve all submissions for the same problem to pass to the history component, not just from the current user.
    const historySubmissions = submissions
        .filter(s => s.problemId === submission.problemId && s.submitterId === submission.submitterId)
        .sort((a, b) => a.submittedAt - b.submittedAt);

    if (!problem || !submitter) {
        return <div className="container mx-auto p-8 text-center">Không thể tải dữ liệu bài nộp.</div>;
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            <Link href={`/problems/${problem.id}`} className="mb-6 text-primary font-semibold hover:underline inline-block">
                &larr; Quay lại bài tập "{problem.title}"
            </Link>
            <header className="mb-10 text-center">
                <h1 className="text-4xl font-bold text-foreground">Kết quả chấm bài</h1>
                <p className="text-muted-foreground mt-2">
                    Nộp bởi <strong>{submitter.displayName}</strong> vào lúc {new Date(submission.submittedAt).toLocaleString('vi-VN')}
                </p>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-8">
                    {problem.type === 'essay' && (
                         <div className="bg-card p-6 rounded-xl border border-border">
                            <h2 className="text-2xl font-bold text-foreground mb-4">Bài làm của học sinh</h2>
                            <div className="prose prose-slate max-w-none text-foreground/90 whitespace-pre-wrap">{submission.essay}</div>
                        </div>
                    )}
                    
                    {problem.type === 'essay' ? (
                        <EssayResult 
                            submission={submission} 
                            problem={problem} 
                            currentUser={currentUser}
                            onUpdateSubmission={updateSubmission}
                        />
                    ) : (
                         <ReadingComprehensionResult 
                            problem={problem}
                            submission={submission}
                            currentUser={currentUser}
                            onUpdateSubmission={updateSubmission}
                        />
                    )}
                </div>

                {/* Sidebar */}
                <div className="lg:col-span-1 space-y-8">
                     {submission.similarityCheck && problem.type === 'essay' && (
                        <SimilarityCheckDisplay similarityCheck={submission.similarityCheck} />
                     )}
                     <SubmissionHistory 
                        submissions={historySubmissions} 
                        currentSubmissionId={submission.id}
                     />
                </div>
            </main>
        </div>
    );
}