
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDataContext } from '@/context/DataContext';
import FeedbackDisplay from '@/components/FeedbackDisplay';
import LightBulbIcon from '@/components/icons/LightBulbIcon';
import type { Question, Answer, User, Submission, Problem, DetailedFeedbackItem, Feedback } from '@/types';
import CheckIcon from '@/components/icons/CheckIcon';
import XCircleIcon from '@/components/icons/XCircleIcon';
import SimilarityCheckDisplay from '@/components/SimilarityCheckDisplay';
import PencilIcon from '@/components/icons/PencilIcon';

const ReadingComprehensionResult: React.FC<{ 
    problem: Problem, 
    submission: Submission,
    currentUser: Omit<User, 'password'>,
    onUpdateSubmission: (submissionId: string, updatedData: Partial<Submission>) => Promise<void>;
}> = ({ problem, submission, currentUser, onUpdateSubmission }) => {
    const questions: Question[] = problem.questions || [];
    const [isEditing, setIsEditing] = useState(false);
    // Use questionId as key for robustness
    const [editedScores, setEditedScores] = useState<{ [questionId: string]: number }>({});
    const [editedFeedbacks, setEditedFeedbacks] = useState<{ [questionId: string]: string }>({});

    useEffect(() => {
        const initialScores: { [questionId: string]: number } = {};
        const initialFeedbacks: { [questionId: string]: string } = {};
        
        submission.feedback.detailedFeedback.forEach(item => {
            // Prioritize questionId if it exists, fall back to matching text for older data
            const qId = item.questionId || questions.find(q => q.questionText === item.criterion)?.id;
            if (qId) {
                initialScores[qId] = item.score;
                initialFeedbacks[qId] = item.feedback;
            }
        });
        setEditedScores(initialScores);
        setEditedFeedbacks(initialFeedbacks);
    }, [submission, questions]);

    const handleSave = async () => {
        const newDetailedFeedback: DetailedFeedbackItem[] = questions.map(q => {
            const score = editedScores[q.id] ?? 0;
            const feedback = editedFeedbacks[q.id] ?? '';
            const originalFeedback = submission.feedback.detailedFeedback.find(item => (item.questionId || questions.find(q => q.questionText === item.criterion)?.id) === q.id);
            return {
                ...(originalFeedback || { criterion: q.questionText }),
                questionId: q.id,
                score,
                feedback,
            };
        });

        const newTotalScore = newDetailedFeedback.reduce((acc, item) => acc + item.score, 0);

        const newMaxScore = questions.reduce((acc, q) => {
            if (q.questionType === 'multiple_choice') return acc + 1;
            return acc + (q.maxScore || 1);
        }, 0);

        const updatedFeedback: Feedback = {
            ...submission.feedback,
            detailedFeedback: newDetailedFeedback,
            totalScore: newTotalScore,
            maxScore: newMaxScore,
        };

        await onUpdateSubmission(submission.id, { feedback: updatedFeedback });
        setIsEditing(false);
    };

    const handleCancel = () => {
        // Same logic as useEffect to reset state
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

    return (
        <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
            <div className="flex justify-between items-center mb-6">
                 <h2 className="text-2xl font-bold text-foreground">Kết quả Đọc hiểu</h2>
                 {(currentUser.role === 'teacher' || currentUser.role === 'admin') && !isEditing && (
                     <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-4 py-2 text-sm bg-secondary text-secondary-foreground font-semibold rounded-md hover:bg-muted">
                        <PencilIcon className="h-4 w-4" /> Sửa điểm
                    </button>
                 )}
            </div>
           
            <div className="prose prose-slate max-w-none mb-8 p-4 bg-secondary/30 rounded-lg">
                <h3 className="font-semibold">Đoạn văn</h3>
                <p>{problem.passage}</p>
            </div>
            <div className="space-y-6">
            {questions.map((q, index) => {
                const answer = submission.answers?.find(a => a.questionId === q.id);
                const originalFeedbackItem = submission.feedback.detailedFeedback.find(f => (f.questionId || questions.find(q => q.questionText === f.criterion)?.id) === q.id);
                const maxScore = q.questionType === 'multiple_choice' ? 1 : (q.maxScore || 1);
                const isCorrect = originalFeedbackItem ? originalFeedbackItem.score === maxScore : false;
                
                let borderColorClass = 'border-border';
                if (originalFeedbackItem) {
                    const percentage = maxScore > 0 ? (originalFeedbackItem.score / maxScore) * 100 : 0;
                    if (percentage >= 80) borderColorClass = 'border-green-400';
                    else if (percentage >= 50) borderColorClass = 'border-yellow-400';
                    else borderColorClass = 'border-red-400';
                }

                return (
                    <div key={q.id} className={`bg-card p-5 rounded-lg border-l-4 shadow-sm ${borderColorClass}`}>
                        <div className="flex justify-between items-start gap-4">
                            <p className="font-semibold text-foreground flex-1">Câu {index + 1}: {q.questionText}</p>
                            <div className="flex items-center gap-2">
                                {isEditing && q.questionType === 'short_answer' && (
                                    <>
                                        <input 
                                            type="number"
                                            value={editedScores[q.id] ?? ''}
                                            onChange={e => {
                                                const score = parseFloat(e.target.value);
                                                const clampedScore = isNaN(score) ? 0 : Math.max(0, Math.min(score, maxScore));
                                                setEditedScores(prev => ({...prev, [q.id]: clampedScore }))
                                            }}
                                            className="w-20 p-1 border border-border rounded-md text-center font-bold"
                                            step="0.25"
                                            max={maxScore}
                                            min="0"
                                        />
                                         <span className="font-semibold text-muted-foreground">/ {maxScore}</span>
                                    </>
                                )}
                                {!isEditing && (
                                    <span className={`font-bold text-lg px-3 py-1 rounded-full whitespace-nowrap ${isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {originalFeedbackItem?.score.toFixed(2).replace(/\.00$/, '') ?? 'N/A'} / {maxScore}
                                    </span>
                                )}
                            </div>
                        </div>
                        
                        <div className="mt-4 space-y-4">
                        {q.questionType === 'multiple_choice' ? (
                            <div className="space-y-2">
                                {q.options?.map(opt => {
                                    const isSelected = answer?.selectedOptionId === opt.id;
                                    const isCorrectAnswer = q.correctOptionId === opt.id;
                                    let stateClass = 'bg-background';
                                    if (isSelected && !isCorrectAnswer) stateClass = 'bg-red-100 border-red-300';
                                    if (isCorrectAnswer) stateClass = 'bg-green-100 border-green-300';
                                    
                                    return (
                                        <div key={opt.id} className={`flex items-start gap-3 p-3 rounded-md border ${stateClass}`}>
                                            <div className="flex-shrink-0 mt-1 h-6 w-6 text-slate-700">
                                                {isCorrectAnswer ? <CheckIcon /> : (isSelected ? <XCircleIcon /> : <div className="w-6 h-6" />)}
                                            </div>
                                            <span className="text-foreground">{opt.text}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : ( // Short answer
                             <div className="space-y-4">
                                <div className="p-4 bg-background rounded-lg border border-border">
                                    <p className="text-sm font-semibold text-muted-foreground mb-1">Câu trả lời của học sinh</p>
                                    <p className="text-foreground whitespace-pre-wrap">{answer?.writtenAnswer || 'Không có câu trả lời.'}</p>
                                </div>
                                {q.gradingCriteria && (
                                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                                        <p className="text-sm font-semibold text-green-800 mb-1">Đáp án mẫu / Tiêu chí chấm</p>
                                        <p className="text-green-900 whitespace-pre-wrap">{q.gradingCriteria}</p>
                                    </div>
                                )}
                                <div className="p-4 bg-blue-50/50 rounded-lg border border-blue-200">
                                    <p className="text-sm font-semibold text-blue-800 mb-1">Nhận xét</p>
                                    {isEditing ? (
                                        <textarea 
                                            value={editedFeedbacks[q.id] || ''}
                                            onChange={e => setEditedFeedbacks(prev => ({...prev, [q.id]: e.target.value}))}
                                            className="w-full p-2 bg-white border border-border rounded-md text-sm"
                                            rows={3}
                                            placeholder="Nhập nhận xét của bạn..."
                                        />
                                    ) : (
                                        <p className="text-blue-900 whitespace-pre-wrap">{originalFeedbackItem?.feedback}</p>
                                    )}
                                </div>
                             </div>
                        )}
                        </div>
                    </div>
                );
            })}
            </div>
            {isEditing && (
                <div className="mt-6 flex justify-end gap-4">
                    <button onClick={handleCancel} className="px-6 py-2.5 bg-secondary text-secondary-foreground font-semibold rounded-lg hover:bg-muted">Hủy</button>
                    <button onClick={handleSave} className="px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg shadow-md hover:bg-primary/90">Lưu thay đổi</button>
                </div>
            )}
        </div>
    );
};

const EssayResult: React.FC<{ 
    problem: Problem, 
    submission: Submission,
    currentUser: Omit<User, 'password'>,
    onUpdateSubmission: (submissionId: string, updatedData: Partial<Submission>) => Promise<void>;
}> = ({ problem, submission, currentUser, onUpdateSubmission }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedFeedback, setEditedFeedback] = useState<Feedback>(submission.feedback);

    useEffect(() => {
        setEditedFeedback(submission.feedback);
    }, [submission]);

    const handleItemChange = (index: number, field: 'score' | 'feedback', value: string | number) => {
        const newDetailedFeedback = [...editedFeedback.detailedFeedback];
        const updatedItem = { ...newDetailedFeedback[index] };
        if (field === 'score') {
            updatedItem.score = Number(value);
        } else {
            updatedItem.feedback = String(value);
        }
        newDetailedFeedback[index] = updatedItem;
        setEditedFeedback(prev => ({ ...prev, detailedFeedback: newDetailedFeedback }));
    };

    const handleGeneralSuggestionsChange = (suggestions: string) => {
        setEditedFeedback(prev => ({ ...prev, generalSuggestions: suggestions.split('\n').filter(s => s.trim() !== '') }));
    };

    const handleSave = async () => {
        const newTotalScoreRaw = editedFeedback.detailedFeedback.reduce((acc, item) => acc + (Number(item.score) || 0), 0);
        
        let finalTotalScore = newTotalScoreRaw;
        const rubricTotal = problem.rubricItems?.reduce((acc, item) => acc + item.maxScore, 0) || 0;
        const targetMaxScore = problem.customMaxScore || 10;
        
        if (rubricTotal > 0 && rubricTotal !== targetMaxScore) {
             finalTotalScore = (newTotalScoreRaw / rubricTotal) * targetMaxScore;
        } else {
            finalTotalScore = Math.min(newTotalScoreRaw, targetMaxScore);
        }

        const finalFeedback = {
            ...editedFeedback,
            totalScore: Math.round(finalTotalScore * 100) / 100, // Round to 2 decimal places
            maxScore: targetMaxScore,
        };

        await onUpdateSubmission(submission.id, { feedback: finalFeedback });
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditedFeedback(submission.feedback);
        setIsEditing(false);
    };
    
    const feedbackToDisplay = isEditing ? editedFeedback : submission.feedback;

    return (
        <div className="space-y-8">
            <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-foreground">Kết quả Bài làm văn</h2>
                     {(currentUser.role === 'teacher' || currentUser.role === 'admin') && !isEditing && (
                         <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-4 py-2 text-sm bg-secondary text-secondary-foreground font-semibold rounded-md hover:bg-muted">
                            <PencilIcon className="h-4 w-4" /> Sửa điểm
                        </button>
                     )}
                </div>
                 <div className="prose prose-slate max-w-none mb-8 p-4 bg-secondary/30 rounded-lg">
                    <h3 className="font-semibold">Đề bài</h3>
                    <p>{problem.prompt}</p>
                 </div>
                 <div className="mb-8">
                    <h3 className="text-xl font-semibold text-foreground mb-3">Bài làm của học sinh</h3>
                    <div className="p-4 bg-background rounded-lg border border-border text-foreground whitespace-pre-wrap">
                        {submission.essay}
                    </div>
                </div>
            </div>
            
            {submission.similarityCheck && (
                <SimilarityCheckDisplay similarityCheck={submission.similarityCheck} />
            )}
            
            {isEditing 
                ? <EditableFeedbackView problem={problem} feedback={editedFeedback} onItemChange={handleItemChange} onSuggestionsChange={handleGeneralSuggestionsChange} onSave={handleSave} onCancel={handleCancel} />
                : <FeedbackDisplay feedback={submission.feedback} problem={problem} />
            }

        </div>
    );
};

const EditableFeedbackView: React.FC<{
    problem: Problem,
    feedback: Feedback,
    onItemChange: (index: number, field: 'score' | 'feedback', value: string | number) => void,
    onSuggestionsChange: (value: string) => void,
    onSave: () => void,
    onCancel: () => void,
}> = ({ problem, feedback, onItemChange, onSuggestionsChange, onSave, onCancel }) => {
    const currentTotalScore = feedback.detailedFeedback.reduce((acc, item) => acc + (Number(item.score) || 0), 0);
    return (
      <div className="space-y-8">
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-foreground mb-3 flex items-center gap-2">
              <PencilIcon />
              Phân tích chi tiết (Chế độ sửa)
          </h3>
          {feedback.detailedFeedback.map((item, index) => {
            let itemMaxScore = 0;
            if (problem?.type === 'essay' && problem.rubricItems && problem.rubricItems.length > 0) {
              const rubricItem = problem.rubricItems.find(r => r.criterion === item.criterion);
              itemMaxScore = rubricItem?.maxScore ?? (problem.rubricItems[index]?.maxScore || 0);
            }
            return (
              <div key={index} className="bg-card p-5 rounded-lg border border-border shadow-sm">
                  <div className="flex justify-between items-start mb-2 gap-4">
                      <h4 className="font-semibold text-lg text-foreground flex-1">{item.criterion}</h4>
                      <div className="flex items-center gap-2">
                        <input 
                            type="number" 
                            value={item.score}
                            onChange={e => onItemChange(index, 'score', e.target.value)}
                            className="w-24 p-2 border border-border rounded-md text-right font-bold"
                            step="0.25"
                            max={itemMaxScore > 0 ? itemMaxScore : undefined}
                        />
                        {itemMaxScore > 0 && <span className="font-semibold text-muted-foreground">/ {itemMaxScore}</span>}
                      </div>
                  </div>
                  <textarea 
                    value={item.feedback}
                    onChange={e => onItemChange(index, 'feedback', e.target.value)}
                    className="w-full mt-1 p-2 bg-background border border-border rounded-md text-sm"
                    rows={3}
                  />
              </div>
            );
          })}
           <div className="mt-2 text-right font-semibold text-foreground">Tổng điểm thô: {currentTotalScore.toFixed(2)}</div>
        </div>
        
        <div className="bg-blue-50 p-6 rounded-lg border-l-4 border-blue-400">
            <h3 className="text-xl font-semibold flex items-center gap-3 mb-3 text-blue-800">
                <LightBulbIcon />
                Gợi ý chung
            </h3>
            <textarea 
              value={feedback.generalSuggestions.join('\n')}
              onChange={e => onSuggestionsChange(e.target.value)}
              className="w-full p-2 bg-white border border-blue-200 rounded-md"
              rows={4}
              placeholder="Nhập mỗi gợi ý trên một dòng."
            />
        </div>

        <div className="mt-6 flex justify-end gap-4">
            <button onClick={onCancel} className="px-6 py-2.5 bg-secondary text-secondary-foreground font-semibold rounded-lg hover:bg-muted">Hủy</button>
            <button onClick={onSave} className="px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg shadow-md hover:bg-primary/90">Lưu thay đổi</button>
        </div>
      </div>
    )
}

export default function SubmissionResultPage({ params }: { params: { submissionId: string } }) {
    const router = useRouter();
    const { submissions, problems, users, currentUser, updateSubmission, isLoading } = useDataContext();

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Đang tải dữ liệu...</p>
            </div>
        );
    }

    if (!currentUser) {
        router.replace('/login');
        return null;
    }

    const submission = submissions.find(s => s.id === params.submissionId);
    if (!submission) {
        return <p className="p-8">Không tìm thấy bài nộp.</p>;
    }
    
    const problem = problems.find(p => p.id === submission.problemId);
    if (!problem) {
        return <p className="p-8">Không tìm thấy bài tập liên quan.</p>;
    }

    const submitter = users.find(u => u.id === submission.submitterId);
    const backPath = problem.examId ? `/exams/${problem.examId}` : `/problems/${problem.id}`;
    const backButtonText = problem.examId ? 'Quay lại đề thi' : 'Quay lại bài tập';

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <Link href={backPath} className="mb-6 text-primary font-semibold hover:underline inline-block">
                &larr; {backButtonText}
            </Link>

            <header className="mb-8">
                <h1 className="text-3xl font-bold text-foreground">{problem.title}</h1>
                <p className="text-muted-foreground mt-2">
                    Bài nộp của <span className="font-semibold">{submitter?.displayName || 'Không rõ'}</span> lúc {new Date(submission.submittedAt).toLocaleString('vi-VN')}
                </p>
            </header>

            {submission.essay ? (
                <EssayResult problem={problem} submission={submission} currentUser={currentUser} onUpdateSubmission={updateSubmission} />
            ) : (
                <ReadingComprehensionResult problem={problem} submission={submission} currentUser={currentUser} onUpdateSubmission={updateSubmission} />
            )}
        </div>
    );
}
