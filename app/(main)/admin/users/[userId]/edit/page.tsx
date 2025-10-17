'use client';

import { useSession } from '@/context/SessionContext';
import { useDataContext } from '@/context/DataContext';
import { useRouter } from 'next/navigation';
import UserEditForm from '@/components/UserEditForm';
import UserCircleIcon from '@/components/icons/UserCircleIcon';

export default function AdminEditUserPage({ params }: { params: { userId: string } }) {
    const { loggedInUser, isLoading: isSessionLoading } = useSession();
    const { users, isLoading: isDataLoading } = useDataContext();
    const router = useRouter();

    const userToEdit = users.find(u => u.id === params.userId);

    if (isSessionLoading || isDataLoading) {
        return <div className="p-8 text-center">Đang tải dữ liệu người dùng...</div>;
    }

    if (loggedInUser?.role !== 'admin') {
        router.replace('/dashboard');
        return null;
    }
    
    if (!userToEdit) {
        return <div className="p-8 text-center">Không tìm thấy người dùng.</div>;
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl">
             <header className="flex flex-col items-center text-center mb-8">
                <UserCircleIcon className="w-24 h-24 text-slate-300" />
                <h1 className="text-4xl font-bold text-foreground mt-4">Chỉnh sửa hồ sơ</h1>
                <p className="text-muted-foreground mt-1">
                    Thay đổi thông tin cho người dùng <span className="font-semibold text-foreground">{userToEdit.displayName}</span>.
                </p>
            </header>
            <UserEditForm user={userToEdit} />
        </div>
    );
}