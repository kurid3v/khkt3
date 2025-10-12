import React from 'react';
import type { Feedback } from '../types';
import LightBulbIcon from './icons/LightBulbIcon';
import PencilIcon from './icons/PencilIcon';

interface FeedbackDisplayProps {
  feedback: Feedback;
}

const FeedbackDisplay: React.FC<FeedbackDisplayProps> = ({ feedback }) => {
  const finalMaxScore = feedback.maxScore > 0 ? feedback.maxScore : 10;
  const percentage = finalMaxScore > 0 ? (feedback.totalScore / finalMaxScore) * 100 : 0;
  const clampedPercentage = Math.max(0, Math.min(percentage, 100));
  
  let scoreColor = 'text-red-500';
  if (percentage >= 80) {
    scoreColor = 'text-green-500';
  } else if (percentage >= 50) {
    scoreColor = 'text-yellow-600';
  }

  // SVG Circular Progress Bar constants
  const radius = 56;
  const strokeWidth = 10;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (clampedPercentage / 100) * circumference;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Total Score with Progress Circle */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-lg">
        <h2 className="text-2xl font-bold text-slate-800 mb-4 text-center">Điểm số tổng kết</h2>
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
              className={`${scoreColor} transition-all duration-1000 ease-out`}
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center">
            <span className={`text-5xl font-extrabold ${scoreColor}`}>
              {feedback.totalScore.toFixed(2).replace(/\.00$/, '')}
            </span>
            <span className="text-slate-600 font-medium">
              / {finalMaxScore.toFixed(2).replace(/\.00$/, '')}
            </span>
          </div>
        </div>
      </div>
      
      {/* Detailed Feedback */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <PencilIcon />
            Phân tích chi tiết
        </h3>
        {feedback.detailedFeedback.map((item, index) => (
          <div key={index} className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm transition-all hover:shadow-md hover:border-blue-300">
            <div className="flex justify-between items-start mb-2 gap-4">
              <h4 className="font-semibold text-lg text-slate-900 flex-1">{item.criterion}</h4>
              <span className="font-bold text-lg text-blue-600 bg-blue-100 px-3 py-1 rounded-full whitespace-nowrap">
                {item.score.toFixed(2).replace(/\.00$/, '')} điểm
              </span>
            </div>
            <p className="text-slate-700 leading-relaxed">{item.feedback}</p>
          </div>
        ))}
      </div>

      {/* General Suggestions */}
      {feedback.generalSuggestions && feedback.generalSuggestions.length > 0 && (
        <div className="bg-blue-50 p-6 rounded-lg border-l-4 border-blue-400">
            <h3 className="text-xl font-semibold flex items-center gap-3 mb-3 text-blue-800">
                <LightBulbIcon />
                Gợi ý chung
            </h3>
            <ul className="list-disc list-inside space-y-2 text-slate-700">
                {feedback.generalSuggestions.map((item, index) => (
                <li key={index}>{item}</li>
                ))}
            </ul>
        </div>
      )}
    </div>
  );
};

export default FeedbackDisplay;