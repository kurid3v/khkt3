'use client';

import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import type { User, Problem, Submission, RubricItem, Exam, ExamAttempt } from '@/types';
import { getUsers, saveUsers, getProblems, saveProblems, getSubmissions, saveSubmissions, getExams, saveExams, getExamAttempts, saveExamAttempts } from '@/data/storage';

interface DataContextType {
    users: User[];
    problems: Problem[];
    submissions: Submission[];
    exams: Exam[];
    examAttempts: ExamAttempt[];
    currentUser: User | null;
    isLoading: boolean;
    login: (name: string, password: string) => boolean;
    signUp: (name: string, role: 'teacher' | 'student', password: string) => { success: boolean; message?: string };
    logout: () => void;
    addProblem: (title: string, prompt: string, rawRubric: string, rubricItems: RubricItem[], customMaxScore: number, isRubricHidden: boolean, examId?: string) => void;
    updateProblem: (updatedProblem: Problem) => void;
    addSubmission: (submission: Submission) => void;
    addExam: (title: string, description: string, startTime: number, endTime: number, password?: string) => void;
    deleteExam: (examId: string) => void;
    startExamAttempt: (examId: string) => ExamAttempt | null;
    updateExamAttempt: (updatedAttempt: ExamAttempt) => void;
    finishExamAttempt: (finishedAttempt: ExamAttempt, newSubmissions: Submission[]) => void;
    updateUserRole: (userId: string, role: 'student' | 'teacher' | 'admin') => void;
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

    useEffect(() => {
        setUsers(getUsers());
        setProblems(getProblems());
        setSubmissions(getSubmissions());
        setExams(getExams());
        setExamAttempts(getExamAttempts());
        
        const loggedInUser = sessionStorage.getItem('currentUser');
        if (loggedInUser) {
            setCurrentUser(JSON.parse(loggedInUser));
        }
        setIsLoading(false);
    }, []);

    const login = (name: string, password: string): boolean => {
        const user = users.find(u => u.name.trim().toLowerCase() === name.trim().toLowerCase());
        if (user && user.password === password) {
            setCurrentUser(user);
            sessionStorage.setItem('currentUser', JSON.stringify(user));
            return true;
        }
        return false;
    };

    const signUp = (name: string, role: 'teacher' | 'student', password: string): { success: boolean; message?: string } => {
        const trimmedName = name.trim();
        if (users.some(u => u.name.toLowerCase() === trimmedName.toLowerCase())) {
            return { success: false, message: 'Tên người dùng này đã tồn tại.' };
        }
        
        const newUser: User = { id: crypto.randomUUID(), name: trimmedName, role, password };
        setUsers(prevUsers => {
            const updatedUsers = [...prevUsers, newUser];
            saveUsers(updatedUsers);
            return updatedUsers;
        });
        setCurrentUser(newUser);
        sessionStorage.setItem('currentUser', JSON.stringify(newUser));
        return { success: true };
    };
    
    const logout = () => {
        setCurrentUser(null);
        sessionStorage.removeItem('currentUser');
    };

    const addProblem = (title: string, prompt: string, rawRubric: string, rubricItems: RubricItem[], customMaxScore: number, isRubricHidden: boolean, examId?: string) => {
        if (!currentUser || currentUser.role === 'student') return;
        const newProblem: Problem = {
            id: crypto.randomUUID(), title, prompt, rawRubric, rubricItems, customMaxScore, createdBy: currentUser.id, createdAt: Date.now(), isRubricHidden, examId,
        };
        setProblems(prevProblems => {
            const updatedProblems = [...prevProblems, newProblem];
            saveProblems(updatedProblems);
            return updatedProblems;
        });
    };

    const updateProblem = (updatedProblem: Problem) => {
        setProblems(prevProblems => {
            const updatedProblems = prevProblems.map(p => p.id === updatedProblem.id ? updatedProblem : p);
            saveProblems(updatedProblems);
            return updatedProblems;
        });
    };

    const addSubmission = (submission: Submission) => {
        setSubmissions(prevSubmissions => {
            const updatedSubmissions = [...prevSubmissions, submission];
            saveSubmissions(updatedSubmissions);
            return updatedSubmissions;
        });
    };

    const addExam = (title: string, description: string, startTime: number, endTime: number, password?: string) => {
        if (!currentUser || currentUser.role === 'student') return;
        const newExam: Exam = {
            id: crypto.randomUUID(), title, description, startTime, endTime, password, createdBy: currentUser.id, createdAt: Date.now(),
        };
        setExams(prevExams => {
            const updatedExams = [...prevExams, newExam];
            saveExams(updatedExams);
            return updatedExams;
        });
    };

    const deleteExam = (examId: string) => {
        if (!currentUser || (currentUser.role !== 'teacher' && currentUser.role !== 'admin')) return;
        setExams(prevExams => {
            const updatedExams = prevExams.filter(exam => exam.id !== examId);
            saveExams(updatedExams);
            return updatedExams;
        });
        setProblems(prevProblems => {
            const updatedProblems = prevProblems.filter(problem => problem.examId !== examId);
            saveProblems(updatedProblems);
            return updatedProblems;
        });
    };
    
    const startExamAttempt = (examId: string): ExamAttempt | null => {
        if (!currentUser) return null;
        const newAttempt: ExamAttempt = {
            id: crypto.randomUUID(),
            examId: examId,
            studentId: currentUser.id,
            startedAt: Date.now(),
            fullscreenExits: [],
            visibilityStateChanges: [], // Initialize new field
            submissionIds: [],
        };
        setExamAttempts(prevAttempts => {
            const updatedAttempts = [...prevAttempts, newAttempt];
            saveExamAttempts(updatedAttempts);
            return updatedAttempts;
        });
        return newAttempt;
    };

    const updateExamAttempt = (updatedAttempt: ExamAttempt) => {
        setExamAttempts(prevAttempts => {
            const updatedAttempts = prevAttempts.map(att => att.id === updatedAttempt.id ? updatedAttempt : att);
            saveExamAttempts(updatedAttempts);
            return updatedAttempts;
        });
    };

    const finishExamAttempt = (finishedAttempt: ExamAttempt, newSubmissions: Submission[]) => {
        const finalAttempt: ExamAttempt = { ...finishedAttempt, submittedAt: Date.now(), submissionIds: newSubmissions.map(s => s.id) };
        setExamAttempts(prevAttempts => {
            const updatedAttempts = prevAttempts.map(att => att.id === finalAttempt.id ? finalAttempt : att);
            saveExamAttempts(updatedAttempts);
            return updatedAttempts;
        });
        setSubmissions(prevSubmissions => {
            const updatedSubmissions = [...prevSubmissions, ...newSubmissions];
            saveSubmissions(updatedSubmissions);
            return updatedSubmissions;
        });
    };

    const updateUserRole = (userId: string, role: 'student' | 'teacher' | 'admin') => {
        setUsers(prevUsers => {
            const updatedUsers = prevUsers.map(user => user.id === userId ? { ...user, role } : user);
            saveUsers(updatedUsers);
            return updatedUsers;
        });
    };

    const value: DataContextType = {
        users, problems, submissions, exams, examAttempts, currentUser, isLoading,
        login, signUp, logout, addProblem, updateProblem, addSubmission, addExam, deleteExam,
        startExamAttempt, updateExamAttempt, finishExamAttempt, updateUserRole,
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