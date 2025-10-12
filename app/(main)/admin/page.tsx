'use client';
import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useDataContext } from '@/context/DataContext';
import Pagination from '@/components/Pagination';
import type { User } from '@/types';

type ActiveTab = 'users' | 'problems' | 'submissions';

const ITEMS_PER_PAGE = 10;

export default function AdminDashboardPage() {
    const router = useRouter();
    const { users, problems, submissions, updateUserRole } = useDataContext();

    const [activeTab, setActiveTab] = useState<ActiveTab>('users');
    const [editingUser, setEditingUser] = useState<{ id: string; role: 'teacher' | 'student' | 'admin' } | null>(null);
    const [currentPages, setCurrentPages] = useState<{ [key in ActiveTab]: number }>({
        users: 1,
        problems: 1,
        submissions: 1,
    });
    
    const sortedSubmissions = useMemo(() => 
        [...submissions].sort((a, b) => b.submittedAt - a.submittedAt),
        [submissions]
    );

    const handleEditUserClick = (user: User) => {
        setEditingUser({ id: user.id, role: user.role });
    };

    const handleCancelEdit = () => {
        setEditingUser(null);
    };

    const handleSaveUserRole = () => {
        if (editingUser) {
            updateUserRole(editingUser.id, editingUser.role);
            setEditingUser(null);
        }
    };
    
    const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        if (editingUser) {
            setEditingUser({ ...editingUser, role: e.target.value as 'teacher' | 'student' | 'admin' });
        }
    };
    
    const handlePageChange = (tab: ActiveTab, page: number) => {
        setCurrentPages(prev => ({ ...prev, [tab]: page }));
    };

    // Pagination Logic
    const usersTotalPages = Math.ceil(users.length / ITEMS_PER_PAGE);
    const usersStartIndex = (currentPages.users - 1) * ITEMS_PER_PAGE;
    const displayedUsers = users.slice(usersStartIndex, usersStartIndex + ITEMS_PER_PAGE);

    const problemsTotalPages = Math.ceil(problems.length / ITEMS_PER_PAGE);
    const problemsStartIndex = (currentPages.problems - 1) * ITEMS_PER_PAGE;
    const displayedProblems = problems.slice(problemsStartIndex, problemsStartIndex + ITEMS_PER_PAGE);
    
    const submissionsTotalPages = Math.ceil(sortedSubmissions.length / ITEMS_PER_PAGE);
    const submissionsStartIndex = (currentPages.submissions - 1) * ITEMS_PER_PAGE;
    const displayedSubmissions = sortedSubmissions.slice(submissionsStartIndex, submissionsStartIndex + ITEMS_PER_PAGE);


    const TabButton: React.FC<{ tabName: ActiveTab; label: string; count: number }> = ({ tabName, label, count }) => (
        <button
            onClick={() => {
                setActiveTab(tabName);
            }}
            className={`px-4 py-2 text-base font-semibold transition-colors duration-200 ${
                activeTab === tabName
                    ? 'border-b-2 border-purple-600 text-purple-600'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-t-md'
            }`}
            aria-current={activeTab === tabName}
        >
            {label} <span className="text-xs bg-slate-200 text-slate-600 font-bold px-2 py-0.5 rounded-full">{count}</span>
        </button>
    );

    const thClass = "p-3 text-left text-sm font-bold text-slate-600 uppercase tracking-wider";
    const tdClass = "p-3 text-slate-800";
    const trClass = "border-b border-slate-200";
    const trClickableClass = `${trClass} cursor-pointer hover:bg-slate-50 transition-colors`;

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            <button onClick={() => router.push('/dashboard')} className="mb-6 text-blue-600 font-semibold hover:underline">
                &larr; Quay lại trang chính
            </button>
            <header className="mb-8">
                <h1 className="text-4xl font-bold text-slate-900">Bảng điều khiển quản trị</h1>
                <p className="text-slate-600 mt-2">Quản lý toàn bộ dữ liệu của hệ thống.</p>
            </header>

            <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200">
                <div className="flex border-b border-slate-200 mb-6">
                    <TabButton tabName="users" label="Người dùng" count={users.length} />
                    <TabButton tabName="problems" label="Bài tập" count={problems.length} />
                    <TabButton tabName="submissions" label="Bài nộp" count={submissions.length} />
                </div>

                <div>
                    {activeTab === 'users' && (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-max">
                                    <thead>
                                        <tr className={trClass}>
                                            <th className={thClass}>Tên người dùng</th>
                                            <th className={thClass}>Vai trò</th>
                                            <th className={thClass}>Hành động</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {displayedUsers.map(user => (
                                            <tr key={user.id} className={trClass}>
                                                <td className={`${tdClass} font-semibold`}>{user.name}</td>
                                                <td className={tdClass}>
                                                    {editingUser?.id === user.id ? (
                                                        <select
                                                            value={editingUser.role}
                                                            onChange={handleRoleChange}
                                                            className="p-1 border border-slate-300 rounded-md"
                                                        >
                                                            <option value="student">student</option>
                                                            <option value="teacher">teacher</option>
                                                            <option value="admin">admin</option>
                                                        </select>
                                                    ) : (
                                                        user.role
                                                    )}
                                                </td>
                                                <td className={tdClass}>
                                                    {editingUser?.id === user.id ? (
                                                        <div className="flex gap-2">
                                                            <button onClick={handleSaveUserRole} className="text-sm font-semibold text-green-600 hover:text-green-800">Lưu</button>
                                                            <button onClick={handleCancelEdit} className="text-sm font-semibold text-slate-500 hover:text-slate-700">Hủy</button>
                                                        </div>
                                                    ) : (
                                                        <button onClick={() => handleEditUserClick(user)} className="text-sm font-semibold text-blue-600 hover:text-blue-800">Chỉnh sửa</button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <Pagination
                                currentPage={currentPages.users}
                                totalPages={usersTotalPages}
                                onPageChange={(page) => handlePageChange('users', page)}
                                totalItems={users.length}
                                itemsPerPage={ITEMS_PER_PAGE}
                            />
                        </>
                    )}
                    {activeTab === 'problems' && (
                         <>
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-max">
                                    <thead>
                                        <tr className={trClass}>
                                            <th className={thClass}>Tiêu đề</th>
                                            <th className={thClass}>Người tạo</th>
                                            <th className={thClass}>Ngày tạo</th>
                                            <th className={thClass}>Hành động</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {displayedProblems.map(problem => {
                                            const creator = users.find(u => u.id === problem.createdBy);
                                            const handleEditClick = (e: React.MouseEvent) => {
                                                e.stopPropagation(); // Prevent row click from firing
                                                router.push(`/problems/${problem.id}/edit`);
                                            };
                                            return (
                                                <tr key={problem.id} onClick={() => router.push(`/problems/${problem.id}`)} className={trClickableClass}>
                                                    <td className={`${tdClass} font-semibold`}>
                                                        {problem.title}
                                                    </td>
                                                    <td className={tdClass}>{creator?.name || 'Không rõ'}</td>
                                                    <td className={tdClass}>{new Date(problem.createdAt).toLocaleDateString()}</td>
                                                    <td className={tdClass}>
                                                        <button onClick={handleEditClick} className="text-sm font-semibold text-blue-600 hover:text-blue-800">Chỉnh sửa</button>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <Pagination
                                currentPage={currentPages.problems}
                                totalPages={problemsTotalPages}
                                onPageChange={(page) => handlePageChange('problems', page)}
                                totalItems={problems.length}
                                itemsPerPage={ITEMS_PER_PAGE}
                            />
                         </>
                    )}
                     {activeTab === 'submissions' && (
                         <>
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-max">
                                    <thead>
                                        <tr className={trClass}>
                                            <th className={thClass}>Người nộp</th>
                                            <th className={thClass}>Bài tập</th>
                                            <th className={thClass}>Điểm</th>
                                            <th className={thClass}>Ngày nộp</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {displayedSubmissions.map(sub => {
                                            const submitter = users.find(u => u.id === sub.submitterId);
                                            const problem = problems.find(p => p.id === sub.problemId);
                                            return (
                                                <tr key={sub.id} onClick={() => router.push(`/submissions/${sub.id}`)} className={trClickableClass}>
                                                    <td className={`${tdClass} font-semibold`}>{submitter?.name || 'Không rõ'}</td>
                                                    <td className={`${tdClass} text-blue-700`}>{problem?.title || 'Không rõ'}</td>
                                                    <td className={`${tdClass} font-bold`}>{sub.feedback.totalScore.toFixed(2)}</td>
                                                    <td className={tdClass}>{new Date(sub.submittedAt).toLocaleString()}</td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <Pagination
                                currentPage={currentPages.submissions}
                                totalPages={submissionsTotalPages}
                                onPageChange={(page) => handlePageChange('submissions', page)}
                                totalItems={sortedSubmissions.length}
                                itemsPerPage={ITEMS_PER_PAGE}
                            />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
