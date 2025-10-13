
import type { User, Problem, Submission, Exam, ExamAttempt } from '@/types';

// Importing the raw JSON data.
import usersData from '@/data/users.json';
import problemsData from '@/data/problems.json';
import submissionsData from '@/data/submissions.json';
import examsData from '@/data/exams.json';
import examAttemptsData from '@/data/examAttempts.json';

// In-memory data store. Changes will be lost on server restart.
const store = {
    users: [...usersData] as User[],
    problems: [...problemsData] as Problem[],
    submissions: [...submissionsData] as Submission[],
    exams: [...examsData] as Exam[],
    examAttempts: [...examAttemptsData] as ExamAttempt[],
};

// A simple data access layer to simulate database operations.
export const db = {
    get all() {
        return store;
    },
    users: {
        find: (predicate: (user: User) => boolean) => store.users.find(predicate),
        some: (predicate: (user: User) => boolean) => store.users.some(predicate),
        create: (data: Omit<User, 'id'>) => {
            const newUser: User = { ...data, id: crypto.randomUUID() };
            store.users.push(newUser);
            return newUser;
        },
        update: (id: string, data: Partial<User>) => {
            const userIndex = store.users.findIndex(u => u.id === id);
            if (userIndex === -1) return null;
            const updatedUser = { ...store.users[userIndex], ...data };
            store.users[userIndex] = updatedUser;
            return updatedUser;
        },
    },
    problems: {
        create: (data: Omit<Problem, 'id' | 'createdAt'>) => {
            const newProblem: Problem = { ...data, id: crypto.randomUUID(), createdAt: Date.now() };
            store.problems.push(newProblem);
            return newProblem;
        },
        update: (id: string, data: Partial<Problem>) => {
             const problemIndex = store.problems.findIndex(p => p.id === id);
            if (problemIndex === -1) return null;
            const updatedProblem = { ...store.problems[problemIndex], ...data };
            store.problems[problemIndex] = updatedProblem;
            return updatedProblem;
        }
    },
    submissions: {
         create: (data: Omit<Submission, 'id' | 'submittedAt'>) => {
            const newSubmission: Submission = { ...data, id: crypto.randomUUID(), submittedAt: Date.now() };
            store.submissions.push(newSubmission);
            return newSubmission;
        },
    },
    exams: {
         create: (data: Omit<Exam, 'id' | 'createdAt'>) => {
            const newExam: Exam = { ...data, id: crypto.randomUUID(), createdAt: Date.now() };
            store.exams.push(newExam);
            return newExam;
        },
        delete: (id: string) => {
            const initialLength = store.exams.length;
            store.exams = store.exams.filter(e => e.id !== id);
            // Also delete associated problems
            store.problems = store.problems.filter(p => p.examId !== id);
            return store.exams.length < initialLength;
        }
    },
    examAttempts: {
        create: (data: Omit<ExamAttempt, 'id' | 'startedAt' | 'fullscreenExits' | 'visibilityStateChanges' | 'submissionIds'>) => {
            const newAttempt: ExamAttempt = { 
                ...data, 
                id: crypto.randomUUID(), 
                startedAt: Date.now(),
                fullscreenExits: [],
                visibilityStateChanges: [],
                submissionIds: [],
            };
            store.examAttempts.push(newAttempt);
            return newAttempt;
        },
        update: (id: string, data: Partial<ExamAttempt>) => {
             const attemptIndex = store.examAttempts.findIndex(a => a.id === id);
            if (attemptIndex === -1) return null;
            const updatedAttempt = { ...store.examAttempts[attemptIndex], ...data };
            store.examAttempts[attemptIndex] = updatedAttempt;
             // Also update submissions if they are part of the update
            if (data.submissionIds && data.submissionIds.length > 0) {
                 const newSubmissions = store.submissions.filter(s => data.submissionIds?.includes(s.id));
                 if(newSubmissions.length > 0) {
                    // This is simplified; a real DB would handle transactions.
                 }
            }
            return updatedAttempt;
        },
    }
};
