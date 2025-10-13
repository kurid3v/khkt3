'use client';
import React, { useState, useTransition } from 'react';
import type { Submission, Problem, User } from '@/types';
import { gradeEssay } from '@/services/geminiService';
import EssayInput from './EssayInput';
import FeedbackDisplay from './FeedbackDisplay';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';

interface StudentGraderViewProps {
  problem: Problem;
  user: Omit<User, 'password'>;
  onSubmissionComplete: (submissionData: Omit<Submission, 'id' | 'submittedAt'>) => Promise<void>;
}

const StudentGraderView: React.FC<StudentGraderViewProps> = ({ problem, user, onSubmissionComplete }) => {
  const [essay, setEssay] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isGrading, setIsGrading] = useState<boolean>(false);

  const isLoading = isPending || isGrading;

  const handleGradeEssay = async () => {
    if (!essay.trim()) {
      setError('Vui lòng nhập nội dung bài văn.');
      return;
    }

    setIsGrading(true);
    setError(null);

    try {
      const result = await gradeEssay(
          problem.prompt, 
          essay, 
          problem.rubricItems || [], 
          problem.rawRubric || '', 
          String(problem.customMaxScore || '10')
      );
      
      const newSubmissionData: Omit<Submission, 'id' | 'submittedAt'> = {
        problemId: problem.id,
        submitterId: user.id,
        essay: essay,
        feedback: result,
        examId: problem.examId,
        // Similarity check is now removed from student submission flow
      };

      // Use a transition to call the server action, preventing UI blocking
      startTransition(async () => {
        await onSubmissionComplete(newSubmissionData);
        // After submission, clear the essay field for the next attempt
        setEssay(''); 
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
      <EssayInput
        essay={essay}
        setEssay={setEssay}
        onSubmit={handleGradeEssay}
        isLoading={isLoading}
      />

      <div className="mt-8">
        {isLoading && <LoadingSpinner />}
        {error && !isLoading && <ErrorMessage message={error} />}
      </div>
    </div>
  );
};

export default StudentGraderView;