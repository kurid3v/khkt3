
'use client';
import React from 'react';
import Link from 'next/link';
import type { Submission } from '../types';

interface SubmissionHistoryProps {
  submissions: Submission[];
  currentSubmissionId: string;
}

const SubmissionHistory: React.FC<SubmissionHistoryProps> = ({ submissions, currentSubmissionId }) => {
  // Chỉ hiển thị component nếu có nhiều hơn một bài nộp.
  if (submissions.length <= 1) {
    return (
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">Lịch sử nộp bài</h2>
            <div className="text-center py-4">
                <p className="text-slate-500">Đây là lần nộp bài đầu tiên của bạn.</p>
            </div>
        </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200">
      <h2 className="text-2xl font-bold text-slate-800 mb-4">Lịch sử nộp bài</h2>
      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
        {submissions.map((sub, index) => {
          const isCurrent = sub.id === currentSubmissionId;
          const maxScoreDisplay = sub.feedback.maxScore > 0 ? sub.feedback.maxScore.toFixed(2).replace(/\.00$/, '') : 'N/A';
          const displayScore = `${sub.feedback.totalScore.toFixed(2).replace(/\.00$/, '')} / ${maxScoreDisplay}`;
          
          return (
            <Link 
              key={sub.id} 
              href={`/submissions/${sub.id}`} 
              className={`w-full text-left block p-4 rounded-lg border transition-colors ${
                isCurrent 
                  ? 'bg-blue-50 border-blue-400 shadow-sm' 
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
              }`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className={`font-semibold ${isCurrent ? 'text-blue-800' : 'text-slate-800'}`}>
                    Lần nộp thứ {index + 1}
                  </p>
                  <p className="text-slate-500 text-sm">{new Date(sub.submittedAt).toLocaleString('vi-VN')}</p>
                </div>
                <p className={`font-bold text-lg ${isCurrent ? 'text-blue-600' : 'text-slate-700'}`}>
                    {displayScore}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default SubmissionHistory;
