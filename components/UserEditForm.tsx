'use client';

import React, { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/context/SessionContext';
import { updateUser } from '@/app/actions';
import type { User } from '@/types';
import UserCircleIcon from './icons/UserCircleIcon';
import EyeIcon from './icons/EyeIcon';
import EyeOffIcon from './icons/EyeOffIcon';

interface UserEditFormProps {
    user: Omit<User, 'password'>;
}

const UserEditForm: React.FC<UserEditFormProps> = ({ user }) => {
    const router = useRouter();
    const { loggedInUser } = useSession();
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    
    const [avatarPreview, setAvatarPreview] = useState(user.avatar || null);
    const [avatarData, setAvatarData] = useState('');
    const avatarInputRef = useRef<HTMLInputElement>(null);

    const isAdminEditing = loggedInUser?.role === 'admin';
    const isSelf = loggedInUser?.id === user.id;

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (loadEvent) => {
                const result = loadEvent.target?.result as string;
                setAvatarPreview(result);
                setAvatarData(result);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleSubmit = (formData: FormData) => {
        setError('');
        startTransition(async () => {
            try {
                await updateUser(user.id, formData);
                if (isSelf) {
                    // This is a simple way to refresh session, a more robust solution would be better
                    alert("Cập nhật thành công! Vui lòng đăng nhập lại để xem thay đổi.");
                    router.push('/login');
                } else {
                    router.back();
                }
            } catch (err) {
                 setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra.");
            }
        });
    };

    const inputClass = "block w-full px-4 py-3 bg-background border border-border rounded-md text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:bg-muted disabled:cursor-not-allowed";
    const labelClass = "block text-foreground text-sm font-semibold mb-2";

    return (
        <form action={handleSubmit} className="bg-card p-8 rounded-xl shadow-sm border border-border space-y-6">
            {error && <p className="text-destructive bg-destructive/10 p-3 rounded-md text-center">{error}</p>}
            
            <div className="flex items-center gap-4">
                {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar preview" className="w-20 h-20 rounded-full object-cover" />
                ) : (
                    <UserCircleIcon className="w-20 h-20 text-slate-300" />
                )}
                <div className="flex flex-col">
                    <input type="file" ref={avatarInputRef} onChange={handleAvatarChange} accept="image/*" hidden name="avatar-file" />
                    <input type="hidden" name="avatar" value={avatarData} />
                    <button type="button" onClick={() => avatarInputRef.current?.click()} className="px-4 py-2 bg-secondary text-secondary-foreground font-semibold rounded-md hover:bg-muted text-sm">
                        Thay đổi ảnh
                    </button>
                    <p className="text-xs text-muted-foreground mt-2">JPG, PNG, GIF. Tối đa 5MB.</p>
                </div>
            </div>

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
                    disabled={!isAdminEditing || user.username === 'adminuser'}
                />
                {!isAdminEditing && <p className="text-xs text-muted-foreground mt-1">Tên đăng nhập không thể thay đổi.</p>}
            </div>
            
            {isAdminEditing && (
                <>
                    <div>
                        <label htmlFor="role" className={labelClass}>
                            Vai trò
                        </label>
                        <select
                            id="role"
                            name="role"
                            defaultValue={user.role}
                            className={inputClass}
                            disabled={user.username === 'adminuser'}
                        >
                            <option value="student">Học sinh</option>
                            <option value="teacher">Giáo viên</option>
                            <option value="admin">Quản trị viên</option>
                        </select>
                    </div>

                    <div className="pt-4 border-t border-border">
                        <p className="text-foreground font-semibold">Đặt lại mật khẩu (tùy chọn)</p>
                        <p className="text-xs text-muted-foreground mb-4">Để trống nếu không muốn thay đổi mật khẩu.</p>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="password-input" className="block text-foreground text-sm font-semibold mb-2">
                                  Mật khẩu mới
                                </label>
                                <div className="relative">
                                  <input
                                    id="password-input"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Ít nhất 6 ký tự"
                                    className={`${inputClass} pr-10`}
                                  />
                                  <button
                                      type="button"
                                      onClick={() => setShowPassword(!showPassword)}
                                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                                  >
                                      {showPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                                  </button>
                                </div>
                            </div>
                             <div>
                                <label htmlFor="confirm-password-input" className="block text-foreground text-sm font-semibold mb-2">
                                  Xác nhận mật khẩu mới
                                </label>
                                <div className="relative">
                                  <input
                                    id="confirm-password-input"
                                    name="confirmPassword"
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    placeholder="Nhập lại mật khẩu mới"
                                    className={`${inputClass} pr-10`}
                                  />
                                   <button
                                      type="button"
                                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                                  >
                                      {showConfirmPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                                  </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
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