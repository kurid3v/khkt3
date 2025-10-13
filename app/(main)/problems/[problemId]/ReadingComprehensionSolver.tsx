'use client';
import React, { useState, useTransition } from 'react';
import type { Problem, User, Answer, Submission } from '@/types';
import { gradeReadingComprehension } from '@/services/geminiService';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';

interface ReadingComprehensionSolverProps {
  problem: Problem;
  user: Omit<User, 'password'>;
  onSubmissionComplete: (submissionData: Omit<Submission, 'id' | 'submittedAt'>) => Promise<void>;
}

const ReadingComprehensionSolver: React.FC<ReadingComprehensionSolverProps> = ({ problem, user, onSubmissionComplete }) => {
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [isGrading, setIsGrading] = useState<boolean>(false);
  const [isPending, startTransition] = useTransition();

  const isLoading = isGrading || isPending;
  const questions = problem.questions || [];

  const handleOptionChange = (questionId: string, optionId: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: optionId }));
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length !== questions.length) {
      setError('Vui lòng trả lời tất cả các câu hỏi.');
      return;
    }
    setError(null);
    setIsGrading(true);

    try {
      const formattedAnswers: Answer[] = Object.entries(answers).map(([questionId, selectedOptionId]) => ({
        questionId,
        selectedOptionId,
      }));

      const feedback = await gradeReadingComprehension(problem, formattedAnswers);

      const submissionData: Omit<Submission, 'id' | 'submittedAt'> = {
        problemId: problem.id,
        submitterId: user.id,
        answers: formattedAnswers,
        feedback: feedback,
        examId: problem.examId,
      };

      startTransition(async () => {
        await onSubmissionComplete(submissionData);
        setAnswers({});
        setIsGrading(false);
      });

    } catch (e) {
      console.error(e);
      setError('Đã xảy ra lỗi khi chấm bài. Vui lòng thử lại.');
      setIsGrading(false);
    }
  };

  return (
    <div className="bg-card p-6 sm:p-8 rounded-xl shadow-sm border border-border">
      <div className="space-y-6">
        {questions.map((q, index) => (
          <div key={q.id} className="border-b border-border pb-6 last:border-b-0">
            <p className="font-semibold text-foreground mb-3">
              Câu {index + 1}: {q.questionText}
            </p>
            <div className="space-y-2">
              {q.options.map(opt => (
                <label key={opt.id} className="flex items-center gap-3 p-3 rounded-md hover:bg-muted cursor-pointer has-[:checked]:bg-primary/10 has-[:checked]:border-primary border border-transparent">
                  <input
                    type="radio"
                    name={q.id}
                    value={opt.id}
                    checked={answers[q.id] === opt.id}
                    onChange={() => handleOptionChange(q.id, opt.id)}
                    className="form-radio h-4 w-4 text-primary focus:ring-primary disabled:opacity-50"
                    disabled={isLoading}
                  />
                  <span className="text-foreground">{opt.text}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8">
        {isLoading ? <LoadingSpinner /> : (
            error && <ErrorMessage message={error} />
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={isLoading || Object.keys(answers).length !== questions.length}
        className="w-full mt-6 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-lg shadow-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Đang chấm bài...' : 'Nộp bài'}
      </button>
    </div>
  );
};

export default ReadingComprehensionSolver;