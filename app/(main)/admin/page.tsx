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

    // FIX: Update the 'user' parameter type to accept an object without a password, matching the type of users from the data context.
    const handleEditUserClick = (user: Omit<User, 'password'>) => {
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
            className={`px-4 py-2 text-sm font-semibold ${
                activeTab === tabName
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-muted-foreground hover:text-foreground'
            }`}
            aria-current={activeTab === tabName}
        >
            {label} <span className="text-xs bg-muted text-muted-foreground font-bold px-2 py-0.5 rounded-full">{count}</span>
        </button>
    );

    const thClass = "p-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider";
    const tdClass = "p-3 text-foreground text-sm";
    const trClass = "border-b border-border";
    const trClickableClass = `${trClass} cursor-pointer hover:bg-muted/50`;
    

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-foreground">Bảng điều khiển quản trị</h1>
                <p className="text-muted-foreground mt-1">Quản lý toàn bộ dữ liệu của hệ thống.</p>
            </header>

            <div className="bg-card p-4 sm:p-6 rounded-xl shadow-sm border border-border">
                <div className="flex border-b border-border mb-6">
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
                                        {displayedUsers.map((user, index) => (
                                            <tr key={user.id} className={`${trClass} ${index % 2 === 0 ? 'bg-transparent' : 'bg-muted/30'}`}>
                                                <td className={`${tdClass} font-semibold`}>{user.name}</td>
                                                <td className={tdClass}>
                                                    {editingUser?.id === user.id ? (
                                                        <select
                                                            value={editingUser.role}
                                                            onChange={handleRoleChange}
                                                            className="p-1 border border-border rounded-md bg-background"
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
                                                            <button onClick={handleCancelEdit} className="text-sm font-semibold text-muted-foreground hover:text-foreground">Hủy</button>
                                                        </div>
                                                    ) : (
                                                        <button onClick={() => handleEditUserClick(user)} className="text-sm font-semibold text-primary hover:text-primary/80">Chỉnh sửa</button>
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
                                                        <button onClick={handleEditClick} className="text-sm font-semibold text-primary hover:text-primary/80">Chỉnh sửa</button>
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
                                                    <td className={`${tdClass} font-semibold`}>{submitter?.name || 'Không rõ'}</td>
                                                    <td className={`${tdClass} text-muted-foreground`}>{problem?.title || 'Không rõ'}</td>
                                                    <td className={`${tdClass} font-bold text-primary text-right`}>{sub.feedback.totalScore.toFixed(2)}</td>
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