'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useDataContext } from '@/context/DataContext';

export default function LoginPage() {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { login } = useDataContext();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !password) {
        setError("Vui lòng nhập tên đăng nhập và mật khẩu.");
        return;
    }
    const success = await login(name, password);
    if (success) {
      router.push('/dashboard');
    } else {
      setError('Tên đăng nhập hoặc mật khẩu không chính xác.');
    }
  };

  const inputClasses = "block w-full px-4 py-3 bg-background border border-border rounded-md text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-all duration-200";

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
            <label htmlFor="name-input" className="block text-foreground text-sm font-semibold mb-2">
              Tên đăng nhập
            </label>
            <input
              id="name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Hoc sinh An"
              className={inputClasses}
              required
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
              placeholder="••••••••"
              className={inputClasses}
              required
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={!name || !password}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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