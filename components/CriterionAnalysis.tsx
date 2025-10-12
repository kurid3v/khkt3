'use client';
import React, { useState, useEffect } from 'react';
import type { Problem, Submission, RubricItem } from '@/types';
import ChartBarIcon from './icons/ChartBarIcon';
import { parseRubric } from '@/services/geminiService';

// Helper type for parsed items without an ID
type ParsedRubricItem = Omit<RubricItem, 'id'>;

interface CriterionAnalysisProps {
  problem: Problem;
  submissions: Submission[];
}

const CriterionAnalysis: React.FC<CriterionAnalysisProps> = ({ problem, submissions }) => {
  const [criteria, setCriteria] = useState<(RubricItem | ParsedRubricItem)[] | null>(null);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parsingError, setParsingError] = useState<string | null>(null);

  useEffect(() => {
    // Reset state when problem changes
    setCriteria(null);
    setIsParsing(false);
    setParsingError(null);

    // Case 1: Use manually defined rubric items
    if (problem.rubricItems && problem.rubricItems.length > 0) {
      setCriteria(problem.rubricItems);
      return;
    }

    // Case 2: Parse raw rubric text
    if (problem.rawRubric && problem.rawRubric.trim()) {
      const performParsing = async () => {
        setIsParsing(true);
        try {
          const parsedItems = await parseRubric(problem.rawRubric!);
          if (parsedItems.length === 0) {
             setParsingError("AI không tìm thấy tiêu chí chấm điểm nào trong hướng dẫn chấm được cung cấp.");
          } else {
             setCriteria(parsedItems);
          }
        } catch (error) {
          console.error("Failed to parse rubric:", error);
          setParsingError("Không thể tự động phân tích biểu điểm. Vui lòng kiểm tra lại định dạng của hướng dẫn chấm.");
        } finally {
          setIsParsing(false);
        }
      };
      performParsing();
    }
  }, [problem]); // Rerun effect when the problem object changes

  // Loading state for parsing
  if (isParsing) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
        <h3 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <ChartBarIcon />
          Phân tích theo tiêu chí
        </h3>
        <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <p className="ml-3 text-slate-600">AI đang phân tích biểu điểm...</p>
        </div>
      </div>
    );
  }

  // Error state for parsing
  if (parsingError) {
      return (
      <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
        <h3 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <ChartBarIcon />
            Phân tích theo tiêu chí
        </h3>
        <p className="text-red-600 text-center py-4">{parsingError}</p>
      </div>
    );
  }

  // No criteria available state
  if (!criteria || criteria.length === 0) {
    return null; // Don't render the component if there's no rubric at all
  }

  // No submissions state (after criteria are determined)
  if (submissions.length === 0) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
        <h3 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <ChartBarIcon />
            Phân tích theo tiêu chí
        </h3>
        <p className="text-slate-600 text-center py-4">Chưa có bài nộp để phân tích.</p>
      </div>
    );
  }

  // Main analysis logic (using the now-populated 'criteria' state)
  const analysisData = criteria.map(rubricItem => {
    const scoresForCriterion: number[] = [];
    
    submissions.forEach(sub => {
      // Find feedback item. Match case-insensitively and trim spaces.
      const feedbackItem = sub.feedback.detailedFeedback.find(
        item => item.criterion.trim().toLowerCase() === rubricItem.criterion.trim().toLowerCase()
      );
      if (feedbackItem) {
        scoresForCriterion.push(feedbackItem.score);
      }
    });

    const totalScore = scoresForCriterion.reduce((acc, score) => acc + score, 0);
    const averageScore = scoresForCriterion.length > 0 ? totalScore / scoresForCriterion.length : 0;
    
    return {
      criterion: rubricItem.criterion,
      maxScore: rubricItem.maxScore,
      averageScore: averageScore,
      submissionCount: scoresForCriterion.length,
    };
  });

  const ProgressBar = ({ average, max }: { average: number; max: number }) => {
    // Clamp average score to be within [0, max] to handle potential AI scoring errors
    const clampedAverage = Math.max(0, Math.min(average, max));
    const percentage = max > 0 ? (clampedAverage / max) * 100 : 0;
    let colorClass = 'bg-red-500';
    if (percentage >= 80) {
      colorClass = 'bg-green-500';
    } else if (percentage >= 50) {
      colorClass = 'bg-yellow-500';
    }

    return (
      <div className="w-full bg-slate-200 rounded-full h-2.5">
        <div 
          className={`${colorClass} h-2.5 rounded-full transition-all duration-500`} 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    );
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
      <h3 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
        <ChartBarIcon />
        Phân tích theo tiêu chí
      </h3>
      <div className="space-y-4">
        {analysisData.map((item, index) => (
          <div key={index}>
            <div className="flex justify-between items-baseline mb-1">
                <span className="font-semibold text-slate-700">{item.criterion}</span>
                <span className="text-sm font-medium text-slate-500">
                    Trung bình: {item.averageScore.toFixed(1)} / {item.maxScore}
                </span>
            </div>
            <ProgressBar average={item.averageScore} max={item.maxScore} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default CriterionAnalysis;
