
'use client';

import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import type { User, Problem, Submission, RubricItem, Exam, ExamAttempt } from '@/types';

// The new DataContextType reflects the asynchronous nature of API calls.
interface DataContextType {
    users: User[];
    problems: Problem[];
    submissions: Submission[];
    exams: Exam[];
    examAttempts: ExamAttempt[];
    currentUser: User | null;
    isLoading: boolean; // Indicates initial data load
    login: (name: string, password: string) => Promise<boolean>;
    signUp: (name: string, role: 'teacher' | 'student', password: string) => Promise<{ success: boolean; message?: string }>;
    logout: () => void;
    addProblem: (title: string, prompt: string, rawRubric: string, rubricItems: RubricItem[], customMaxScore: number, isRubricHidden: boolean, examId?: string) => Promise<void>;
    updateProblem: (updatedProblem: Problem) => Promise<void>;
    addSubmission: (submission: Omit<Submission, 'id' | 'submittedAt'>) => Promise<Submission | null>;
    addExam: (title: string, description: string, startTime: number, endTime: number, password?: string) => Promise<void>;
    deleteExam: (examId: string) => Promise<void>;
    startExamAttempt: (examId: string) => Promise<ExamAttempt | null>;
    finishExamAttempt: (finishedAttempt: ExamAttempt, newSubmissions: Submission[]) => Promise<void>;
    updateUserRole: (userId: string, role: 'student' | 'teacher' | 'admin') => Promise<void>;
    recordFullscreenExit: (attemptId: string) => Promise<void>;
    recordVisibilityChange: (attemptId: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [problems, setProblems] = useState<Problem[]>([]);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [exams, setExams] = useState<Exam[]>([]);
    const [examAttempts, setExamAttempts] = useState<ExamAttempt[]>([]);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch all initial data from the backend API
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const response = await fetch('/api/bootstrap');
                if (!response.ok) throw new Error('Failed to fetch initial data');
                const data = await response.json();
                
                setUsers(data.users);
                setProblems(data.problems);
                setSubmissions(data.submissions);
                setExams(data.exams);
                setExamAttempts(data.examAttempts);

                const loggedInUserJson = sessionStorage.getItem('currentUser');
                if (loggedInUserJson) {
                    setCurrentUser(JSON.parse(loggedInUserJson));
                }
            } catch (error) {
                console.error("Error loading initial data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadInitialData();
    }, []);

    // --- Authentication ---
    const login = async (name: string, password: string): Promise<boolean> => {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, password }),
            });
            if (response.ok) {
                const user = await response.json();
                setCurrentUser(user);
                sessionStorage.setItem('currentUser', JSON.stringify(user));
                return true;
            }
            return false;
        } catch (error) {
            console.error("Login failed:", error);
            return false;
        }
    };

    const signUp = async (name: string, role: 'teacher' | 'student', password: string): Promise<{ success: boolean; message?: string }> => {
        try {
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, role, password }),
            });
            const result = await response.json();
            if (response.ok) {
                const newUser = result.user;
                setUsers(prev => [...prev, newUser]);
                setCurrentUser(newUser);
                sessionStorage.setItem('currentUser', JSON.stringify(newUser));
                return { success: true };
            }
            return { success: false, message: result.message };
        } catch (error) {
            console.error("Sign up failed:", error);
            return { success: false, message: 'An unexpected error occurred.' };
        }
    };
    
    const logout = () => {
        setCurrentUser(null);
        sessionStorage.removeItem('currentUser');
    };
    
    // --- Mutations ---
    
    const addProblem = async (title: string, prompt: string, rawRubric: string, rubricItems: RubricItem[], customMaxScore: number, isRubricHidden: boolean, examId?: string) => {
        if (!currentUser) return;
        const response = await fetch('/api/problems', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, prompt, rawRubric, rubricItems, customMaxScore, createdBy: currentUser.id, isRubricHidden, examId }),
        });
        if (response.ok) {
            const newProblem = await response.json();
            setProblems(prev => [...prev, newProblem]);
        }
    };

    const updateProblem = async (updatedProblem: Problem) => {
        const response = await fetch(`/api/problems/${updatedProblem.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedProblem),
        });
        if (response.ok) {
            const problem = await response.json();
            setProblems(prev => prev.map(p => p.id === problem.id ? problem : p));
        }
    };

    const addSubmission = async (submissionData: Omit<Submission, 'id' | 'submittedAt'>): Promise<Submission | null> => {
        const response = await fetch('/api/submissions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(submissionData),
        });
        if (response.ok) {
            const newSubmission = await response.json();
            setSubmissions(prev => [...prev, newSubmission]);
            return newSubmission;
        }
        return null;
    };

    const addExam = async (title: string, description: string, startTime: number, endTime: number, password?: string) => {
        if (!currentUser) return;
        const response = await fetch('/api/exams', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, description, startTime, endTime, password, createdBy: currentUser.id }),
        });
        if (response.ok) {
            const newExam = await response.json();
            setExams(prev => [...prev, newExam]);
        }
    };

    const deleteExam = async (examId: string) => {
        const response = await fetch(`/api/exams/${examId}`, { method: 'DELETE' });
        if (response.ok) {
            setExams(prev => prev.filter(exam => exam.id !== examId));
            setProblems(prev => prev.filter(p => p.examId !== examId));
        }
    };
    
    const startExamAttempt = async (examId: string): Promise<ExamAttempt | null> => {
        if (!currentUser) return null;
        const response = await fetch('/api/exam-attempts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ examId, studentId: currentUser.id }),
        });
        if (response.ok) {
            const newAttempt = await response.json();
            setExamAttempts(prev => [...prev, newAttempt]);
            return newAttempt;
        }
        return null;
    };
    
    const updateExamAttempt = useCallback(async (attemptId: string, updates: Partial<ExamAttempt>) => {
        const response = await fetch(`/api/exam-attempts/${attemptId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
        });
        if(response.ok) {
            const updatedAttempt = await response.json();
            setExamAttempts(prev => prev.map(att => att.id === attemptId ? updatedAttempt : att));
        }
    }, []);

    const finishExamAttempt = async (finishedAttempt: ExamAttempt, newSubmissions: Submission[]) => {
        const updates: Partial<ExamAttempt> = {
            submittedAt: Date.now(),
            submissionIds: newSubmissions.map(s => s.id),
        };
         // Also add new submissions to the main submissions list
        if(newSubmissions.length > 0) {
            setSubmissions(prev => [...prev, ...newSubmissions]);
        }
        await updateExamAttempt(finishedAttempt.id, updates);
    };

    const recordFullscreenExit = useCallback(async (attemptId: string) => {
        setExamAttempts(prev => {
            const attempt = prev.find(att => att.id === attemptId);
            if(attempt) {
                const newExits = [...attempt.fullscreenExits, Date.now()];
                updateExamAttempt(attemptId, { fullscreenExits: newExits });
                return prev.map(att => att.id === attemptId ? {...att, fullscreenExits: newExits} : att);
            }
            return prev;
        });
    }, [updateExamAttempt]);
    
    const recordVisibilityChange = useCallback(async (attemptId: string) => {
        setExamAttempts(prev => {
            const attempt = prev.find(att => att.id === attemptId);
             if(attempt) {
                const newChanges = [...(attempt.visibilityStateChanges || []), { timestamp: Date.now(), state: 'hidden' as const }];
                updateExamAttempt(attemptId, { visibilityStateChanges: newChanges });
                return prev.map(att => att.id === attemptId ? {...att, visibilityStateChanges: newChanges} : att);
            }
            return prev;
        });
    }, [updateExamAttempt]);


    const updateUserRole = async (userId: string, role: 'student' | 'teacher' | 'admin') => {
        const response = await fetch(`/api/users/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role }),
        });
        if(response.ok) {
            setUsers(prev => prev.map(user => user.id === userId ? { ...user, role } : user));
        }
    };

    const value: DataContextType = {
        users, problems, submissions, exams, examAttempts, currentUser, isLoading,
        login, signUp, logout, addProblem, updateProblem, addSubmission, addExam, deleteExam,
        startExamAttempt, finishExamAttempt, updateUserRole,
        recordFullscreenExit, recordVisibilityChange,
    };

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useDataContext = (): DataContextType => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useDataContext must be used within a DataProvider');
    }
    return context;
};
