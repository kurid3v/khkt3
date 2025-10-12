import React, { useState } from 'react';
import type { User, Exam, Problem, ExamAttempt } from '../types';
import CalendarIcon from '../components/icons/CalendarIcon';
import LockClosedIcon from '../components/icons/LockClosedIcon';
import PasswordModal from '../components/PasswordModal';
import EyeOffIcon from '../components/icons/EyeOffIcon';

interface ExamDetailPageProps {
  exam: Exam;
  problems: Problem[];
  user: User;
  users: User[];
  examAttempts: ExamAttempt[];
  onBack: () => void;
  onCreateProblemInExam: (examId: string) => void;
  onSelectProblem: (problemId: string) => void;
  onStartExam: (examId: string) => void;
}

const ExamDetailPage: React.FC<ExamDetailPageProps> = ({ exam, problems, user, users, examAttempts, onBack, onCreateProblemInExam, onSelectProblem, onStartExam }) => {
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [activeTab, setActiveTab] = useState<'questions' | 'monitoring'>('questions');
  
  const now = Date.now();
  const isExamOngoing = now >= exam.startTime && now <= exam.endTime;
  const hasUserAttempted = examAttempts.some(att => att.examId === exam.id && att.studentId === user.id);

  const handleStartExamClick = () => {
    if (exam.password) {
      setIsPasswordModalOpen(true);
    } else {
      onStartExam(exam.id);
    }
  };

  const handlePasswordSubmit = (password: string) => {
    if (password === exam.password) {
      setPasswordError('');
      setIsPasswordModalOpen(false);
      onStartExam(exam.id);
    } else {
      setPasswordError('Mật khẩu không chính xác.');
    }
  };

  const studentAttempts = examAttempts.filter(att => att.examId === exam.id);

  const ProblemRow: React.FC<{ problem: Problem; index: number }> = ({ problem, index }) => (
    <tr 
        className="border-b border-slate-200 hover:bg-slate-50 cursor-pointer"
        onClick={() => onSelectProblem(problem.id)}
    >
        <td className="p-3 text-center font-semibold text-slate-600">{index + 1}</td>
        <td className="p-3 font-semibold text-slate-800">{problem.title}</td>
        <td className="p-3 text-slate-600 truncate max-w-sm">{problem.prompt}</td>
        <td className="p-3 text-right font-bold text-blue-600">{problem.customMaxScore || 10}</td>
    </tr>
  );

  const MonitoringTab: React.FC = () => (
     <div className="bg-white p-4 rounded-xl shadow-lg border border-slate-200">
       <div className="overflow-x-auto">
         <table className="w-full text-left">
            <thead>
                <tr className="border-b-2 border-slate-200">
                    <th className="p-3 font-bold text-slate-600">Học sinh</th>
                    <th className="p-3 font-bold text-slate-600">Bắt đầu lúc</th>
                    <th className="p-3 font-bold text-slate-600">Nộp lúc</th>
                    <th className="p-3 text-center font-bold text-slate-600">Thoát màn hình</th>
                </tr>
            </thead>
            <tbody>
                {studentAttempts.map(attempt => {
                    const student = users.find(u => u.id === attempt.studentId);
                    return (
                        <tr key={attempt.id} className="border-b border-slate-200 hover:bg-slate-50">
                            <td className="p-3 font-semibold text-slate-800">{student?.name || 'Không rõ'}</td>
                            <td className="p-3 text-slate-600">{new Date(attempt.startedAt).toLocaleString('vi-VN')}</td>
                            <td className="p-3 text-slate-600">{attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString('vi-VN') : 'Chưa nộp'}</td>
                            <td className="p-3 text-center font-bold text-red-600">
                                <div className="flex items-center justify-center gap-1">
                                    <EyeOffIcon />
                                    <span>{attempt.fullscreenExits.length}</span>
                                </div>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
         </table>
        </div>
         {studentAttempts.length === 0 && <p className="text-center py-8 text-slate-500">Chưa có học sinh nào làm bài thi này.</p>}
     </div>
  );

  return (
    <>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
          <button onClick={onBack} className="mb-6 text-blue-600 font-semibold hover:underline">
              &larr; Quay lại danh sách đề thi
          </button>

          <header className="mb-10 p-6 bg-white rounded-2xl shadow-lg border border-slate-200">
              <div className="flex justify-between items-start gap-4 flex-wrap">
                  <div className="flex-grow">
                      <h1 className="text-4xl font-bold text-slate-900">{exam.title}</h1>
                      <p className="mt-4 text-slate-700 whitespace-pre-wrap">{exam.description || 'Không có mô tả.'}</p>
                  </div>
                  <div className="flex flex-col items-start sm:items-end gap-2 text-slate-600 flex-shrink-0">
                      <div className="flex items-center gap-2" title="Thời gian bắt đầu">
                          <CalendarIcon />
                          <span className="font-semibold">Bắt đầu: {new Date(exam.startTime).toLocaleString('vi-VN')}</span>
                      </div>
                      <div className="flex items-center gap-2" title="Thời gian kết thúc">
                          <CalendarIcon />
                          <span className="font-semibold">Kết thúc: {new Date(exam.endTime).toLocaleString('vi-VN')}</span>
                      </div>
                      {exam.password && (
                          <div className="flex items-center gap-2 mt-2" title="Có mật khẩu">
                              <LockClosedIcon />
                              <span className="font-semibold">Đã khóa</span>
                          </div>
                      )}
                  </div>
              </div>
               {user.role === 'student' && (
                  <div className="mt-6 pt-6 border-t border-slate-200">
                      {hasUserAttempted ? (
                           <div className="text-center p-4 bg-green-50 text-green-800 rounded-lg font-semibold">Bạn đã hoàn thành bài thi này.</div>
                      ) : isExamOngoing ? (
                          <button
                              onClick={handleStartExamClick}
                              className="w-full px-6 py-4 bg-blue-600 text-white font-bold text-lg rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                          >
                              Vào thi
                          </button>
                      ) : (
                          <div className="text-center p-4 bg-slate-100 text-slate-600 rounded-lg font-semibold">
                              {now < exam.startTime ? 'Kỳ thi chưa bắt đầu.' : 'Kỳ thi đã kết thúc.'}
                          </div>
                      )}
                  </div>
              )}
          </header>

          <main>
              {(user.role === 'teacher' || user.role === 'admin') && (
                <div className="mb-6 border-b border-slate-200">
                    <button onClick={() => setActiveTab('questions')} className={`px-4 py-2 font-semibold ${activeTab === 'questions' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500'}`}>Câu hỏi</button>
                    <button onClick={() => setActiveTab('monitoring')} className={`px-4 py-2 font-semibold ${activeTab === 'monitoring' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500'}`}>Giám sát</button>
                </div>
              )}
            
            {activeTab === 'questions' && (
                 <>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-3xl font-bold text-slate-800">
                            Danh sách câu hỏi
                        </h2>
                        {(user.role === 'teacher' || user.role === 'admin') && (
                            <button
                                onClick={() => onCreateProblemInExam(exam.id)}
                                className="px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                            >
                                + Thêm câu hỏi mới
                            </button>
                        )}
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-lg border border-slate-200">
                        {problems.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b-2 border-slate-200">
                                            <th className="p-3 text-center font-bold text-slate-600 w-16">STT</th>
                                            <th className="p-3 font-bold text-slate-600">Tên câu hỏi</th>
                                            <th className="p-3 font-bold text-slate-600">Nội dung</th>
                                            <th className="p-3 text-right font-bold text-slate-600">Thang điểm</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {problems.map((problem, index) => (
                                            <ProblemRow key={problem.id} problem={problem} index={index} />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <p className="text-slate-500">Đề thi này chưa có câu hỏi nào.</p>
                                {(user.role === 'teacher' || user.role === 'admin') && 
                                    <p className="text-slate-500 mt-1">Nhấn "Thêm câu hỏi mới" để bắt đầu xây dựng đề thi.</p>
                                }
                            </div>
                        )}
                    </div>
                </>
            )}

            {activeTab === 'monitoring' && <MonitoringTab />}
             
          </main>
      </div>
      <PasswordModal
          isOpen={isPasswordModalOpen}
          onClose={() => setIsPasswordModalOpen(false)}
          onSubmit={handlePasswordSubmit}
          error={passwordError}
      />
    </>
  );
};

export default ExamDetailPage;
