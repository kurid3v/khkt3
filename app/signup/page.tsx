'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from '@/context/SessionContext';

export default function SignUpPage() {
  const [name, setName] = useState('');
  const [role, setRole] = useState<'teacher' | 'student'>('student');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const { signUp } = useSession();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Họ và tên không được để trống.');
      return;
    }
    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }
    
    const result = await signUp(name, role, password);
    if (result.success) {
      router.push('/dashboard');
    } else {
      setError(result.message || 'Đăng ký không thành công. Vui lòng thử lại.');
    }
  };
  
  const inputClasses = "block w-full px-4 py-3 bg-background border border-border rounded-md text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring focus:ring-offset-2";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <form onSubmit={handleSubmit} className="bg-card shadow-lg rounded-xl border border-border p-8 space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground">Tạo tài khoản</h1>
            <p className="text-muted-foreground mt-2">Tham gia Lớp học AI ngay hôm nay</p>
          </div>
          
          {error && <p className="text-destructive bg-destructive/10 p-3 rounded-md text-center">{error}</p>}

          <div>
            <label htmlFor="name-input" className="block text-foreground text-sm font-semibold mb-2">
              Họ và tên (dùng để đăng nhập)
            </label>
            <input
              id="name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Nguyễn Văn A"
              className={inputClasses}
            />
          </div>

          <div>
            <label htmlFor="password-input" className="block text-foreground text-sm font-semibold mb-2">
              Mật khẩu
            </label>
            <input
              id="password-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ít nhất 6 ký tự"
              className={inputClasses}
            />
          </div>

          <div>
            <label htmlFor="confirm-password-input" className="block text-foreground text-sm font-semibold mb-2">
              Xác nhận mật khẩu
            </label>
            <input
              id="confirm-password-input"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu"
              className={inputClasses}
            />
          </div>

          <div>
            <label className="block text-foreground text-sm font-semibold mb-2">
              Bạn là
            </label>
            <div className="flex rounded-md border border-border p-1 bg-background">
                <button
                    type="button"
                    onClick={() => setRole('student')}
                    className={`w-1/2 py-2 rounded-sm font-semibold ${role === 'student' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted'}`}
                >
                    Học sinh
                </button>
                <button
                    type="button"
                    onClick={() => setRole('teacher')}
                    className={`w-1/2 py-2 rounded-sm font-semibold ${role === 'teacher' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted'}`}
                >
                    Giáo viên
                </button>
            </div>
          </div>
          
          <div>
            <button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!name || !password || !confirmPassword}
            >
              Đăng ký
            </button>
          </div>

          <div className="text-center">
            <Link
              href="/login"
              className="inline-block align-baseline font-semibold text-sm text-primary hover:text-primary/90"
            >
              &larr; Quay lại Đăng nhập
            </Link>
          </div>
        </form>
        <footer className="text-center mt-8 text-muted-foreground text-sm">
          <p>Cung cấp bởi công nghệ AI tiên tiến.</p>
        </footer>
      </div>
    </div>
  );
};
