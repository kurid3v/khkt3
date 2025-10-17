import React from 'react';
import type { SimilarityCheckResult } from '../types';
import ShieldCheckIcon from './icons/ShieldCheckIcon';

interface SimilarityCheckDisplayProps {
  similarityCheck: SimilarityCheckResult;
}

const SimilarityCheckDisplay: React.FC<SimilarityCheckDisplayProps> = ({ similarityCheck }) => {
  const { similarityPercentage, explanation } = similarityCheck;

  const percentage = Math.max(0, Math.min(similarityPercentage, 100));
  
  let color = 'text-green-500'; // Low similarity
  if (percentage > 70) {
    color = 'text-red-500'; // High similarity
  } else if (percentage > 40) {
    color = 'text-yellow-600'; // Medium similarity
  }

  // SVG Circular Progress Bar constants
  const radius = 56;
  const strokeWidth = 10;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200">
        <h2 className="text-2xl font-bold text-slate-800 mb-4 text-center flex items-center justify-center gap-2">
            <ShieldCheckIcon />
            Kiểm tra độ tương đồng
        </h2>
        <div className="relative flex items-center justify-center h-40">
          <svg
            height="160"
            width="160"
            viewBox="0 0 120 120"
            className="transform -rotate-90"
          >
            <circle
              strokeWidth={strokeWidth}
              stroke="currentColor"
              fill="transparent"
              r={normalizedRadius}
              cx={radius}
              cy={radius}
              className="text-slate-200"
            />
            <circle
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
              r={normalizedRadius}
              cx={radius}
              cy={radius}
              className={`${color} transition-all duration-500 ease-in-out`}
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center">
            <span className={`text-5xl font-extrabold ${color}`}>
              {percentage.toFixed(0)}%
            </span>
            <span className="text-slate-600 font-medium">
              tương đồng
            </span>
          </div>
        </div>
        <div className="bg-slate-50 p-5 rounded-lg border-l-4 border-slate-400 mt-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">
                Kết luận của AI
            </h3>
            <p className="text-slate-700 leading-relaxed">{explanation}</p>
        </div>
    </div>
  );
};

export default SimilarityCheckDisplay;