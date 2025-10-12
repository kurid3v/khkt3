'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDataContext } from '@/context/DataContext';
import type { RubricItem } from '@/types';
import { parseRubric } from '@/services/geminiService';

function CreateProblemContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const examId = searchParams.get('examId');

  const { addProblem } = useDataContext();

  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [rawRubric, setRawRubric] = useState('');
  const [rubricItems, setRubricItems] = useState<RubricItem[]>([]);
  const [customMaxScore, setCustomMaxScore] = useState<string>('10');
  const [isRubricHidden, setIsRubricHidden] = useState(false);
  const [error, setError] = useState('');
  const [isParsingRubric, setIsParsingRubric] = useState(false);
  const [parsingError, setParsingError] = useState('');

  const addRubricItem = () => {
    setRubricItems([...rubricItems, { id: crypto.randomUUID(), criterion: '', maxScore: 0 }]);
  };

  const updateRubricItem = (id: string, field: 'criterion' | 'maxScore', value: string) => {
    const updatedItems = rubricItems.map(item => {
      if (item.id === id) {
        return { ...item, [field]: field === 'maxScore' ? Number(value) : value };
      }
      return item;
    });
    setRubricItems(updatedItems);
  };

  const removeRubricItem = (id: string) => {
    setRubricItems(rubricItems.filter(item => item.id !== id));
  };

  const totalMaxScore = rubricItems.reduce((acc, item) => acc + item.maxScore, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !prompt.trim()) {
      setError('Tiêu đề và đề bài không được để trống.');
      return;
    }
    setError('');
    addProblem(title, prompt, rawRubric, rubricItems, Number(customMaxScore), isRubricHidden, examId || undefined);
    
    if (examId) {
      router.push(`/exams/${examId}`);
    } else {
      router.push('/dashboard');
    }
  };
  
  const handleParseRubric = async () => {
    if (!rawRubric.trim()) return;
    setIsParsingRubric(true);
    setParsingError('');
    try {
      const parsedItems = await parseRubric(rawRubric);
      if (parsedItems && parsedItems.length > 0) {
        const newRubricItems = parsedItems.map(item => ({
          ...item,
          id: crypto.randomUUID(),
        }));
        setRubricItems(newRubricItems);
      } else {
        setParsingError("AI không thể tìm thấy tiêu chí nào trong văn bản được cung cấp.");
      }
    } catch (e) {
      console.error("Rubric parsing failed", e);
      setParsingError("Đã xảy ra lỗi khi phân tích hướng dẫn chấm. Vui lòng thử lại.");
    } finally {
      setIsParsingRubric(false);
    }
  };
  
  const handleCancel = () => {
    if (examId) {
        router.push(`/exams/${examId}`);
    } else {
        router.push('/dashboard');
    }
  };

  const inputClass = "mt-2 w-full p-3 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors duration-200";
  const textareaClass = `${inputClass} resize-y`;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-4xl font-bold text-slate-900 mb-8">
        {examId ? 'Thêm câu hỏi vào đề thi' : 'Tạo bài tập mới'}
      </h1>
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-lg space-y-6">
        {error && <p className="text-red-500 bg-red-100 p-3 rounded-md">{error}</p>}
        <div>
          <label htmlFor="problem-title" className="text-lg font-semibold text-slate-800">
            Tiêu đề bài tập / Tên câu hỏi
          </label>
          <input
            id="problem-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ví dụ: Phân tích tác phẩm Lặng lẽ Sa Pa"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="problem-prompt" className="text-lg font-semibold text-slate-800">
            Đề bài / Yêu cầu chi tiết
          </label>
          <textarea
            id="problem-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Nhập nội dung đề bài vào đây..."
            className={`${textareaClass} h-40`}
          />
        </div>

        <div>
            <label htmlFor="max-score-input" className="text-lg font-semibold text-slate-800">
                Thang điểm
            </label>
            <input
                id="max-score-input"
                type="number"
                value={customMaxScore}
                onChange={(e) => setCustomMaxScore(e.target.value)}
                min="1"
                step="any"
                className={`${inputClass} w-40`}
                aria-describedby="max-score-description"
            />
            <p id="max-score-description" className="text-sm text-slate-500 mt-1">
                Điểm cuối cùng của bài làm sẽ được quy đổi về thang điểm này.
            </p>
        </div>

        {/* Rubric Section */}
        <div>
            <div className="flex justify-between items-center flex-wrap gap-2">
                 <label className="text-lg font-semibold text-slate-800">
                    Biểu điểm chấm (tùy chọn)
                </label>
                <div className="flex items-center gap-2">
                    <label htmlFor="hide-rubric-toggle" className="text-sm font-medium text-slate-600 cursor-pointer">
                        Ẩn với học sinh
                    </label>
                    <button
                        type="button"
                        id="hide-rubric-toggle"
                        onClick={() => setIsRubricHidden(!isRubricHidden)}
                        className={`${
                        isRubricHidden ? 'bg-blue-600' : 'bg-slate-300'
                        } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
                        role="switch"
                        aria-checked={isRubricHidden}
                    >
                        <span
                        aria-hidden="true"
                        className={`${
                            isRubricHidden ? 'translate-x-5' : 'translate-x-0'
                        } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                        />
                    </button>
                </div>
            </div>
            <p className="text-sm text-slate-500 mt-1 mb-2">
                Cung cấp biểu điểm chi tiết để AI chấm chính xác hơn. Điểm sẽ được tự động quy đổi về thang điểm bạn đã nhập ở trên.
            </p>
            <div className="mt-2 flex flex-col gap-3 p-4 border border-dashed border-slate-300 rounded-lg">
                <div className="flex justify-between items-center gap-2">
                    <label htmlFor="raw-rubric-input" className="text-md font-semibold text-slate-700">
                        Dán toàn bộ hướng dẫn chấm
                    </label>
                    <button
                        type="button"
                        onClick={handleParseRubric}
                        disabled={!rawRubric.trim() || isParsingRubric}
                        className="px-3 py-1.5 text-sm text-blue-600 font-semibold bg-blue-100 hover:bg-blue-200 rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                    >
                        {isParsingRubric ? (
                            <>
                                <svg className="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Đang phân tích...</span>
                            </>
                        ) : (
                            'Phân tích Hướng dẫn chấm'
                        )}
                    </button>
                </div>
                <textarea
                    id="raw-rubric-input"
                    value={rawRubric}
                    onChange={(e) => setRawRubric(e.target.value)}
                    placeholder="Dán hướng dẫn chấm vào đây, sau đó nhấn nút 'Phân tích' để AI tự động tạo biểu điểm chi tiết."
                    className={`${textareaClass} h-40`}
                    aria-label="Hướng dẫn chấm chi tiết"
                />
                 {parsingError && <p className="text-sm text-red-500 -mt-1">{parsingError}</p>}
                
                <div className="relative my-2">
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="w-full border-t border-slate-300"></div>
                    </div>
                    <div className="relative flex justify-center">
                        <span className="bg-white px-2 text-sm text-slate-500">HOẶC</span>
                    </div>
                    </div>

                <label className="text-md font-semibold text-slate-700">
                    Tạo biểu điểm theo từng tiêu chí (hoặc chỉnh sửa sau khi phân tích)
                </label>

                {rubricItems.map((item, index) => (
                    <div key={item.id} className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    <span className="font-medium text-slate-500">{index + 1}.</span>
                    <input
                        type="text"
                        value={item.criterion}
                        onChange={(e) => updateRubricItem(item.id, 'criterion', e.target.value)}
                        placeholder="Nhập tên tiêu chí..."
                        className="flex-grow p-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500"
                        aria-label={`Tiêu chí ${index + 1}`}
                    />
                    <input
                        type="number"
                        value={item.maxScore}
                        min="0"
                        step="any"
                        onChange={(e) => updateRubricItem(item.id, 'maxScore', e.target.value)}
                        placeholder="Điểm"
                        className="w-24 p-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500"
                        aria-label={`Điểm tối đa cho tiêu chí ${index + 1}`}
                    />
                    <button
                        type="button"
                        onClick={() => removeRubricItem(item.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-100 rounded-full transition-colors"
                        aria-label={`Xóa tiêu chí ${index + 1}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                    </button>
                    </div>
                ))}
                <button
                    type="button"
                    onClick={addRubricItem}
                    className="mt-2 self-start px-4 py-2 text-sm text-blue-600 font-semibold bg-blue-100 hover:bg-blue-200 rounded-md"
                >
                    + Thêm tiêu chí thủ công
                </button>
                {rubricItems.length > 0 && (
                    <div className="mt-2 text-right font-semibold text-slate-700">Tổng điểm biểu điểm: {totalMaxScore}</div>
                )}
            </div>
        </div>


        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={handleCancel}
            className="px-6 py-3 bg-slate-200 text-slate-800 font-semibold rounded-lg hover:bg-slate-300 transition-colors"
          >
            Hủy
          </button>
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors"
          >
            {examId ? 'Thêm câu hỏi' : 'Tạo bài tập'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function CreateProblemPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <CreateProblemContent />
        </Suspense>
    )
}
