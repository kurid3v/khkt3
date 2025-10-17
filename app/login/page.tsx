
'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from '@/context/SessionContext';
import EyeIcon from '@/components/icons/EyeIcon';
import EyeOffIcon from '@/components/icons/EyeOffIcon';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useSession();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password) {
        setError("Vui lòng nhập tên đăng nhập và mật khẩu.");
        return;
    }
    const success = await login(username, password);
    if (success) {
      router.push('/dashboard');
    } else {
      setError('Tên đăng nhập hoặc mật khẩu không chính xác.');
    }
  };

  const inputClasses = "block w-full px-4 py-3 bg-background border border-border rounded-md text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring focus:ring-offset-2";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <form onSubmit={handleLogin} className="bg-card shadow-lg rounded-xl border border-border p-8 space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground">Chào mừng trở lại</h1>
            <p className="text-muted-foreground mt-2">Vui lòng đăng nhập để tiếp tục</p>
          </div>

          {error && <p className="text-destructive bg-destructive/10 p-3 rounded-md text-center">{error}</p>}
          
          <div>
            <label htmlFor="username-input" className="block text-foreground text-sm font-semibold mb-2">
              Tên đăng nhập
            </label>
            <input
              id="username-input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ví dụ: hocsinhan"
              className={inputClasses}
              required
            />
          </div>

          <div>
            <label htmlFor="password-input" className="block text-foreground text-sm font-semibold mb-2">
              Mật khẩu
            </label>
            <div className="relative">
              <input
                id="password-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`${inputClasses} pr-10`}
                required
              />
              <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                  {showPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={!username || !password}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Đăng nhập
            </button>
          </div>
           <div className="text-center">
            <Link
              href="/signup"
              className="inline-block align-baseline font-semibold text-sm text-primary hover:text-primary/90"
            >
              Chưa có tài khoản? Đăng ký ngay
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