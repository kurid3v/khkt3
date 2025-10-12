import React from 'react';
import type { User, Problem } from '../types';

interface DashboardPageProps {
  user: User;
  problems: Problem[];
  onSelectProblem: (problemId: string) => void;
  onCreateProblem: () => void;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ user, problems, onSelectProblem, onCreateProblem }) => {
  const teacherProblems = problems.filter(p => p.createdBy === user.id && !p.examId);
  // Display only problems that do not belong to an exam.
  const displayedProblems = user.role === 'teacher' 
    ? teacherProblems 
    : problems.filter(p => !p.examId);

  const ProblemCard: React.FC<{ problem: Problem }> = ({ problem }) => (
    <div 
        className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer border border-slate-200"
        onClick={() => onSelectProblem(problem.id)}
    >
        <h3 className="text-xl font-bold text-slate-800 truncate">{problem.title}</h3>
        <p className="text-slate-600 mt-2 h-12 overflow-hidden text-ellipsis">{problem.prompt}</p>
        <div className="text-right mt-4 text-sm font-semibold text-blue-600">Xem chi tiết &rarr;</div>
    </div>
  );
  
  const getHeading = () => {
    switch (user.role) {
      case 'teacher':
        return 'Bài tập của bạn';
      case 'admin':
        return 'Tổng quan bài tập (Quản trị viên)';
      default:
        return 'Danh sách bài tập';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold text-slate-900">
                {getHeading()}
            </h1>
            {(user.role === 'teacher' || user.role === 'admin') && (
                <button
                    onClick={onCreateProblem}
                    className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                    + Tạo bài tập mới
                </button>
            )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedProblems.map(problem => (
                <ProblemCard key={problem.id} problem={problem} />
            ))}
        </div>
        
        {displayedProblems.length === 0 && (
            <div className="text-center py-12 bg-slate-50 rounded-lg">
                {user.role === 'teacher' ? (
                    <>
                        <p className="text-slate-500">Bạn chưa tạo bài tập nào.</p>
                        <p className="text-slate-500">Nhấn "Tạo bài tập mới" để bắt đầu.</p>
                    </>
                ) : (
                     <p className="text-slate-500">Chưa có bài tập nào được giao.</p>
                )}
            </div>
        )}
    </div>
  );
};

export default DashboardPage;
