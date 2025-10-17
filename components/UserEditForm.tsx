'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/context/SessionContext';
import { updateUser } from '@/app/actions';
import type { User } from '@/types';

interface UserEditFormProps {
    user: Omit<User, 'password'>;
}

const UserEditForm: React.FC<UserEditFormProps> = ({ user }) => {
    const router = useRouter();
    const { loggedInUser } = useSession();
    const [isPending, startTransition] = useTransition();

    const isAdminEditing = loggedInUser?.role === 'admin';

    const handleSubmit = (formData: FormData) => {
        startTransition(async () => {
            await updateUser(user.id, formData);
            // Optionally show a success message
            router.back();
        });
    };

    const inputClass = "block w-full px-4 py-3 bg-background border border-border rounded-md text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:bg-muted disabled:cursor-not-allowed";
    const labelClass = "block text-foreground text-sm font-semibold mb-2";

    return (
        <form action={handleSubmit} className="bg-card p-8 rounded-xl shadow-sm border border-border space-y-6">
            <div>
                <label htmlFor="displayName" className={labelClass}>
                    Tên hiển thị
                </label>
                <input
                    id="displayName"
                    name="displayName"
                    type="text"
                    defaultValue={user.displayName}
                    className={inputClass}
                    required
                />
            </div>

            <div>
                <label htmlFor="username" className={labelClass}>
                    Tên đăng nhập
                </label>
                <input
                    id="username"
                    name="username"
                    type="text"
                    defaultValue={user.username}
                    className={inputClass}
                    disabled // Username cannot be changed
                />
            </div>
            
            {isAdminEditing && (
                <div>
                    <label htmlFor="role" className={labelClass}>
                        Vai trò
                    </label>
                    <select
                        id="role"
                        name="role"
                        defaultValue={user.role}
                        className={inputClass}
                        // Prevent admin from demoting themselves if they are the last admin
                        disabled={user.username === 'adminuser'}
                    >
                        <option value="student">Học sinh</option>
                        <option value="teacher">Giáo viên</option>
                        <option value="admin">Quản trị viên</option>
                    </select>
                </div>
            )}
            
            <div className="flex justify-end gap-4 pt-4 border-t border-border">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-6 py-2.5 bg-secondary text-secondary-foreground font-semibold rounded-md hover:bg-muted"
                >
                    Hủy
                </button>
                <button
                    type="submit"
                    disabled={isPending}
                    className="px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-md shadow-sm hover:bg-primary/90 disabled:opacity-50"
                >
                    {isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
            </div>
        </form>
    );
};

export default UserEditForm;
