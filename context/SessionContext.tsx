'use client';

import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import type { User } from '@/types';

// HACK: This is a simplified client-side auth simulation. It mirrors the old DataContext's auth logic
// but without holding all application data.
// In a real app, login/signup would likely set a secure cookie that server components could read.

type UserSession = Omit<User, 'password'>;

interface SessionContextType {
    currentUser: UserSession | null;
    isLoading: boolean;
    login: (name: string, password: string) => Promise<boolean>;
    signUp: (name: string, role: 'teacher' | 'student', password: string) => Promise<{ success: boolean; message?: string }>;
    logout: () => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

// Dummy users for client-side login simulation since we removed the API calls for it
const DUMMY_USERS: User[] = [
  { "id": "user_admin_1", "name": "Admin User", "role": "admin", "password": "admin" },
  { "id": "user_teacher_1", "name": "Cô giáo Thảo", "role": "teacher", "password": "password123" },
  { "id": "user_student_1", "name": "Học sinh An", "role": "student", "password": "password123" },
  { "id": "user_student_2", "name": "Học sinh Bình", "role": "student", "password": "password123" },
  { "id": "user_student_3", "name": "Học sinh Cường", "role": "student", "password": "password123" }
];


export const SessionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        try {
            const loggedInUserJson = sessionStorage.getItem('currentUser');
            if (loggedInUserJson) {
                setCurrentUser(JSON.parse(loggedInUserJson));
            }
        } catch (error) {
            console.error("Failed to parse user from session storage", error);
            sessionStorage.removeItem('currentUser');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const login = async (name: string, password: string): Promise<boolean> => {
        const user = DUMMY_USERS.find(u => u.name.trim().toLowerCase() === name.trim().toLowerCase());
        if (user && user.password === password) {
            const { password: _, ...userSession } = user;
            setCurrentUser(userSession);
            sessionStorage.setItem('currentUser', JSON.stringify(userSession));
            return true;
        }
        return false;
    };

    const signUp = async (name: string, role: 'teacher' | 'student', password: string): Promise<{ success: boolean; message?: string }> => {
        const trimmedName = name.trim();
        if (DUMMY_USERS.some(u => u.name.toLowerCase() === trimmedName.toLowerCase())) {
             return { success: false, message: 'Tên người dùng này đã tồn tại.' };
        }
        const newUser: UserSession = { id: crypto.randomUUID(), name: trimmedName, role };
        setCurrentUser(newUser);
        sessionStorage.setItem('currentUser', JSON.stringify(newUser));
        // In a real app, this would also persist the new user to the database via a server action.
        return { success: true };
    };
    
    const logout = () => {
        setCurrentUser(null);
        sessionStorage.removeItem('currentUser');
    };
    
    const value: SessionContextType = {
        currentUser, isLoading,
        login, signUp, logout,
    };

    return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

export const useSession = (): SessionContextType => {
    const context = useContext(SessionContext);
    if (context === undefined) {
        throw new Error('useSession must be used within a SessionProvider');
    }
    return context;
};