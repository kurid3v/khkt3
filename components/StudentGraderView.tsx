
'use client';
import React, { useState } from 'react';
import type { Feedback, Submission, Problem, User } from '@/types';
import { gradeEssay } from '@/services/geminiService';
import EssayInput from './EssayInput';
import FeedbackDisplay from './FeedbackDisplay';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';

interface StudentGraderViewProps {
  problem: Problem;
  user: User;
  onSubmissionComplete: (submissionData: Omit<Submission, 'id' | 'submittedAt'>) => void;
}

const StudentGraderView: React.FC<StudentGraderViewProps> = ({ problem, user, onSubmissionComplete }) => {
  const [essay, setEssay] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleGradeEssay = async () => {
    if (!essay.trim()) {
      setError('Vui lòng nhập nội dung bài văn.');
      return;
    }

    setIsLoading(true);
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
      };
      // Let the parent component handle the new submission and navigation
      onSubmissionComplete(newSubmissionData);

    } catch (e) {
      console.error(e);
      setError('Đã xảy ra lỗi khi chấm bài. Vui lòng thử lại.');
      setIsLoading(false); // Make sure loading stops on error
    } 
    // No finally block to set isLoading to false, because we are navigating away on success.
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg">
      <EssayInput
        essay={essay}
        setEssay={setEssay}
        onSubmit={handleGradeEssay}
        isLoading={isLoading}
      />

      <div className="mt-8">
        {isLoading && <LoadingSpinner />}
        {error && <ErrorMessage message={error} />}
      </div>
    </div>
  );
};

export default StudentGraderView;
