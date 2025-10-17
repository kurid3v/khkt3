'use client';

import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import type { User } from '@/types';

type UserSession = Omit<User, 'password'>;

interface SessionContextType {
    currentUser: UserSession | null;
    loggedInUser: UserSession | null; // The actual user who is logged in
    impersonatedUser: UserSession | null; // The user being impersonated
    isLoading: boolean;
    login: (username: string, password: string) => Promise<boolean>;
    signUp: (username: string, displayName: string, role: 'teacher' | 'student', password: string) => Promise<{ success: boolean; message?: string }>;
    logout: () => void;
    impersonate: (userToImpersonate: UserSession) => void;
    stopImpersonating: () => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [loggedInUser, setLoggedInUser] = useState<UserSession | null>(null);
    const [impersonatedUser, setImpersonatedUser] = useState<UserSession | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const currentUser = impersonatedUser || loggedInUser;

    useEffect(() => {
        try {
            const loggedInUserJson = sessionStorage.getItem('loggedInUser');
            const impersonatedUserJson = sessionStorage.getItem('impersonatedUser');
            if (loggedInUserJson) {
                setLoggedInUser(JSON.parse(loggedInUserJson));
            }
            if (impersonatedUserJson) {
                setImpersonatedUser(JSON.parse(impersonatedUserJson));
            }
        } catch (error) {
            console.error("Failed to parse user from session storage", error);
            sessionStorage.clear();
        } finally {
            setIsLoading(false);
        }
    }, []);

    const login = async (username: string, password: string): Promise<boolean> => {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            if (response.ok) {
                const userSession = await response.json();
                setLoggedInUser(userSession);
                sessionStorage.setItem('loggedInUser', JSON.stringify(userSession));
                return true;
            }
        } catch (error) {
            console.error("Login API call failed:", error);
        }
        return false;
    };

    const signUp = async (username: string, displayName: string, role: 'teacher' | 'student', password: string): Promise<{ success: boolean; message?: string }> => {
        try {
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, displayName, role, password }),
            });
            const data = await response.json();

            if (response.ok) {
                const { user } = data;
                setLoggedInUser(user);
                sessionStorage.setItem('loggedInUser', JSON.stringify(user));
                return { success: true };
            }
            return { success: false, message: data.message || 'Signup failed' };
        } catch (error) {
            console.error("Signup API call failed:", error);
            return { success: false, message: 'An unexpected error occurred.' };
        }
    };
    
    const logout = () => {
        setLoggedInUser(null);
        setImpersonatedUser(null);
        sessionStorage.removeItem('loggedInUser');
        sessionStorage.removeItem('impersonatedUser');
    };
    
    const impersonate = (userToImpersonate: UserSession) => {
        if (loggedInUser?.role === 'admin') {
            setImpersonatedUser(userToImpersonate);
            sessionStorage.setItem('impersonatedUser', JSON.stringify(userToImpersonate));
        }
    };

    const stopImpersonating = () => {
        setImpersonatedUser(null);
        sessionStorage.removeItem('impersonatedUser');
    };

    const value: SessionContextType = {
        currentUser, 
        loggedInUser,
        impersonatedUser,
        isLoading,
        login, 
        signUp, 
        logout,
        impersonate,
        stopImpersonating,
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