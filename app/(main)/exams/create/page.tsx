'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDataContext } from '@/context/DataContext';
import CalendarPicker from '@/components/CalendarPicker';
import CalendarIcon from '@/components/icons/CalendarIcon';

export default function CreateExamPage() {
  const router = useRouter();
  const { addExam } = useDataContext();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
  
  const [startTime, setStartTime] = useState<Date>(now);
  const [endTime, setEndTime] = useState<Date>(oneHourLater);
  
  const [isPickerOpenFor, setIsPickerOpenFor] = useState<'start' | 'end' | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
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
    addExam(title, description, startTimeMs, endTimeMs, password.trim() || undefined);
    router.push('/exams');
  };
  
  const inputClass = "mt-2 w-full p-3 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200";
  const textareaClass = `${inputClass} resize-y`;
  const dateButtonClass = "mt-2 w-full p-3 bg-white border border-slate-300 rounded-lg text-slate-800 text-left flex items-center gap-2 hover:border-blue-500";

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-4xl font-bold text-slate-900 mb-8">Tạo đề thi mới</h1>
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-lg space-y-6">
        {error && <p className="text-red-500 bg-red-100 p-3 rounded-md">{error}</p>}
        <div>
          <label htmlFor="exam-title" className="text-lg font-semibold text-slate-800">
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
          <label htmlFor="exam-description" className="text-lg font-semibold text-slate-800">
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
        
        {/* New Date Picker Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label htmlFor="exam-start-time" className="text-lg font-semibold text-slate-800">
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
                <label htmlFor="exam-end-time" className="text-lg font-semibold text-slate-800">
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
            <label htmlFor="exam-password" className="text-lg font-semibold text-slate-800">
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
