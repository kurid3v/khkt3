import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Exam, Problem, ExamAttempt, User, Submission } from '../types';
import Timer from '../components/Timer';
import { gradeEssay } from '../services/geminiService';

interface ExamTakingPageProps {
  exam: Exam;
  problems: Problem[];
  attempt: ExamAttempt;
  user: User;
  onUpdateAttempt: (attempt: ExamAttempt) => void;
  onFinishExam: (attempt: ExamAttempt, submissions: Submission[]) => void;
}

type AnswersState = { [problemId: string]: string };

const ExamTakingPage: React.FC<ExamTakingPageProps> = ({ exam, problems, attempt, user, onUpdateAttempt, onFinishExam }) => {
  const getInitialAnswers = (): AnswersState => {
      try {
        const saved = localStorage.getItem(`exam_answers_${attempt.id}`);
        return saved ? JSON.parse(saved) : {};
      } catch {
        return {};
      }
  };
    
  const [activeProblemId, setActiveProblemId] = useState<string>(problems[0]?.id || '');
  const [answers, setAnswers] = useState<AnswersState>(getInitialAnswers);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const attemptRef = useRef(attempt); // Use ref to keep track of the latest attempt state in callbacks

  useEffect(() => {
    attemptRef.current = attempt;
  }, [attempt]);
  
  // Persist answers to localStorage
  useEffect(() => {
    try {
        localStorage.setItem(`exam_answers_${attempt.id}`, JSON.stringify(answers));
    } catch (e) {
        console.error("Failed to save answers to localStorage", e);
    }
  }, [answers, attempt.id]);


  const handleFullscreenChange = useCallback(() => {
    if (!document.fullscreenElement) {
      console.log('Exited fullscreen at', new Date());
      const updatedAttempt: ExamAttempt = {
        ...attemptRef.current,
        fullscreenExits: [...attemptRef.current.fullscreenExits, Date.now()],
      };
      onUpdateAttempt(updatedAttempt);
    }
  }, [onUpdateAttempt]);

  useEffect(() => {
    // Enter fullscreen
    document.documentElement.requestFullscreen().catch(err => {
      console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
    });

    // Add listener
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    // Cleanup
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
    };
  }, [handleFullscreenChange]);

  const handleAnswerChange = (problemId: string, text: string) => {
    setAnswers(prev => ({ ...prev, [problemId]: text }));
  };

  const handleSubmitExam = useCallback(async () => {
    if(isSubmitting) return;
    setIsSubmitting(true);
    
    const newSubmissions: Submission[] = [];
    
    // Use a for...of loop to handle async sequentially
    for (const problem of problems) {
        const essayText = answers[problem.id] || '';
        if (essayText.trim()) { // Only grade if there's content
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
                    submitterId: user.id,
                    essay: essayText,
                    feedback,
                    submittedAt: Date.now(),
                    examId: exam.id,
                });

            } catch (error) {
                console.error(`Failed to grade essay for problem ${problem.id}:`, error);
                // Optionally create a submission with an error state
            }
        }
    }
    
    // Cleanup and finish
    localStorage.removeItem(`exam_answers_${attempt.id}`);
    onFinishExam(attemptRef.current, newSubmissions);

  }, [isSubmitting, problems, answers, user.id, exam.id, onFinishExam, attempt.id]);


  if (isSubmitting) {
      return (
          <div className="fixed inset-0 bg-white flex flex-col items-center justify-center text-center p-4">
              <div className="animate-spin rounded-full h-24 w-24 border-t-4 border-b-4 border-blue-500 mb-6"></div>
              <h1 className="text-3xl font-bold text-slate-800">Đang nộp bài...</h1>
              <p className="text-slate-600 mt-2 text-lg">Hệ thống đang chấm điểm các bài làm của bạn. Vui lòng không tắt trình duyệt.</p>
          </div>
      );
  }

  const activeProblem = problems.find(p => p.id === activeProblemId);

  return (
    <div className="fixed inset-0 bg-slate-100 flex flex-col p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <header className="flex-shrink-0 bg-white p-4 rounded-xl shadow-md flex justify-between items-center mb-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">{exam.title}</h1>
                <p className="text-slate-500">{user.name}</p>
            </div>
            <div className="text-right">
                <div className="font-semibold text-slate-700">Thời gian còn lại:</div>
                <Timer expiryTimestamp={exam.endTime} onExpire={handleSubmitExam} />
            </div>
        </header>

        {/* Main Content */}
        <div className="flex-grow flex gap-6 overflow-hidden">
            {/* Problem List */}
            <nav className="w-1/4 flex-shrink-0 bg-white rounded-xl shadow-md p-4 overflow-y-auto">
                <h2 className="text-lg font-bold text-slate-800 mb-3">Danh sách câu hỏi</h2>
                <ul className="space-y-2">
                    {problems.map((p, index) => (
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

            {/* Essay Area */}
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
        
        {/* Footer */}
        <footer className="flex-shrink-0 mt-6 flex justify-end">
            <button
                onClick={handleSubmitExam}
                className="px-8 py-4 bg-green-600 text-white font-bold text-lg rounded-lg shadow-lg hover:bg-green-700 transition-colors"
            >
                Nộp bài và kết thúc
            </button>
        </footer>
    </div>
  );
};

export default ExamTakingPage;