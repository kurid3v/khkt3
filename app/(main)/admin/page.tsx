'use client';
import React, { useState, useMemo, useTransition, useOptimistic } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useDataContext } from '@/context/DataContext';
import { useSession } from '@/context/SessionContext';
import Pagination from '@/components/Pagination';
import type { User, Problem, Exam } from '@/types';
import PencilIcon from '@/components/icons/PencilIcon';
import TrashIcon from '@/components/icons/TrashIcon';
import ConfirmationModal from '@/components/ConfirmationModal';
import { deleteProblem, removeExam, deleteUser } from '@/app/actions';
import SwitchUserIcon from '@/components/icons/SwitchUserIcon';
import { testConnection } from '@/services/geminiService';


type ActiveTab = 'users' | 'problems' | 'submissions' | 'exams';

const ITEMS_PER_PAGE = 10;

export default function AdminDashboardPage() {
    const router = useRouter();
    const { users, problems, submissions, exams, isLoading } = useDataContext();
    const { impersonate, loggedInUser } = useSession();

    const [activeTab, setActiveTab] = useState<ActiveTab>('users');
    const [currentPages, setCurrentPages] = useState<{ [key in ActiveTab]: number }>({
        users: 1,
        problems: 1,
        submissions: 1,
        exams: 1,
    });
    const [problemToDelete, setProblemToDelete] = useState<Problem | null>(null);
    const [examToDelete, setExamToDelete] = useState<Exam | null>(null);
    const [userToDelete, setUserToDelete] = useState<Omit<User, 'password'> | null>(null);
    const [isPending, startTransition] = useTransition();

    // Connection test state
    const [connectionStatus, setConnectionStatus] = useState<{ success: boolean; message: string; latency: number } | null>(null);
    const [isTestingConnection, setIsTestingConnection] = useState(false);

    const [optimisticProblems, setOptimisticProblems] = useOptimistic(
        problems,
        (state, problemId: string) => state.filter(p => p.id !== problemId)
    );
    
    const [optimisticExams, setOptimisticExams] = useOptimistic(
        exams,
        (state, examId: string) => state.filter(e => e.id !== examId)
    );
    
    const [optimisticUsers, setOptimisticUsers] = useOptimistic(
        users,
        (state, userId: string) => state.filter(u => u.id !== userId)
    );

    const sortedSubmissions = useMemo(() => 
        [...submissions].sort((a, b) => b.submittedAt - a.submittedAt),
        [submissions]
    );
    
    const handleDeleteProblemClick = (problem: Problem) => {
        setProblemToDelete(problem);
    };

    const confirmDeleteProblem = () => {
        if (problemToDelete) {
            startTransition(async () => {
                setOptimisticProblems(problemToDelete.id);
                await deleteProblem(problemToDelete.id);
            });
            setProblemToDelete(null);
        }
    };
    
    const handleDeleteExamClick = (exam: Exam) => {
        setExamToDelete(exam);
    };

    const confirmDeleteExam = () => {
        if (examToDelete) {
            startTransition(async () => {
                setOptimisticExams(examToDelete.id);
                await removeExam(examToDelete.id);
            });
            setExamToDelete(null);
        }
    };

    const handleDeleteUserClick = (user: Omit<User, 'password'>) => {
        setUserToDelete(user);
    };
    
    const confirmDeleteUser = () => {
        if (userToDelete) {
            startTransition(async () => {
                setOptimisticUsers(userToDelete.id);
                await deleteUser(userToDelete.id);
            });
            setUserToDelete(null);
        }
    };

    const handleTestConnection = async () => {
        setIsTestingConnection(true);
        const result = await testConnection();
        setConnectionStatus(result);
        setIsTestingConnection(false);
        
        // Auto hide after 5 seconds
        setTimeout(() => setConnectionStatus(null), 5000);
    };
    
    const handlePageChange = (tab: ActiveTab, page: number) => {
        setCurrentPages(prev => ({ ...prev, [tab]: page }));
    };

    // Pagination Logic
    const usersTotalPages = Math.ceil(optimisticUsers.length / ITEMS_PER_PAGE);
    const usersStartIndex = (currentPages.users - 1) * ITEMS_PER_PAGE;
    const displayedUsers = optimisticUsers.slice(usersStartIndex, usersStartIndex + ITEMS_PER_PAGE);

    const problemsTotalPages = Math.ceil(optimisticProblems.length / ITEMS_PER_PAGE);
    const problemsStartIndex = (currentPages.problems - 1) * ITEMS_PER_PAGE;
    const displayedProblems = optimisticProblems.slice(problemsStartIndex, problemsStartIndex + ITEMS_PER_PAGE);
    
    const submissionsTotalPages = Math.ceil(sortedSubmissions.length / ITEMS_PER_PAGE);
    const submissionsStartIndex = (currentPages.submissions - 1) * ITEMS_PER_PAGE;
    const displayedSubmissions = sortedSubmissions.slice(submissionsStartIndex, submissionsStartIndex + ITEMS_PER_PAGE);

    const examsTotalPages = Math.ceil(optimisticExams.length / ITEMS_PER_PAGE);
    const examsStartIndex = (currentPages.exams - 1) * ITEMS_PER_PAGE;
    const displayedExams = optimisticExams.slice(examsStartIndex, examsStartIndex + ITEMS_PER_PAGE);


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
    

    return (
        <>
            <div className="container mx-auto px-4 py-8 max-w-7xl">
                <header className="mb-8 flex justify-between items-start md:items-center flex-col md:flex-row gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Bảng điều khiển quản trị</h1>
                        <p className="text-muted-foreground mt-1">Quản lý toàn bộ dữ liệu của hệ thống.</p>
                    </div>
                    <button 
                        onClick={handleTestConnection} 
                        disabled={isTestingConnection}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm ${
                            connectionStatus?.success 
                            ? 'bg-green-100 text-green-700 border border-green-200'
                            : connectionStatus?.success === false
                            ? 'bg-red-100 text-red-700 border border-red-200'
                            : 'bg-white border border-border hover:bg-slate-50'
                        }`}
                    >
                        {isTestingConnection ? (
                            <>
                            <div className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full"></div>
                            Đang kiểm tra...
                            </>
                        ) : (
                            <>
                                <span className={`h-2 w-2 rounded-full ${connectionStatus ? (connectionStatus.success ? 'bg-green-500' : 'bg-red-500') : 'bg-slate-400'}`}></span>
                                {connectionStatus ? (connectionStatus.success ? `Kết nối ổn định (${connectionStatus.latency}ms)` : connectionStatus.message) : 'Kiểm tra kết nối AI'}
                            </>
                        )}
                    </button>
                </header>

                <div className="bg-card p-4 sm:p-6 rounded-xl shadow-sm border border-border">
                    <div className="flex border-b border-border mb-6">
                        <TabButton tabName="users" label="Người dùng" count={users.length} />
                        <TabButton tabName="problems" label="Bài tập" count={problems.length} />
                        <TabButton tabName="exams" label="Đề thi" count={exams.length} />
                        <TabButton tabName="submissions" label="Bài nộp" count={submissions.length} />
                    </div>

                    <div>
                        {activeTab === 'users' && (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className={trClass}>
                                                <th className={thClass}>Tên hiển thị</th>
                                                <th className={thClass}>Tên đăng nhập</th>
                                                <th className={thClass}>Vai trò</th>
                                                <th className={thClass}>Hành động</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {displayedUsers.map((user) => {
                                                const isSelf = user.id === loggedInUser?.id;
                                                return (
                                                <tr key={user.id} className={`${trClass} hover:bg-muted/30`}>
                                                    <td className={`${tdClass} font-semibold`}>{user.displayName}</td>
                                                    <td className={`${tdClass}`}>{user.username}</td>
                                                    <td className={tdClass}>{user.role}</td>
                                                    <td className={`${tdClass}`}>
                                                        <div className="flex items-center gap-1">
                                                            {!isSelf && (
                                                                <button onClick={() => impersonate(user)} className="p-2 text-muted-foreground hover:text-yellow-600" title="Mạo danh"><SwitchUserIcon className="h-5 w-5" /></button>
                                                            )}
                                                            <button onClick={() => router.push(`/admin/users/${user.id}/edit`)} className="p-2 text-muted-foreground hover:text-primary" title="Chỉnh sửa"><PencilIcon className="h-5 w-5" /></button>
                                                            {!isSelf && user.username !== 'adminuser' && (
                                                                <button onClick={() => handleDeleteUserClick(user)} className="p-2 text-muted-foreground hover:text-destructive" title="Xóa"><TrashIcon /></button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )})}
                                        </tbody>
                                    </table>
                                </div>
                                <Pagination
                                    currentPage={currentPages.users}
                                    totalPages={usersTotalPages}
                                    onPageChange={(page) => handlePageChange('users', page)}
                                    totalItems={optimisticUsers.length}
                                    itemsPerPage={ITEMS_PER_PAGE}
                                />
                            </>
                        )}
                        {activeTab === 'problems' && (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
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
                                                return (
                                                    <tr key={problem.id} className={`${trClass} hover:bg-muted/50`}>
                                                        <td className={`${tdClass} font-semibold`}>
                                                            <Link href={`/problems/${problem.id}`} className="hover:underline">{problem.title}</Link>
                                                        </td>
                                                        <td className={tdClass}>{creator?.displayName || 'Không rõ'}</td>
                                                        <td className={tdClass}>{new Date(problem.createdAt).toLocaleDateString()}</td>
                                                        <td className={`${tdClass} flex items-center gap-2`}>
                                                            <button onClick={() => router.push(`/problems/${problem.id}/edit`)} className="p-2 text-muted-foreground hover:text-primary" title="Chỉnh sửa"><PencilIcon className="h-5 w-5" /></button>
                                                            <button onClick={() => handleDeleteProblemClick(problem)} className="p-2 text-muted-foreground hover:text-destructive" title="Xóa"><TrashIcon /></button>
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
                                    totalItems={optimisticProblems.length}
                                    itemsPerPage={ITEMS_PER_PAGE}
                                />
                            </>
                        )}
                         {activeTab === 'exams' && (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className={trClass}>
                                                <th className={thClass}>Tên đề thi</th>
                                                <th className={thClass}>Người tạo</th>
                                                <th className={thClass}>Thời gian</th>
                                                <th className={thClass}>Hành động</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {displayedExams.map(exam => {
                                                const creator = users.find(u => u.id === exam.createdBy);
                                                return (
                                                    <tr key={exam.id} className={`${trClass} hover:bg-muted/50`}>
                                                        <td className={`${tdClass} font-semibold`}>
                                                            <Link href={`/exams/${exam.id}`} className="hover:underline">{exam.title}</Link>
                                                        </td>
                                                        <td className={tdClass}>{creator?.displayName || 'Không rõ'}</td>
                                                        <td className={tdClass}>{new Date(exam.startTime).toLocaleString()} - {new Date(exam.endTime).toLocaleString()}</td>
                                                        <td className={`${tdClass} flex items-center gap-2`}>
                                                            <button onClick={() => handleDeleteExamClick(exam)} className="p-2 text-muted-foreground hover:text-destructive" title="Xóa"><TrashIcon /></button>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                <Pagination
                                    currentPage={currentPages.exams}
                                    totalPages={examsTotalPages}
                                    onPageChange={(page) => handlePageChange('exams', page)}
                                    totalItems={optimisticExams.length}
                                    itemsPerPage={ITEMS_PER_PAGE}
                                />
                            </>
                        )}
                        {activeTab === 'submissions' && (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
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
                                                    <tr key={sub.id} onClick={() => router.push(`/submissions/${sub.id}`)} className={`${trClass} cursor-pointer hover:bg-muted/50`}>
                                                        <td className={`${tdClass} font-semibold`}>{submitter?.displayName || 'Không rõ'}</td>
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
             <ConfirmationModal
                isOpen={!!problemToDelete}
                onClose={() => setProblemToDelete(null)}
                onConfirm={confirmDeleteProblem}
                title="Xác nhận xóa bài tập"
                message={`Bạn có chắc chắn muốn xóa bài tập "${problemToDelete?.title}" không? Hành động này sẽ xóa vĩnh viễn tất cả các bài nộp liên quan.`}
            />
            <ConfirmationModal
                isOpen={!!examToDelete}
                onClose={() => setExamToDelete(null)}
                onConfirm={confirmDeleteExam}
                title="Xác nhận xóa đề thi"
                message={`Bạn có chắc chắn muốn xóa đề thi "${examToDelete?.title}" không? Hành động này sẽ xóa vĩnh viễn TẤT CẢ các câu hỏi và bài nộp liên quan.`}
            />
            <ConfirmationModal
                isOpen={!!userToDelete}
                onClose={() => setUserToDelete(null)}
                onConfirm={confirmDeleteUser}
                title="Xác nhận xóa người dùng"
                message={`Bạn có chắc chắn muốn xóa người dùng "${userToDelete?.displayName}" không? Hành động này không thể hoàn tác. Các bài tập và đề thi do người dùng này tạo sẽ được chuyển cho quản trị viên.`}
            />
        </>
    );
};