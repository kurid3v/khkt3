
import React from 'react';
import type { Submission, User } from '../types';

interface LeaderboardProps {
  submissions: Submission[];
  // FIX: Update the 'users' prop type to accept an array of objects without passwords, aligning with the UserSession type.
  users: Omit<User, 'password'>[];
}

const Leaderboard: React.FC<LeaderboardProps> = ({ submissions, users }) => {
  // Calculate highest score for each user
  const userScores = new Map<string, number>();
  submissions.forEach(sub => {
    const currentHighest = userScores.get(sub.submitterId) || 0;
    if (sub.feedback.totalScore > currentHighest) {
      userScores.set(sub.submitterId, sub.feedback.totalScore);
    }
  });

  const rankedUsers = Array.from(userScores.entries())
    .map(([userId, score]) => ({
      user: users.find(u => u.id === userId),
      score,
    }))
    .filter(item => item.user) // Filter out any potential mismatches
    .sort((a, b) => b.score - a.score);

  if (rankedUsers.length === 0) {
    return (
        <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 text-center">
            <p className="text-slate-600">Chưa có ai nộp bài.</p>
        </div>
    );
  }

  const getRankColor = (rank: number) => {
    if (rank === 0) return 'text-amber-500'; // Gold
    if (rank === 1) return 'text-slate-500'; // Silver
    if (rank === 2) return 'text-orange-700'; // Bronze
    return 'text-slate-400';
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
        <h3 className="text-2xl font-bold text-slate-800 mb-4">Bảng xếp hạng</h3>
        <table className="w-full text-left">
            <thead>
                <tr className="border-b border-slate-200">
                    <th className="p-3 font-semibold text-slate-600">Hạng</th>
                    <th className="p-3 font-semibold text-slate-600">Người nộp bài</th>
                    <th className="p-3 font-semibold text-slate-600 text-right">Điểm cao nhất</th>
                </tr>
            </thead>
            <tbody>
                {rankedUsers.map(({ user, score }, index) => (
                    <tr key={user!.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50">
                        <td className={`p-3 font-bold text-xl ${getRankColor(index)}`}>{index + 1}</td>
                        <td className="p-3 font-semibold text-slate-800">{user!.displayName}</td>
                        <td className="p-3 font-bold text-blue-600 text-right">{score.toFixed(2).replace(/\.00$/, '')}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
  );
};

export default Leaderboard;