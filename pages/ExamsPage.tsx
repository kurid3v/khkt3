import React, { useState } from 'react';
import type { User, Exam, Problem } from '../types';
import ClockIcon from '../components/icons/ClockIcon';
import LockClosedIcon from '../components/icons/LockClosedIcon';
import TrashIcon from '../components/icons/TrashIcon';
import ConfirmationModal from '../components/ConfirmationModal';

interface ExamsPageProps {
  user: User;
  exams: Exam[];
  problems: Problem[];
  onCreateExam: () => void;
  onSelectExam: (examId: string) => void;
  onDeleteExam: (examId: string) => void;
}

const ExamsPage: React.FC<ExamsPageProps> = ({ user, exams, problems, onCreateExam, onSelectExam, onDeleteExam }) => {
  const [examToDelete, setExamToDelete] = useState<Exam | null>(null);

  const getProblemCountForExam = (examId: string) => {
    return problems.filter(p => p.examId === examId).length;
  };
  
  const getExamStatus = (startTime: number, endTime: number): { text: string; color: string } => {
    const now = Date.now();
    if (now < startTime) {
      return { text: 'Sắp diễn ra', color: 'bg-blue-100 text-blue-800' };
    } else if (now >= startTime && now <= endTime) {
      return { text: 'Đang diễn ra', color: 'bg-green-100 text-green-800' };
    } else {
      return { text: 'Đã kết thúc', color: 'bg-slate-100 text-slate-800' };
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, exam: Exam) => {
    e.stopPropagation(); // Prevent card click from navigating
    setExamToDelete(exam);
  };
  
  const confirmDelete = () => {
    if (examToDelete) {
      onDeleteExam(examToDelete.id);
      setExamToDelete(null);
    }
  };

  const ExamCard: React.FC<{ exam: Exam }> = ({ exam }) => {
    const problemCount = getProblemCountForExam(exam.id);
    const status = getExamStatus(exam.startTime, exam.endTime);
    return (
        <div 
            className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl hover:-translate-y-1 transition-all border border-slate-200 flex flex-col cursor-pointer relative group"
            onClick={() => onSelectExam(exam.id)}
        >
            {(user.role === 'teacher' || user.role === 'admin') && (
              <button
                onClick={(e) => handleDeleteClick(e, exam)}
                className="absolute top-2 right-2 p-2 text-slate-400 hover:text-red-600 hover:bg-red-100 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label={`Xóa đề thi ${exam.title}`}
                title="Xóa đề thi"
              >
                <TrashIcon />
              </button>
            )}
            <div className="flex-grow">
                <div className="flex justify-between items-start">
                    <h3 className="text-xl font-bold text-slate-800 truncate flex-1 pr-2">{exam.title}</h3>
                     <span className={`px-2 py-1 text-xs font-medium rounded-full ${status.color}`}>
                        {status.text}
                    </span>
                </div>
                <p className="text-slate-600 mt-2 h-12 overflow-hidden text-ellipsis">{exam.description}</p>
            </div>
            <div className="mt-4 border-t border-slate-200 pt-3 flex justify-between items-center text-sm text-slate-600">
                <div className="flex items-center gap-4">
                    <span className="font-semibold">{problemCount} câu hỏi</span>
                    <div className="flex items-center gap-1.5" title="Thời gian bắt đầu">
                        <ClockIcon />
                        <span>{new Date(exam.startTime).toLocaleString('vi-VN')}</span>
                    </div>
                </div>
                {exam.password && (
                    <div className="flex items-center gap-1.5" title="Có mật khẩu">
                        <LockClosedIcon />
                    </div>
                )}
            </div>
        </div>
    );
  };
  
  return (
    <>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="flex justify-between items-center mb-8">
              <h1 className="text-4xl font-bold text-slate-900">
                  Danh sách đề thi
              </h1>
              {(user.role === 'teacher' || user.role === 'admin') && (
                  <button
                      onClick={onCreateExam}
                      className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                  >
                      + Tạo đề thi mới
                  </button>
              )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {exams.map(exam => (
                  <ExamCard key={exam.id} exam={exam} />
              ))}
          </div>
          
          {exams.length === 0 && (
              <div className="text-center py-12 bg-slate-50 rounded-lg">
                  <p className="text-slate-500">Chưa có đề thi nào được tạo.</p>
                  {(user.role === 'teacher' || user.role === 'admin') && (
                      <p className="text-slate-500">Nhấn "Tạo đề thi mới" để bắt đầu.</p>
                  )}
              </div>
          )}
      </div>
      <ConfirmationModal
          isOpen={!!examToDelete}
          onClose={() => setExamToDelete(null)}
          onConfirm={confirmDelete}
          title="Xác nhận xóa đề thi"
          message={`Bạn có chắc chắn muốn xóa đề thi "${examToDelete?.title}" không? Hành động này không thể hoàn tác và sẽ xóa vĩnh viễn tất cả các câu hỏi liên quan.`}
      />
    </>
  );
};

export default ExamsPage;