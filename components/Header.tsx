'use client';
import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from '@/context/SessionContext';
import type { User } from '../types';
import UserCircleIcon from './icons/UserCircleIcon';

interface HeaderProps {
  user: Omit<User, 'password'>;
}

const Header: React.FC<HeaderProps> = ({ user }) => {
  const { logout } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
        <Link href={href} className={`px-3 py-2 text-sm font-semibold rounded-md ${
            isActive 
            ? 'text-primary' 
            : 'text-muted-foreground hover:text-foreground'
        }`}>
            {children}
        </Link>
    );
  };
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-card border-b sticky top-0 z-10">
      <div className="container mx-auto px-4 py-3 max-w-7xl flex justify-between items-center">
        <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-xl font-bold text-foreground">
                AVinci
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
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 cursor-pointer p-1 rounded-md hover:bg-muted"
            >
              <div className="text-right">
                <span className="font-semibold text-foreground">{user.displayName}</span>
                <span className={`block text-xs font-medium text-muted-foreground`}>
                  {roleText}
                </span>
              </div>
               {user.avatar ? (
                <img src={user.avatar} alt="User avatar" className="w-9 h-9 rounded-full object-cover" />
              ) : (
                <UserCircleIcon className="w-9 h-9 text-slate-500" />
              )}
            </button>
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-md shadow-lg py-1 z-20">
                <Link href="/profile" onClick={() => setIsDropdownOpen(false)} className="block px-4 py-2 text-sm text-foreground hover:bg-muted">
                  Hồ sơ của tôi
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-destructive/10"
                >
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;