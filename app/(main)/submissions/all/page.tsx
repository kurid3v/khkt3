
'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useDataContext } from '@/context/DataContext';
import Pagination from '@/components/Pagination';

const ITEMS_PER_PAGE = 10;

export default function AllSubmissionsPage() {
    const { submissions, users, problems } = useDataContext();
    const router = useRouter();

    const [currentPage, setCurrentPage] = useState(1);
    
    const sortedSubmissions = useMemo(() => 
        [...submissions].sort((a, b) => b.submittedAt - a.submittedAt),
        [submissions]
    );

    const totalPages = Math.ceil(sortedSubmissions.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const displayedSubmissions = sortedSubmissions.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const thClass = "p-3 text-left text-sm font-bold text-slate-600 uppercase tracking-wider";
    const tdClass = "p-3 text-slate-800";
    const trClickableClass = "border-b border-slate-200 cursor-pointer hover:bg-slate-50";
    

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            <header className="mb-8">
                <h1 className="text-4xl font-bold text-slate-900">Tất cả bài nộp</h1>
                <p className="text-slate-600 mt-2">Duyệt qua tất cả các bài nộp trên toàn bộ nền tảng.</p>
            </header>
            
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200">
                {submissions.length > 0 ? (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-200">
                                        <th className={thClass}>Người nộp</th>
                                        <th className={thClass}>Bài tập</th>
                                        <th className={`${thClass} text-right`}>Điểm</th>
                                        <th className={thClass}>Ngày nộp</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {displayedSubmissions.map(sub => {
                                        const submitter = users.find(u => u.id === sub.submitterId);
                                        const problem = problems.find(p => p.id === sub.problemId);
                                        return (
                                            <tr key={sub.id} onClick={() => router.push(`/submissions/${sub.id}`)} className={trClickableClass}>
                                                {/* FIX: Replaced `submitter?.name` with `submitter?.displayName` to align with the `UserSession` type, which uses `displayName` for the user's name. */}
                                                <td className={`${tdClass} font-semibold`}>{submitter?.displayName || 'Không rõ'}</td>
                                                <td className={`${tdClass} text-slate-600`}>{problem?.title || 'Không rõ'}</td>
                                                <td className={`${tdClass} font-bold text-blue-600 text-right`}>{sub.feedback.totalScore.toFixed(2)}</td>
                                                <td className={tdClass}>{new Date(sub.submittedAt).toLocaleString()}</td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                            totalItems={sortedSubmissions.length}
                            itemsPerPage={ITEMS_PER_PAGE}
                        />
                    </>
                ) : (
                    <div className="text-center py-12">
                        <p className="text-slate-500">Chưa có bài nộp nào trên hệ thống.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
