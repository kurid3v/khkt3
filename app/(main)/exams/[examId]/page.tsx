'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDataContext } from '@/context/DataContext';
import CalendarIcon from '@/components/icons/CalendarIcon';
import LockClosedIcon from '@/components/icons/LockClosedIcon';
import PasswordModal from '@/components/PasswordModal';
import EyeOffIcon from '@/components/icons/EyeOffIcon';
import ExclamationIcon from '@/components/icons/ExclamationIcon';
import type { Problem, ExamAttempt } from '@/types';


export default function ExamDetailPage({ params }: { params: { examId: string } }) {
  const router = useRouter();
  const { exams, problems, currentUser, users, examAttempts, startExamAttempt } = useDataContext();

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [activeTab, setActiveTab] = useState<'questions' | 'monitoring'>('questions');
  
  if (!currentUser) return null;

  const exam = exams.find(e => e.id === params.examId);
  if (!exam) return <p className="p-8">Lỗi: Không tìm thấy đề thi.</p>;

  const examProblems = problems.filter(p => p.examId === exam.id);
  const now = Date.now();
  const isExamOngoing = now >= exam.startTime && now <= exam.endTime;
  
  // Find the attempt for THIS specific exam
  const userAttemptForThisExam = examAttempts.find(att => att.examId === exam.id && att.studentId === currentUser.id);
  
  // Find if the user has ANY ongoing attempt
  const ongoingGlobalAttempt = examAttempts.find(att => att.studentId === currentUser.id && !att.submittedAt);
  const otherOngoingExam = ongoingGlobalAttempt && ongoingGlobalAttempt.examId !== exam.id 
    ? exams.find(e => e.id === ongoingGlobalAttempt.examId) 
    : null;

  const proceedToExam = () => {
    if (userAttemptForThisExam) {
      // Resume existing attempt
      router.push(`/exams/${exam.id}/take/${userAttemptForThisExam.id}`);
    } else {
      // Create new attempt
      const newAttempt = startExamAttempt(exam.id);
      if (newAttempt) {
        router.push(`/exams/${exam.id}/take/${newAttempt.id}`);
      }
    }
  };

  const handleStartExamClick = () => {
    if (exam.password) {
      // Always ask for password if one is set
      setIsPasswordModalOpen(true);
    } else {
      // No password, proceed directly
      proceedToExam();
    }
  };

  const handlePasswordSubmit = (password: string) => {
    if (password === exam.password) {
      setPasswordError('');
      setIsPasswordModalOpen(false);
      // Password is correct, now proceed
      proceedToExam();
    } else {
      setPasswordError('Mật khẩu không chính xác.');
    }
  };

  const studentAttempts = examAttempts.filter(att => att.examId === exam.id);

  const ProblemRow: React.FC<{ problem: Problem; index: number }> = ({ problem, index }) => (
    <tr 
        className="border-b border-slate-200 hover:bg-slate-50 cursor-pointer"
        onClick={() => router.push(`/problems/${problem.id}`)}
    >
        <td className="p-3 text-center font-semibold text-slate-600">{index + 1}</td>
        <td className="p-3 font-semibold text-slate-800">{problem.title}</td>
        <td className="p-3 text-slate-600 truncate max-w-sm">{problem.prompt}</td>
        <td className="p-3 text-right font-bold text-blue-600">{problem.customMaxScore || 10}</td>
    </tr>
  );

  const MonitoringTab: React.FC = () => {
    return (
        <div className="bg-white p-4 rounded-xl shadow-lg border border-slate-200">
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead>
                    <tr className="border-b-2 border-slate-200">
                        <th className="p-3 font-bold text-slate-600">Học sinh</th>
                        <th className="p-3 font-bold text-slate-600">Bắt đầu lúc</th>
                        <th className="p-3 font-bold text-slate-600">Nộp lúc</th>
                        <th className="p-3 text-center font-bold text-slate-600">Thoát toàn màn hình</th>
                        <th className="p-3 text-center font-bold text-slate-600">Mất tập trung</th>
                    </tr>
                </thead>
                <tbody>
                    {studentAttempts.map(attempt => {
                        const student = users.find(u => u.id === attempt.studentId);
                        
                        const fullscreenExitTimestamps = attempt.fullscreenExits
                            .map((ts, index) => `Lần ${index + 1}: ${new Date(ts).toLocaleTimeString('vi-VN')}`)
                            .join('\n');

                        const hiddenEvents = attempt.visibilityStateChanges?.filter(c => c.state === 'hidden') || [];
                        const hiddenTimestamps = hiddenEvents
                            .map((event, index) => `Lần ${index + 1}: ${new Date(event.timestamp).toLocaleTimeString('vi-VN')}`)
                            .join('\n');
                        const hiddenCount = hiddenEvents.length;

                        return (
                            <tr key={attempt.id} className="border-b border-slate-200 hover:bg-slate-50">
                                <td className="p-3 font-semibold text-slate-800">{student?.name || 'Không rõ'}</td>
                                <td className="p-3 text-slate-600">{new Date(attempt.startedAt).toLocaleString('vi-VN')}</td>
                                <td className="p-3 text-slate-600">{attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString('vi-VN') : 'Chưa nộp'}</td>
                                <td className="p-3 text-center font-bold text-orange-600">
                                    <div 
                                        className="flex items-center justify-center gap-1 cursor-help"
                                        title={fullscreenExitTimestamps || "Không có lần thoát nào"}
                                    >
                                        <EyeOffIcon />
                                        <span>{attempt.fullscreenExits.length}</span>
                                    </div>
                                </td>
                                <td className={`p-3 text-center font-bold ${hiddenCount > 0 ? 'text-red-600' : 'text-slate-800'}`}>
                                    <div 
                                        className="flex items-center justify-center gap-1 cursor-help"
                                        title={hiddenTimestamps || "Không có lần mất tập trung nào"}
                                    >
                                        <ExclamationIcon />
                                        <span>{hiddenCount}</span>
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
  };

  return (
    <>
      <div className="container mx-auto px-4 py-8 max-w-7xl animate-fade-in">
          <button onClick={() => router.push('/exams')} className="mb-6 text-blue-600 font-semibold hover:underline">
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
               {currentUser.role === 'student' && (
                  <div className="mt-6 pt-6 border-t border-slate-200">
                      {(() => {
                          if (userAttemptForThisExam) {
                              if (userAttemptForThisExam.submittedAt) {
                                  return <div className="text-center p-4 bg-green-50 text-green-800 rounded-lg font-semibold">Bạn đã hoàn thành bài thi này.</div>;
                              }
                              if (isExamOngoing) {
                                  return (
                                      <button
                                          onClick={handleStartExamClick}
                                          className="w-full px-6 py-4 bg-yellow-500 text-white font-bold text-lg rounded-lg shadow-md hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors"
                                      >
                                          Tiếp tục làm bài
                                      </button>
                                  );
                              }
                              return <div className="text-center p-4 bg-slate-100 text-slate-600 rounded-lg font-semibold">Kỳ thi đã kết thúc. Bạn đã không nộp bài kịp thời.</div>;
                          }
                          
                          if (otherOngoingExam) {
                              return (
                                <div className="text-center p-4 bg-orange-50 text-orange-800 rounded-lg font-semibold">
                                  Bạn đang có một bài thi khác đang làm: "{otherOngoingExam.title}".
                                  <br/>
                                  Vui lòng hoàn thành hoặc thoát bài thi đó trước.
                                </div>
                              );
                          }
                          
                          if (isExamOngoing) {
                              return (
                                  <button
                                      onClick={handleStartExamClick}
                                      className="w-full px-6 py-4 bg-blue-600 text-white font-bold text-lg rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                                  >
                                      Vào thi
                                  </button>
                              );
                          }

                          return (
                              <div className="text-center p-4 bg-slate-100 text-slate-600 rounded-lg font-semibold">
                                  {now < exam.startTime ? 'Kỳ thi chưa bắt đầu.' : 'Kỳ thi đã kết thúc.'}
                              </div>
                          );

                      })()}
                  </div>
              )}
          </header>

          <main>
              {(currentUser.role === 'teacher' || currentUser.role === 'admin') && (
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
                        {(currentUser.role === 'teacher' || currentUser.role === 'admin') && (
                            <button
                                onClick={() => router.push(`/problems/create?examId=${exam.id}`)}
                                className="px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                            >
                                + Thêm câu hỏi mới
                            </button>
                        )}
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-lg border border-slate-200">
                        {examProblems.length > 0 ? (
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
                                        {examProblems.map((problem, index) => (
                                            <ProblemRow key={problem.id} problem={problem} index={index} />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <p className="text-slate-500">Đề thi này chưa có câu hỏi nào.</p>
                                {(currentUser.role === 'teacher' || currentUser.role === 'admin') && 
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