'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from '@/context/SessionContext';
import type { User } from '../types';

interface HeaderProps {
  user: Omit<User, 'password'>;
}

const Header: React.FC<HeaderProps> = ({ user }) => {
  const { logout } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    logout();
    router.push('/login');
  }

  const roleTextMap = {
    teacher: 'Giáo viên',
    student: 'Học sinh',
    admin: 'Quản trị viên'
  };
  const roleColorMap = {
    teacher: 'bg-green-100 text-green-800 border border-green-200',
    student: 'bg-blue-100 text-blue-800 border border-blue-200',
    admin: 'bg-purple-100 text-purple-800 border border-purple-200'
  };

  const roleText = roleTextMap[user.role] || 'Không xác định';
  const roleColor = roleColorMap[user.role] || 'bg-slate-100 text-slate-800';
  
  const NavLink: React.FC<{ href: string; children: React.ReactNode }> = ({ href, children }) => {
    const isActive = pathname === href;
    return (
        <Link href={href} className={`px-3 py-2 text-sm font-semibold rounded-md transition-colors ${
            isActive 
            ? 'text-primary' 
            : 'text-muted-foreground hover:text-foreground'
        }`}>
            {children}
        </Link>
    );
  };

  return (
    <header className="bg-card border-b sticky top-0 z-10">
      <div className="container mx-auto px-4 py-3 max-w-7xl flex justify-between items-center">
        <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-xl font-bold text-foreground">
                Lớp học AI
            </Link>
            <nav className="flex items-center gap-2">
                <NavLink href="/dashboard">Bài tập</NavLink>
                <NavLink href="/exams">Đề thi</NavLink>
                <NavLink href="/submissions/all">Bài nộp</NavLink>
                {user.role === 'admin' && (
                    <NavLink href="/admin">Quản trị</NavLink>
                )}
            </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="font-semibold text-foreground">{user.name}</span>
            <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${roleColor}`}>
              {roleText}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm bg-secondary text-secondary-foreground font-semibold rounded-md hover:bg-muted transition-colors"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;