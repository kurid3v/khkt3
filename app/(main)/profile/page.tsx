'use client';
import { useSession } from '@/context/SessionContext';
import { useRouter } from 'next/navigation';
import UserEditForm from '@/components/UserEditForm';
import UserCircleIcon from '@/components/icons/UserCircleIcon';

export default function ProfilePage() {
    const { currentUser, isLoading } = useSession();
    const router = useRouter();

    if (isLoading) {
        return <div className="p-8 text-center">Đang tải hồ sơ...</div>;
    }

    if (!currentUser) {
        router.replace('/login');
        return null;
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl">
            <header className="flex flex-col items-center text-center mb-8">
                 {currentUser.avatar ? (
                    <img src={currentUser.avatar} alt="User avatar" className="w-24 h-24 rounded-full object-cover" />
                ) : (
                    <UserCircleIcon className="w-24 h-24 text-slate-300" />
                )}
                <h1 className="text-4xl font-bold text-foreground mt-4">Hồ sơ của tôi</h1>
                <p className="text-muted-foreground mt-1">Xem và cập nhật thông tin tài khoản của bạn.</p>
            </header>
            <UserEditForm user={currentUser} />
        </div>
    );
}