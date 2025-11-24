
'use client';

import React, { useState, useTransition } from 'react';
import { useRouter, notFound } from 'next/navigation';
import Link from 'next/link';
import { useDataContext } from '@/context/DataContext';
import { useSession } from '@/context/SessionContext';
import { removeStudentFromClass, deleteClassroom, toggleClassroomVisibility } from '@/app/actions';
import ConfirmationModal from '@/components/ConfirmationModal';
import UsersIcon from '@/components/icons/UsersIcon';
import TrashIcon from '@/components/icons/TrashIcon';
import UserCircleIcon from '@/components/icons/UserCircleIcon';
import type { User } from '@/types';

type UserSession = Omit<User, 'password'>;

export default function ClassroomDetailPage({ params }: { params: { classroomId: string } }) {
    const { classroomId } = params;
    const router = useRouter();
    const { classrooms, users, isLoading, refetchData } = useDataContext();
    const { currentUser } = useSession();
    
    const [studentToRemove, setStudentToRemove] = useState<UserSession | null>(null);
    const [isDeleteClassModalOpen, setIsDeleteClassModalOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Đang tải dữ liệu...</p>
            </div>
        );
    }

    if (!currentUser) return null;

    const classroom = classrooms.find(c => c.id === classroomId);
    
    if (!classroom) {
        notFound();
        return null;
    }

    const isAuthorized = currentUser.role === 'admin' || currentUser.id === classroom.teacherId;

    if (!isAuthorized) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="bg-destructive/10 text-destructive p-4 rounded-lg text-center font-semibold">
                    Bạn không có quyền truy cập trang quản lý của lớp học này.
                </div>
                <div className="text-center mt-4">
                    <Link href="/classrooms" className="text-primary hover:underline">Quay lại danh sách lớp học</Link>
                </div>
            </div>
        );
    }

    const students = users.filter(u => classroom.studentIds.includes(u.id));
    const teacher = users.find(u => u.id === classroom.teacherId);

    const handleCopyCode = () => {
        navigator.clipboard.writeText(classroom.joinCode);
        alert("Đã sao chép mã tham gia!");
    };

    const handleDeleteClass = () => {
        startTransition(async () => {
            await deleteClassroom(classroomId);
            await refetchData();
            router.push('/classrooms');
        });
    };

    const handleRemoveStudent = () => {
        if (!studentToRemove) return;
        startTransition(async () => {
            await removeStudentFromClass(classroomId, studentToRemove.id);
            await refetchData();
            setStudentToRemove(null);
        });
    };

    const handleToggleVisibility = () => {
        startTransition(async () => {
            await toggleClassroomVisibility(classroomId, !classroom.isPublic);
            await refetchData();
        });
    };

    return (
        <>
            <div className="container mx-auto px-4 py-8 max-w-5xl">
                <Link href="/classrooms" className="mb-6 text-primary font-semibold hover:underline inline-block">
                    &larr; Quay lại danh sách lớp
                </Link>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Info & Actions */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-card p-6 rounded-xl shadow-card border border-border">
                            <div className="flex justify-between items-start">
                                <h1 className="text-2xl font-bold text-foreground mb-1">{classroom.name}</h1>
                                {classroom.isPublic ? (
                                    <span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap">Công khai</span>
                                ) : (
                                    <span className="bg-slate-100 text-slate-800 text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap">Riêng tư</span>
                                )}
                            </div>
                            <p className="text-muted-foreground text-sm">Giáo viên: {teacher?.displayName || 'N/A'}</p>
                            
                            <div className="mt-6">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Mã tham gia</label>
                                <div className="flex items-center gap-2 mt-2">
                                    <code className="flex-grow p-3 bg-secondary rounded-lg font-mono text-xl text-center font-bold tracking-widest border border-border">
                                        {classroom.joinCode}
                                    </code>
                                </div>
                                <button 
                                    onClick={handleCopyCode} 
                                    className="mt-2 w-full text-sm font-semibold text-primary hover:text-primary/80"
                                >
                                    Sao chép mã
                                </button>
                            </div>

                            <div className="mt-6 pt-6 border-t border-border">
                                <div className="flex items-center gap-2 text-foreground font-medium">
                                    <UsersIcon className="h-5 w-5 text-muted-foreground" />
                                    <span>{students.length} học sinh</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-card p-6 rounded-xl shadow-card border border-border">
                             <h3 className="font-bold text-foreground mb-4">Cài đặt</h3>
                             
                             <div className="flex items-center justify-between mb-6">
                                <span className="text-sm font-medium">Trạng thái lớp</span>
                                <button
                                    onClick={handleToggleVisibility}
                                    disabled={isPending}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${classroom.isPublic ? 'bg-green-500' : 'bg-slate-300'}`}
                                >
                                    <span className="sr-only">Toggle public status</span>
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${classroom.isPublic ? 'translate-x-6' : 'translate-x-1'}`}
                                    />
                                </button>
                             </div>

                             <button 
                                onClick={() => setIsDeleteClassModalOpen(true)}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-destructive/10 text-destructive font-semibold rounded-lg hover:bg-destructive/20 transition-colors"
                             >
                                <TrashIcon /> Xóa lớp học này
                             </button>
                             <p className="text-xs text-muted-foreground mt-3 text-center">
                                Hành động này sẽ xóa lớp học khỏi hệ thống.
                             </p>
                        </div>
                    </div>

                    {/* Right Column: Student List */}
                    <div className="lg:col-span-2">
                        <div className="bg-card rounded-xl shadow-card border border-border overflow-hidden">
                            <div className="p-6 border-b border-border flex justify-between items-center">
                                <h2 className="text-xl font-bold text-foreground">Danh sách học sinh</h2>
                                <span className="bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-sm font-semibold">
                                    {students.length}
                                </span>
                            </div>
                            
                            {students.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-secondary/50">
                                            <tr>
                                                <th className="p-4 text-sm font-semibold text-muted-foreground">Học sinh</th>
                                                <th className="p-4 text-sm font-semibold text-muted-foreground">Tên đăng nhập</th>
                                                <th className="p-4 text-sm font-semibold text-muted-foreground text-right">Hành động</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {students.map(student => (
                                                <tr key={student.id} className="hover:bg-muted/50 transition-colors">
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-3">
                                                            {student.avatar ? (
                                                                <img src={student.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                                                            ) : (
                                                                <UserCircleIcon className="w-8 h-8 text-muted-foreground" />
                                                            )}
                                                            <span className="font-semibold text-foreground">{student.displayName}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-muted-foreground text-sm font-mono">
                                                        {student.username}
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <button 
                                                            onClick={() => setStudentToRemove(student)}
                                                            className="text-muted-foreground hover:text-destructive p-2 rounded-md hover:bg-destructive/10 transition-colors"
                                                            title="Xóa khỏi lớp"
                                                        >
                                                            <TrashIcon />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="p-12 text-center text-muted-foreground">
                                    <UsersIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                                    <p>Chưa có học sinh nào trong lớp.</p>
                                    <p className="text-sm mt-1">Chia sẻ mã tham gia <strong>{classroom.joinCode}</strong> cho học sinh của bạn.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <ConfirmationModal 
                isOpen={isDeleteClassModalOpen}
                onClose={() => setIsDeleteClassModalOpen(false)}
                onConfirm={handleDeleteClass}
                title="Xóa lớp học"
                message={`Bạn có chắc chắn muốn xóa lớp học "${classroom.name}"? Hành động này không thể hoàn tác.`}
                confirmButtonText="Xóa lớp"
                confirmButtonClass="bg-destructive hover:bg-destructive/90"
            />
            
            <ConfirmationModal 
                isOpen={!!studentToRemove}
                onClose={() => setStudentToRemove(null)}
                onConfirm={handleRemoveStudent}
                title="Xóa học sinh"
                message={`Bạn có chắc chắn muốn xóa học sinh "${studentToRemove?.displayName}" khỏi lớp học này?`}
                confirmButtonText="Xóa học sinh"
                confirmButtonClass="bg-destructive hover:bg-destructive/90"
            />
        </>
    );
}
