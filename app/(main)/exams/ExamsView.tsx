'use client';
import React, { useState, useTransition, useOptimistic } from 'react';
import { useRouter } from 'next/navigation';
import { removeExam } from '@/app/actions';
import type { Exam, Problem, User } from '@/types';
import ClockIcon from '@/components/icons/ClockIcon';
import LockClosedIcon from '@/components/icons/LockClosedIcon';
import TrashIcon from '@/components/icons/TrashIcon';
import ConfirmationModal from '@/components/ConfirmationModal';
import ClipboardListIcon from '@/components/icons/ClipboardListIcon';

interface ExamsViewProps {
    initialExams: Exam[];
    problems: Problem[];
    currentUser: Omit<User, 'password'>;
}

export default function ExamsView({ initialExams, problems, currentUser }: ExamsViewProps) {
  const router = useRouter();
  const [examToDelete, setExamToDelete] = useState<Exam | null>(null);
  
  // Optimistic UI for deletions
  const [optimisticExams, setOptimisticExams] = useOptimistic(
    initialExams,
    (state, examId: string) => state.filter(e => e.id !== examId)
  );
  
  const [isPending, startTransition] = useTransition();

  const handleDeleteClick = (e: React.MouseEvent, exam: Exam) => {
    e.stopPropagation();
    setExamToDelete(exam);
  };
  
  const confirmDelete = () => {
    if (examToDelete) {
      startTransition(async () => {
        setOptimisticExams(examToDelete.id); // Optimistically remove from UI
        await removeExam(examToDelete.id); // Call server action
      });
      setExamToDelete(null);
    }
  };

  const getProblemCountForExam = (examId: string) => {
    return problems.filter(p => p.examId === examId).length;
  };
  
  const getExamStatus = (startTime: number, endTime: number): { text: string; color: string } => {
    const now = Date.now();
    if (now < startTime) {
      return { text: 'Sắp diễn ra', color: 'bg-blue-100 text-blue-800 border border-blue-200' };
    } else if (now >= startTime && now <= endTime) {
      return { text: 'Đang diễn ra', color: 'bg-green-100 text-green-800 border border-green-200' };
    } else {
      return { text: 'Đã kết thúc', color: 'bg-slate-100 text-slate-800 border border-slate-200' };
    }
  };

  const ExamCard: React.FC<{ exam: Exam }> = ({ exam }) => {
    const problemCount = getProblemCountForExam(exam.id);
    const status = getExamStatus(exam.startTime, exam.endTime);
    return (
        <div 
            className="bg-card p-6 rounded-lg shadow-sm hover:shadow-md hover:border-primary/50 transition-all border border-border flex flex-col cursor-pointer relative group"
            onClick={() => router.push(`/exams/${exam.id}`)}
        >
            {(currentUser.role === 'teacher' || currentUser.role === 'admin') && (
              <button
                onClick={(e) => handleDeleteClick(e, exam)}
                className="absolute top-2 right-2 p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label={`Xóa đề thi ${exam.title}`}
                title="Xóa đề thi"
              >
                <TrashIcon />
              </button>
            )}
            <div className="flex-grow">
                <div className="flex justify-between items-start gap-4">
                    <h3 className="text-lg font-bold text-foreground flex-1">{exam.title}</h3>
                     <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${status.color}`}>
                        {status.text}
                    </span>
                </div>
                <p className="text-muted-foreground mt-2 text-sm h-10 overflow-hidden text-ellipsis">{exam.description}</p>
            </div>
            <div className="mt-4 border-t border-border pt-4 flex justify-between items-center text-sm text-muted-foreground">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                        <ClipboardListIcon className="h-4 w-4" />
                        <span className="font-semibold">{problemCount} câu hỏi</span>
                    </div>
                    <div className="flex items-center gap-1.5" title="Thời gian bắt đầu">
                        <ClockIcon />
                        <span>{new Date(exam.startTime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}</span>
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
      <div className="container mx-auto px-4 py-8 max-w-7xl animate-fade-in">
          <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl font-bold text-foreground">
                  Danh sách đề thi
              </h1>
              {(currentUser.role === 'teacher' || currentUser.role === 'admin') && (
                  <button
                      onClick={() => router.push('/exams/create')}
                      className="px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-md shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring transition-colors"
                  >
                      + Tạo đề thi mới
                  </button>
              )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {optimisticExams.map(exam => (
                  <ExamCard key={exam.id} exam={exam} />
              ))}
          </div>
          
          {optimisticExams.length === 0 && (
               <div className="text-center py-16 bg-card rounded-lg border border-dashed">
                     <p className="text-muted-foreground">
                        Chưa có đề thi nào được tạo.
                    </p>
                    {(currentUser.role === 'teacher' || currentUser.role === 'admin') && (
                      <p className="text-muted-foreground text-sm mt-1">Nhấn "Tạo đề thi mới" để bắt đầu.</p>
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