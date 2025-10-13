'use client';
import React from 'react';

interface EssayInputProps {
  essay: string;
  setEssay: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

const EssayInput: React.FC<EssayInputProps> = ({ 
  essay, setEssay, 
  onSubmit, isLoading 
}) => {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <label htmlFor="essay-input" className="text-lg font-semibold text-slate-800">
          Nội dung bài văn của bạn
        </label>
        <textarea
          id="essay-input"
          value={essay}
          onChange={(e) => setEssay(e.target.value)}
          placeholder="Dán bài văn của bạn vào đây..."
          className="mt-2 w-full h-64 p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y disabled:bg-slate-100 disabled:cursor-not-allowed"
          disabled={isLoading}
          aria-label="Nội dung bài văn"
          required
        />
      </div>

      <button
        onClick={onSubmit}
        disabled={isLoading || !essay.trim()}
        className="w-full mt-4 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Đang chấm bài...' : 'Chấm bài & Nộp'}
      </button>
    </div>
  );
};

export default EssayInput;
