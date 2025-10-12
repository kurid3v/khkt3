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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !password) {
        setError("Vui lòng nhập tên đăng nhập và mật khẩu.");
        return;
    }
    const success = login(name, password);
    if (success) {
      router.push('/dashboard');
    } else {
      setError('Tên đăng nhập hoặc mật khẩu không chính xác.');
    }
  };

  const inputClasses = "block w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors duration-200";

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center">
      <div className="w-full max-w-md">
        <form onSubmit={handleLogin} className="bg-white shadow-2xl rounded-2xl px-8 pt-6 pb-8 mb-4">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-slate-900">Chào mừng</h1>
            <p className="text-slate-600 mt-2">Vui lòng đăng nhập để tiếp tục</p>
          </div>

          {error && <p className="text-red-500 bg-red-100 p-3 rounded-md mb-4 text-center">{error}</p>}
          
          <div className="mb-4">
            <label htmlFor="name-input" className="block text-slate-700 text-sm font-bold mb-2">
              Tên đăng nhập
            </label>
            <input
              id="name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Học sinh An"
              className={inputClasses}
              required
            />
          </div>

          <div className="mb-6">
            <label htmlFor="password-input" className="block text-slate-700 text-sm font-bold mb-2">
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

          <div className="flex items-center justify-center">
            <button
              type="submit"
              disabled={!name || !password}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Đăng nhập
            </button>
          </div>
           <div className="text-center mt-6">
            <Link
              href="/signup"
              className="inline-block align-baseline font-bold text-sm text-blue-500 hover:text-blue-800"
            >
              Chưa có tài khoản? Đăng ký ngay
            </Link>
          </div>
        </form>
         <footer className="text-center mt-8 text-slate-500 text-sm">
          <p>Cung cấp bởi công nghệ AI tiên tiến.</p>
        </footer>
      </div>
    </div>
  );
};
