'use client';
import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  itemsPerPage: number;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange, totalItems, itemsPerPage }) => {
  if (totalPages <= 1) {
    return null;
  }

  const handlePrev = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };
  
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const buttonClass = "px-3 py-1.5 text-sm font-semibold border rounded-lg";
  const inactiveClass = "bg-white text-slate-700 border-slate-300 hover:bg-slate-100";
  const disabledClass = "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed";

  return (
    <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
      <span className="text-sm text-slate-600">
        Hiển thị <span className="font-semibold">{startItem}</span> đến <span className="font-semibold">{endItem}</span> của <span className="font-semibold">{totalItems}</span> kết quả
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={handlePrev}
          disabled={currentPage === 1}
          className={`${buttonClass} ${currentPage === 1 ? disabledClass : inactiveClass}`}
          aria-label="Go to previous page"
        >
          &larr; Quay lại
        </button>
        <button
          onClick={handleNext}
          disabled={currentPage === totalPages}
          className={`${buttonClass} ${currentPage === totalPages ? disabledClass : inactiveClass}`}
          aria-label="Go to next page"
        >
          Tiếp &rarr;
        </button>
      </div>
    </div>
  );
};

export default Pagination;
