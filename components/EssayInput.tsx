

'use client';
import React from 'react';
import CameraIcon from './icons/CameraIcon';

interface EssayInputProps {
  essay: string;
  setEssay: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  onScanClick?: () => void;
  disablePaste?: boolean;
}

const EssayInput: React.FC<EssayInputProps> = ({ 
  essay, setEssay, 
  onSubmit, isLoading,
  onScanClick,
  disablePaste
}) => {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex justify-between items-center mb-2">
            <label htmlFor="essay-input" className="text-lg font-semibold text-slate-800">
            Nội dung bài văn của bạn
            </label>
            {onScanClick && (
                <button
                    type="button"
                    onClick={onScanClick}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-slate-100 text-slate-700 font-semibold rounded-md hover:bg-slate-200 disabled:opacity-50"
                >
                    <CameraIcon />
                    Quét bài làm giấy
                </button>
            )}
        </div>
        <textarea
          id="essay-input"
          value={essay}
          onChange={(e) => setEssay(e.target.value)}
          onPaste={disablePaste ? (e) => e.preventDefault() : undefined}
          title={disablePaste ? "Dán văn bản đã bị vô hiệu hóa cho bài tập này." : ""}
          placeholder="Dán bài văn của bạn vào đây hoặc dùng tính năng quét..."
          className="w-full h-64 p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y disabled:bg-slate-100 disabled:cursor-not-allowed"
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