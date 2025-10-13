
import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex justify-center items-center py-10">
      <div className="rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
      <p className="ml-4 text-slate-600 text-lg">AI đang đọc và phân tích bài viết...</p>
    </div>
  );
};

export default LoadingSpinner;
