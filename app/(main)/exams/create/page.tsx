
'use client';
import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDataContext } from '@/context/DataContext';
import CalendarPicker from '@/components/CalendarPicker';
import CalendarIcon from '@/components/icons/CalendarIcon';

export default function CreateExamPage() {
  const router = useRouter();
  const { addExam, classrooms, currentUser, refetchData } = useDataContext();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [selectedClassroomIds, setSelectedClassroomIds] = useState<string[]>([]);

  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
  
  const [startTime, setStartTime] = useState<Date>(now);
  const [endTime, setEndTime] = useState<Date>(oneHourLater);
  
  const [isPickerOpenFor, setIsPickerOpenFor] = useState<'start' | 'end' | null>(null);

  const teacherClassrooms = useMemo(() => 
    currentUser ? classrooms.filter(c => c.teacherId === currentUser.id) : [],
    [classrooms, currentUser]
  );

  const handleClassroomToggle = (classId: string) => {
    setSelectedClassroomIds(prev => 
      prev.includes(classId) ? prev.filter(id => id !== classId) : [...prev, classId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const startTimeMs = startTime.getTime();
    const endTimeMs = endTime.getTime();

    if (!title.trim()) {
      setError('Tên đề thi không được để trống.');
      return;
    }
    if (endTimeMs <= startTimeMs) {
      setError('Thời gian kết thúc phải sau thời gian bắt đầu.');
      return;
    }
    
    setError('');
    const newExam = await addExam(title, description, startTimeMs, endTimeMs, password.trim() || undefined, selectedClassroomIds);
    if (newExam) {
      await refetchData();
      router.push(`/exams/${newExam.id}`);
    } else {
        setError("Không thể tạo đề thi. Vui lòng thử lại.");
    }
  };
  
  const inputClass = "mt-2 w-full p-3 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200";
  const textareaClass = `${inputClass} resize-y`;
  const dateButtonClass = "mt-2 w-full p-3 bg-white border border-slate-300 rounded-lg text-slate-800 text-left flex items-center gap-2 hover:border-blue-500";
  const labelClass = "text-lg font-semibold text-slate-800";

  const ClassroomSelector = () => (
    <div>
        <label className={labelClass}>Giao cho lớp học (tùy chọn)</label>
        <p className="text-sm text-slate-500 mt-1 mb-2">Nếu không chọn lớp nào, đề thi sẽ được hiển thị cho tất cả học sinh.</p>
        {teacherClassrooms.length > 0 ? (
            <div className="mt-2 space-y-2 max-h-40 overflow-y-auto p-3 bg-slate-50 rounded-lg border">
                {teacherClassrooms.map(c => (
                    <label key={c.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-slate-100 cursor-pointer has-[:checked]:bg-blue-100">
                        <input
                            type="checkbox"
                            checked={selectedClassroomIds.includes(c.id)}
                            onChange={() => handleClassroomToggle(c.id)}
                            className="form-checkbox h-4 w-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="font-medium text-slate-700">{c.name}</span>
                    </label>
                ))}
            </div>
        ) : (
            <p className="text-sm text-slate-500 p-3 bg-slate-100 rounded-lg">Bạn chưa tạo lớp học nào. <Link href="/classrooms" className="text-blue-600 font-semibold underline">Tạo lớp học mới</Link>.</p>
        )}
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-4xl font-bold text-slate-900 mb-8">Tạo đề thi mới</h1>
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-lg space-y-6">
        {error && <p className="text-red-500 bg-red-100 p-3 rounded-md">{error}</p>}
        <div>
          <label htmlFor="exam-title" className={labelClass}>
            Tên đề thi
          </label>
          <input
            id="exam-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ví dụ: Đề thi cuối kỳ I"
            className={inputClass}
            required
          />
        </div>
        <div>
          <label htmlFor="exam-description" className={labelClass}>
            Mô tả / Hướng dẫn
          </label>
          <textarea
            id="exam-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Nhập mô tả hoặc hướng dẫn chung cho đề thi..."
            className={`${textareaClass} h-24`}
          />
        </div>
        
        <ClassroomSelector />

        {/* New Date Picker Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label htmlFor="exam-start-time" className={labelClass}>
                    Thời gian bắt đầu
                </label>
                <button
                    id="exam-start-time"
                    type="button"
                    onClick={() => setIsPickerOpenFor('start')}
                    className={dateButtonClass}
                >
                    <CalendarIcon />
                    {startTime.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}
                </button>
            </div>
             <div>
                <label htmlFor="exam-end-time" className={labelClass}>
                    Thời gian kết thúc
                </label>
                <button
                    id="exam-end-time"
                    type="button"
                    onClick={() => setIsPickerOpenFor('end')}
                    className={dateButtonClass}
                >
                    <CalendarIcon />
                    {endTime.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}
                </button>
            </div>
        </div>
         <div>
            <label htmlFor="exam-password" className={labelClass}>
                Mật khẩu (tùy chọn)
            </label>
            <input
                id="exam-password"
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Để trống nếu không cần mật khẩu"
                className={inputClass}
            />
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={() => router.push('/exams')}
            className="px-6 py-3 bg-slate-200 text-slate-800 font-semibold rounded-lg hover:bg-slate-300"
          >
            Hủy
          </button>
          <button
            type="submit"
            className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700"
          >
            Tạo đề thi & Tiếp tục
          </button>
        </div>
      </form>

      {/* Conditionally render the CalendarPicker */}
      {isPickerOpenFor && (
        <CalendarPicker
            value={isPickerOpenFor === 'start' ? startTime : endTime}
            onChange={(newDate) => {
                if (isPickerOpenFor === 'start') {
                    setStartTime(newDate);
                } else {
                    setEndTime(newDate);
                }
            }}
            onClose={() => setIsPickerOpenFor(null)}
        />
      )}
    </div>
  );
};