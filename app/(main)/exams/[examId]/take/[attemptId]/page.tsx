'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDataContext } from '@/context/DataContext';
import { getExamAttempts } from '@/data/storage';
import type { ExamAttempt, Submission } from '@/types';
import Timer from '@/components/Timer';
import { gradeEssay } from '@/services/geminiService';
import ConfirmationModal from '@/components/ConfirmationModal';

type AnswersState = { [problemId: string]: string };

export default function ExamTakingPage({ params }: { params: { examId: string; attemptId: string } }) {
    const router = useRouter();
    const { exams, problems, examAttempts: attemptsFromContext, currentUser, updateExamAttempt, finishExamAttempt } = useDataContext();

    // RACE CONDITION FIX: Find attempt from context first. If not found, fallback to localStorage.
    let attempt = attemptsFromContext.find(a => a.id === params.attemptId);
    if (!attempt) {
        attempt = getExamAttempts().find(a => a.id === params.attemptId);
    }

    const exam = exams.find(e => e.id === params.examId);
    
    // FULLSCREEN FIX: State to track fullscreen status
    const [isFullscreenActive, setIsFullscreenActive] = useState(false);
    
    useEffect(() => {
        // Set initial state on mount
        setIsFullscreenActive(!!document.fullscreenElement);
    }, []);

    const getInitialAnswers = useCallback((): AnswersState => {
      if (!attempt) return {};
      try {
        const saved = localStorage.getItem(`exam_answers_${attempt.id}`);
        return saved ? JSON.parse(saved) : {};
      } catch {
        return {};
      }
    }, [attempt]);
    
    const [activeProblemId, setActiveProblemId] = useState<string>('');
    const [answers, setAnswers] = useState<AnswersState>(getInitialAnswers);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isExitModalOpen, setIsExitModalOpen] = useState(false);
    const attemptRef = useRef(attempt);

    useEffect(() => {
        if(attempt) {
            attemptRef.current = attempt;
        }
    }, [attempt]);

    const examProblems = problems.filter(p => p.examId === params.examId);

    useEffect(() => {
        if(examProblems.length > 0 && !activeProblemId) {
            setActiveProblemId(examProblems[0].id);
        }
    }, [examProblems, activeProblemId]);

    useEffect(() => {
        if (attempt) {
            setAnswers(getInitialAnswers());
        }
    }, [attempt, getInitialAnswers]);

    useEffect(() => {
        if (attempt) {
            try {
                localStorage.setItem(`exam_answers_${attempt.id}`, JSON.stringify(answers));
            } catch (e) {
                console.error("Failed to save answers to localStorage", e);
            }
        }
    }, [answers, attempt]);

    const handleAnswerChange = (problemId: string, text: string) => {
        setAnswers(prev => ({ ...prev, [problemId]: text }));
    };

    const handleFullscreenChange = useCallback(() => {
        setIsFullscreenActive(!!document.fullscreenElement);
        if (!document.fullscreenElement && attemptRef.current) {
            const updatedAttempt: ExamAttempt = {
                ...attemptRef.current,
                fullscreenExits: [...attemptRef.current.fullscreenExits, Date.now()],
            };
            updateExamAttempt(updatedAttempt);
        }
    }, [updateExamAttempt]);

    useEffect(() => {
        document.addEventListener('fullscreenchange', handleFullscreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            if (document.fullscreenElement) {
                document.exitFullscreen();
            }
        };
    }, [handleFullscreenChange]);

    const enterFullscreen = () => {
        document.documentElement.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            alert("Không thể vào chế độ toàn màn hình. Vui lòng bật quyền này trong cài đặt trình duyệt của bạn.");
        });
    };

    const handleExit = () => {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        }
        router.replace(`/exams/${params.examId}`);
    };

    const handleSubmitExam = useCallback(async () => {
        if (isSubmitting || !attemptRef.current || !currentUser || !exam) return;
        setIsSubmitting(true);
        
        const newSubmissions: Submission[] = [];
        
        for (const problem of examProblems) {
            const essayText = answers[problem.id] || '';
            if (essayText.trim()) {
                try {
                    const feedback = await gradeEssay(
                        problem.prompt,
                        essayText,
                        problem.rubricItems || [],
                        problem.rawRubric || '',
                        String(problem.customMaxScore || 10)
                    );

                    newSubmissions.push({
                        id: crypto.randomUUID(),
                        problemId: problem.id,
                        submitterId: currentUser.id,
                        essay: essayText,
                        feedback,
                        submittedAt: Date.now(),
                        examId: exam.id,
                    });
                } catch (error) {
                    console.error(`Failed to grade essay for problem ${problem.id}:`, error);
                }
            }
        }
        
        if (attempt) {
            localStorage.removeItem(`exam_answers_${attempt.id}`);
        }
        finishExamAttempt(attemptRef.current, newSubmissions);
        router.replace(`/exams/${exam.id}`);

    }, [isSubmitting, examProblems, answers, currentUser, exam, finishExamAttempt, router, attempt]);
    
    if (!exam || !attempt || !currentUser) {
        return (
             <div className="fixed inset-0 bg-white flex items-center justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
                <p className="ml-4 text-slate-600 text-lg">Đang tải phiên làm bài...</p>
            </div>
        )
    }

    if (!isFullscreenActive) {
        return (
            <div className="fixed inset-0 bg-slate-900 text-white flex flex-col items-center justify-center text-center p-4 z-50">
                <h1 className="text-4xl font-bold">Chế độ toàn màn hình là bắt buộc</h1>
                <p className="text-xl mt-4 max-w-2xl">Để đảm bảo tính toàn vẹn của kỳ thi, bạn phải làm bài ở chế độ toàn màn hình. Mọi hành vi thoát khỏi chế độ toàn màn hình sẽ được ghi lại.</p>
                <button
                    onClick={enterFullscreen}
                    className="mt-8 px-8 py-4 bg-blue-600 text-white font-bold text-lg rounded-lg shadow-lg hover:bg-blue-700 transition-colors"
                >
                    Bắt đầu làm bài (Toàn màn hình)
                </button>
            </div>
        );
    }

    if (isSubmitting) {
        return (
            <div className="fixed inset-0 bg-white flex flex-col items-center justify-center text-center p-4">
                <div className="animate-spin rounded-full h-24 w-24 border-t-4 border-b-4 border-blue-500 mb-6"></div>
                <h1 className="text-3xl font-bold text-slate-800">Đang nộp bài...</h1>
                <p className="text-slate-600 mt-2 text-lg">Hệ thống đang chấm điểm các bài làm của bạn. Vui lòng không tắt trình duyệt.</p>
            </div>
        );
    }

    const activeProblem = examProblems.find(p => p.id === activeProblemId);

    return (
        <>
            <div className="fixed inset-0 bg-slate-100 flex flex-col p-4 sm:p-6 lg:p-8">
                <header className="flex-shrink-0 bg-white p-4 rounded-xl shadow-md flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">{exam.title}</h1>
                        <p className="text-slate-500">{currentUser.name}</p>
                    </div>
                    <div className="text-right">
                        <div className="font-semibold text-slate-700">Thời gian còn lại:</div>
                        <Timer expiryTimestamp={exam.endTime} onExpire={handleSubmitExam} />
                    </div>
                </header>

                <div className="flex-grow flex gap-6 overflow-hidden">
                    <nav className="w-1/4 flex-shrink-0 bg-white rounded-xl shadow-md p-4 overflow-y-auto">
                        <h2 className="text-lg font-bold text-slate-800 mb-3">Danh sách câu hỏi</h2>
                        <ul className="space-y-2">
                            {examProblems.map((p, index) => (
                                <li key={p.id}>
                                    <button 
                                        onClick={() => setActiveProblemId(p.id)}
                                        className={`w-full text-left p-3 rounded-lg font-semibold transition-colors ${
                                            activeProblemId === p.id 
                                            ? 'bg-blue-600 text-white' 
                                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                        }`}
                                    >
                                    Câu {index + 1}: {p.title}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    <div className="w-3/4 flex-grow flex flex-col bg-white rounded-xl shadow-md overflow-hidden">
                        {activeProblem ? (
                            <>
                                <div className="p-4 border-b border-slate-200 flex-shrink-0">
                                    <h3 className="font-bold text-lg text-slate-900">{activeProblem.title}</h3>
                                    <p className="text-slate-600 whitespace-pre-wrap mt-1">{activeProblem.prompt}</p>
                                </div>
                                <textarea
                                    value={answers[activeProblemId] || ''}
                                    onChange={(e) => handleAnswerChange(activeProblemId, e.target.value)}
                                    placeholder="Nhập câu trả lời của bạn vào đây..."
                                    className="w-full h-full flex-grow p-4 resize-none border-0 focus:ring-0 text-lg leading-relaxed"
                                />
                            </>
                        ) : (
                            <div className="flex items-center justify-center h-full">
                                <p className="text-slate-500">Chọn một câu hỏi để bắt đầu.</p>
                            </div>
                        )}
                    </div>
                </div>
                
                <footer className="flex-shrink-0 mt-6 flex justify-between items-center">
                    <button
                        onClick={() => setIsExitModalOpen(true)}
                        className="px-6 py-3 bg-slate-600 text-white font-semibold rounded-lg shadow-lg hover:bg-slate-700 transition-colors"
                    >
                        Thoát
                    </button>
                    <button
                        onClick={handleSubmitExam}
                        className="px-8 py-4 bg-green-600 text-white font-bold text-lg rounded-lg shadow-lg hover:bg-green-700 transition-colors"
                    >
                        Nộp bài và kết thúc
                    </button>
                </footer>
            </div>
            <ConfirmationModal
                isOpen={isExitModalOpen}
                onClose={() => setIsExitModalOpen(false)}
                onConfirm={handleExit}
                title="Xác nhận thoát"
                message="Tiến trình của bạn đã được lưu. Bạn có thể quay lại làm bài thi sau, miễn là vẫn còn thời gian."
                confirmButtonText="Xác nhận"
                confirmButtonClass="bg-yellow-600 hover:bg-yellow-700"
            />
        </>
    );
};