'use client';

import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import type { User, Problem, Submission, Exam, ExamAttempt } from '@/types';
import { useSession } from './SessionContext';

// This context replaces the old in-memory state management with a client-side cache
// that fetches data from the API and provides mutation functions.

interface DataContextType {
    users: Omit<User, 'password'>[];
    problems: Problem[];
    submissions: Submission[];
    exams: Exam[];
    examAttempts: ExamAttempt[];
    isLoading: boolean;
    // Mutation functions
    addSubmission: (submissionData: Omit<Submission, 'id' | 'submittedAt'>) => Promise<Submission | undefined>;
    addExam: (title: string, description: string, startTime: number, endTime: number, password?: string) => Promise<void>;
    updateUserRole: (userId: string, role: 'teacher' | 'student' | 'admin') => Promise<void>;
    updateProblem: (problem: Problem) => Promise<void>;
    startExamAttempt: (examId: string) => Promise<ExamAttempt | undefined>;
    recordFullscreenExit: (attemptId: string) => Promise<void>;
    recordVisibilityChange: (attemptId: string) => Promise<void>;
    finishExamAttempt: (attempt: ExamAttempt, submissions: Submission[]) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { currentUser } = useSession();
    const [users, setUsers] = useState<Omit<User, 'password'>[]>([]);
    const [problems, setProblems] = useState<Problem[]>([]);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [exams, setExams] = useState<Exam[]>([]);
    const [examAttempts, setExamAttempts] = useState<ExamAttempt[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/bootstrap');
            const data = await res.json();
            setUsers(data.users);
            setProblems(data.problems);
            setSubmissions(data.submissions);
            setExams(data.exams);
            setExamAttempts(data.examAttempts);
        } catch (e) {
            console.error("Failed to bootstrap data", e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    // MUTATION FUNCTIONS
    
    const addSubmission = async (submissionData: Omit<Submission, 'id' | 'submittedAt'>): Promise<Submission | undefined> => {
        const res = await fetch('/api/submissions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(submissionData)
        });
        if (res.ok) {
            const newSubmission = await res.json();
            setSubmissions(prev => [...prev, newSubmission]);
            return newSubmission;
        }
    };

    const addExam = async (title: string, description: string, startTime: number, endTime: number, password?: string) => {
        if (!currentUser) return;
        const res = await fetch('/api/exams', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, description, startTime, endTime, password, createdBy: currentUser.id })
        });
        if(res.ok) {
            const newExam = await res.json();
            setExams(prev => [...prev, newExam]);
        }
    };

    const updateUserRole = async (userId: string, role: 'teacher' | 'student' | 'admin') => {
        const res = await fetch(`/api/users/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role })
        });
        if (res.ok) {
            const updatedUser = await res.json();
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: updatedUser.role } : u));
        }
    };

    const updateProblem = async (problem: Problem) => {
        const res = await fetch(`/api/problems/${problem.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(problem)
        });
        if (res.ok) {
            const updatedProblem = await res.json();
            setProblems(prev => prev.map(p => p.id === problem.id ? updatedProblem : p));
        }
    };

    const startExamAttempt = async (examId: string): Promise<ExamAttempt | undefined> => {
        if (!currentUser) return;
        const res = await fetch('/api/exam-attempts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ examId, studentId: currentUser.id })
        });
        if (res.ok) {
            const newAttempt = await res.json();
            setExamAttempts(prev => [...prev, newAttempt]);
            return newAttempt;
        }
    };

    const updateAttempt = async (attemptId: string, data: Partial<ExamAttempt> & { newSubmissions?: Submission[] }): Promise<void> => {
        const res = await fetch(`/api/exam-attempts/${attemptId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            const updatedAttempt = await res.json();
            setExamAttempts(prev => prev.map(a => a.id === attemptId ? updatedAttempt : a));
        }
    }
    
    const recordFullscreenExit = async (attemptId: string) => {
        const attempt = examAttempts.find(a => a.id === attemptId);
        if (!attempt) return;
        const updatedExits = [...attempt.fullscreenExits, Date.now()];
        await updateAttempt(attemptId, { fullscreenExits: updatedExits });
    };

    const recordVisibilityChange = async (attemptId: string) => {
        const attempt = examAttempts.find(a => a.id === attemptId);
        if (!attempt) return;
        const updatedChanges = [...(attempt.visibilityStateChanges || []), { timestamp: Date.now(), state: 'hidden' as const }];
        await updateAttempt(attemptId, { visibilityStateChanges: updatedChanges });
    };
    
    const finishExamAttempt = async (attempt: ExamAttempt, newSubmissions: Submission[]) => {
        setSubmissions(prev => [...prev, ...newSubmissions]);
        await updateAttempt(attempt.id, {
            submittedAt: Date.now(),
            submissionIds: newSubmissions.map(s => s.id),
            newSubmissions: newSubmissions, // Pass to API to create them
        });
    };
    
    const value: DataContextType = {
        users, problems, submissions, exams, examAttempts, isLoading,
        addSubmission, addExam, updateUserRole, updateProblem, startExamAttempt,
        recordFullscreenExit, recordVisibilityChange, finishExamAttempt
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
