'use client';

import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import type { User } from '@/types';

type UserSession = Omit<User, 'password'>;

interface SessionContextType {
    currentUser: UserSession | null;
    isLoading: boolean;
    login: (name: string, password: string) => Promise<boolean>;
    signUp: (name: string, role: 'teacher' | 'student', password: string) => Promise<{ success: boolean; message?: string }>;
    logout: () => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

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
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, password }),
            });
            if (response.ok) {
                const userSession = await response.json();
                setCurrentUser(userSession);
                sessionStorage.setItem('currentUser', JSON.stringify(userSession));
                return true;
            }
        } catch (error) {
            console.error("Login API call failed:", error);
        }
        return false;
    };

    const signUp = async (name: string, role: 'teacher' | 'student', password: string): Promise<{ success: boolean; message?: string }> => {
        try {
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, role, password }),
            });
            const data = await response.json();

            if (response.ok) {
                const { user } = data;
                setCurrentUser(user);
                sessionStorage.setItem('currentUser', JSON.stringify(user));
                return { success: true };
            }
            return { success: false, message: data.message || 'Signup failed' };
        } catch (error) {
            console.error("Signup API call failed:", error);
            return { success: false, message: 'An unexpected error occurred.' };
        }
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