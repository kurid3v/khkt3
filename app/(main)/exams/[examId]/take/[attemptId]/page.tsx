







'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDataContext } from '@/context/DataContext';
import type { ExamAttempt, Submission } from '@/types';
import Timer from '@/components/Timer';
import { gradeEssay } from '@/services/geminiService';
import ConfirmationModal from '@/components/ConfirmationModal';

type AnswersState = { [problemId: string]: string };

export default function ExamTakingPage({ params }: { params: { examId: string; attemptId: string } }) {
    const router = useRouter();
    const { 
        exams, 
        problems, 
        examAttempts, 
        currentUser, 
        recordFullscreenExit, 
        recordVisibilityChange, 
        finishExamAttempt 
    } = useDataContext();

    const attempt = examAttempts.find(a => a.id === params.attemptId);
    const exam = exams.find(e => e.id === params.examId);
    const examProblems = problems.filter(p => p.examId === params.examId);

    const [isFullscreenActive, setIsFullscreenActive] = useState(true); // Assume true initially
    
    const getInitialAnswers = useCallback((): AnswersState => {
      if (!attempt) return {};
      try {
        const saved = localStorage.getItem(`exam_answers_${attempt.id}`);
        return saved ? JSON.parse(saved) : {};
      } catch {
        return {};
      }
    }, [attempt]);
    
    const [activeProblemId, setActiveProblemId] = useState<string>(examProblems[0]?.id || '');
    const [answers, setAnswers] = useState<AnswersState>(getInitialAnswers);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isExitModalOpen, setIsExitModalOpen] = useState(false);
    const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
    const attemptRef = useRef(attempt);

    useEffect(() => {
        if(attempt) attemptRef.current = attempt;
    }, [attempt]);

    useEffect(() => {
        if (attempt) {
            localStorage.setItem(`exam_answers_${attempt.id}`, JSON.stringify(answers));
        }
    }, [answers, attempt]);

    const handleAnswerChange = (problemId: string, text: string) => {
        setAnswers(prev => ({ ...prev, [problemId]: text }));
    };
    
    const handleFullscreenChange = useCallback(() => {
        const isFullscreen = !!document.fullscreenElement;
        setIsFullscreenActive(isFullscreen);
        if (!isFullscreen && attemptRef.current) {
            recordFullscreenExit(attemptRef.current.id);
        }
    }, [recordFullscreenExit]);

    const handleVisibilityChange = useCallback(() => {
        if (document.visibilityState === 'hidden' && attemptRef.current) {
            recordVisibilityChange(attemptRef.current.id);
        }
    }, [recordVisibilityChange]);
    
    useEffect(() => {
        // Must be in fullscreen to start with
        if(!document.fullscreenElement) {
            setIsFullscreenActive(false);
        }
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (document.fullscreenElement) {
                document.exitFullscreen();
            }
        };
    }, [handleFullscreenChange, handleVisibilityChange]);

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
        const submissionTime = Date.now();
        
        for (const problem of examProblems) {
            const essayText = answers[problem.id] || '';
            if (essayText.trim()) {
                try {
                    // FIX: Correctly call `gradeEssay` with `problem.id` and handle the returned object.
                    const result = await gradeEssay(
                        problem.id,
                        problem.prompt!,
                        essayText,
                        problem.rubricItems || [],
                        problem.rawRubric || '',
                        String(problem.customMaxScore || 10)
                    );

                    // FIX: Use `result.feedback` for the feedback property and include `result.similarityCheck`.
                    newSubmissions.push({
                        id: crypto.randomUUID(),
                        problemId: problem.id,
                        submitterId: currentUser.id,
                        essay: essayText,
                        feedback: result.feedback,
                        similarityCheck: result.similarityCheck,
                        submittedAt: submissionTime,
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
        await finishExamAttempt(attemptRef.current, newSubmissions);
        router.replace(`/exams/${exam.id}`);

    }, [isSubmitting, examProblems, answers, currentUser, exam, finishExamAttempt, router, attempt]);
    
    if (!exam || !attempt || !currentUser) {
        return (
             <div className="fixed inset-0 bg-white flex items-center justify-center">
                <div className="rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
                <p className="ml-4 text-slate-600 text-lg">Đang tải phiên làm bài...</p>
            </div>
        )
    }

    if (!isFullscreenActive) {
        return (
            <div className="fixed inset-0 bg-slate-900 text-white flex flex-col items-center justify-center text-center p-4 z-50">
                <h1 className="text-4xl font-bold">Chế độ toàn màn hình là bắt buộc</h1>
                <p className="text-xl mt-4 max-w-2xl">Để đảm bảo tính toàn vẹn của kỳ thi, bạn phải làm bài ở chế độ toàn màn hình. Mọi hành vi thoát khỏi chế độ toàn màn hình hoặc chuyển sang cửa sổ khác sẽ được ghi lại.</p>
                <button
                    onClick={enterFullscreen}
                    className="mt-8 px-8 py-4 bg-blue-600 text-white font-bold text-lg rounded-lg shadow-lg hover:bg-blue-700"
                >
                    Vào chế độ toàn màn hình
                </button>
                 <button
                    onClick={handleExit}
                    className="mt-4 px-6 py-2 bg-transparent text-slate-300 font-semibold rounded-lg hover:bg-slate-800"
                >
                    Thoát
                </button>
            </div>
        );
    }

    if (isSubmitting) {
        return (
            <div className="fixed inset-0 bg-white flex flex-col items-center justify-center text-center p-4">
                <div className="rounded-full h-24 w-24 border-t-4 border-b-4 border-blue-500 mb-6"></div>
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
                        <p className="text-slate-500">{currentUser.displayName}</p>
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
                                        className={`w-full text-left p-3 rounded-lg font-semibold ${
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
                                    onPaste={activeProblem.disablePaste ? (e) => e.preventDefault() : undefined}
                                    title={activeProblem.disablePaste ? "Dán văn bản đã bị vô hiệu hóa cho bài tập này." : ""}
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
                        className="px-6 py-3 bg-slate-600 text-white font-semibold rounded-lg shadow-lg hover:bg-slate-700"
                    >
                        Thoát
                    </button>
                    <button
                        onClick={() => setIsSubmitModalOpen(true)}
                        className="px-8 py-4 bg-green-600 text-white font-bold text-lg rounded-lg shadow-lg hover:bg-green-700"
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
            <ConfirmationModal
                isOpen={isSubmitModalOpen}
                onClose={() => setIsSubmitModalOpen(false)}
                onConfirm={handleSubmitExam}
                title="Xác nhận nộp bài"
                message="Bạn có chắc chắn muốn nộp bài và kết thúc bài thi không? Hành động này không thể hoàn tác."
                confirmButtonText="Nộp bài"
                confirmButtonClass="bg-green-600 hover:bg-green-700"
            />
        </>
    );
};