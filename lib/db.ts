import type { User, Problem, Submission, Exam, ExamAttempt } from '@/types';
import fs from 'fs';
import path from 'path';
import process from 'process';

// Import static data directly instead of reading from file system at runtime
import usersData from '@/data/users.json';
import problemsData from '@/data/problems.json';
import submissionsData from '@/data/submissions.json';
import examsData from '@/data/exams.json';
import examAttemptsData from '@/data/examAttempts.json';

// Define file paths for writing data
const dataDir = path.join(process.cwd(), 'data');
const usersPath = path.join(dataDir, 'users.json');
const problemsPath = path.join(dataDir, 'problems.json');
const submissionsPath = path.join(dataDir, 'submissions.json');
const examsPath = path.join(dataDir, 'exams.json');
const examAttemptsPath = path.join(dataDir, 'examAttempts.json');


// Helper to write JSON file for persistence
const writeData = (filePath: string, data: any) => {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
        console.error(`Error writing data to ${filePath}:`, error);
    }
};


// In-memory data store, initialized by importing JSON files.
const store = {
    users: usersData as User[],
    problems: problemsData as Problem[],
    submissions: submissionsData as Submission[],
    exams: examsData as Exam[],
    examAttempts: examAttemptsData as ExamAttempt[],
};

// Data access layer that now persists changes to JSON files.
export const db = {
    get all() {
        return store;
    },
    users: {
        find: (predicate: (user: User) => boolean) => store.users.find(predicate),
        some: (predicate: (user: User) => boolean) => store.users.some(predicate),
        create: (data: Omit<User, 'id'>) => {
            const newUser: User = { ...data, id: crypto.randomUUID(), avatar: data.avatar || undefined };
            store.users.push(newUser);
            writeData(usersPath, store.users); // Persist
            return newUser;
        },
        update: (id: string, data: Partial<User>) => {
            const userIndex = store.users.findIndex(u => u.id === id);
            if (userIndex === -1) return null;
            const updatedUser = { ...store.users[userIndex], ...data };
            store.users[userIndex] = updatedUser;
            writeData(usersPath, store.users); // Persist
            return updatedUser;
        },
        delete: (id: string) => {
            const userIndex = store.users.findIndex(u => u.id === id);
            if (userIndex === -1) return false;

            const adminUser = store.users.find(u => u.username === 'adminuser');
            if (!adminUser) {
                console.error("Critical error: Admin user not found. Cannot reassign content.");
                return false;
            }
            if (id === adminUser.id) {
                console.error("Cannot delete the primary admin user.");
                return false;
            }
            
            // Reassign created content to admin
            store.problems = store.problems.map(p => p.createdBy === id ? { ...p, createdBy: adminUser.id } : p);
            store.exams = store.exams.map(e => e.createdBy === id ? { ...e, createdBy: adminUser.id } : e);
            
            // Remove user-specific data
            store.submissions = store.submissions.filter(s => s.submitterId !== id);
            store.examAttempts = store.examAttempts.filter(a => a.studentId !== id);

            // Remove user
            store.users.splice(userIndex, 1);

            // Persist all changes
            writeData(usersPath, store.users);
            writeData(problemsPath, store.problems);
            writeData(examsPath, store.exams);
            writeData(submissionsPath, store.submissions);
            writeData(examAttemptsPath, store.examAttempts);

            return true;
        }
    },
    problems: {
        create: (data: Omit<Problem, 'id' | 'createdAt'>) => {
            const newProblem: Problem = { ...data, id: crypto.randomUUID(), createdAt: Date.now() };
            store.problems.push(newProblem);
            writeData(problemsPath, store.problems); // Persist
            return newProblem;
        },
        update: (id: string, data: Partial<Problem>) => {
             const problemIndex = store.problems.findIndex(p => p.id === id);
            if (problemIndex === -1) return null;
            const updatedProblem = { ...store.problems[problemIndex], ...data };
            store.problems[problemIndex] = updatedProblem;
            writeData(problemsPath, store.problems); // Persist
            return updatedProblem;
        },
        delete: (id: string) => {
            const initialProblemsLength = store.problems.length;
            const problemExists = store.problems.some(p => p.id === id);
            if (!problemExists) return false;
            
            store.problems = store.problems.filter(p => p.id !== id);
            store.submissions = store.submissions.filter(s => s.problemId !== id);

            writeData(problemsPath, store.problems);
            writeData(submissionsPath, store.submissions);

            return store.problems.length < initialProblemsLength;
        }
    },
    submissions: {
         create: (data: Omit<Submission, 'id' | 'submittedAt'>) => {
            const newSubmission: Submission = { ...data, id: crypto.randomUUID(), submittedAt: Date.now() };
            store.submissions.push(newSubmission);
            writeData(submissionsPath, store.submissions); // Persist
            return newSubmission;
        },
        update: (id: string, data: Partial<Submission>) => {
            const subIndex = store.submissions.findIndex(s => s.id === id);
            if (subIndex === -1) return null;
            const updatedSubmission = { ...store.submissions[subIndex], ...data };
            store.submissions[subIndex] = updatedSubmission;
            writeData(submissionsPath, store.submissions); // Persist
            return updatedSubmission;
        },
    },
    exams: {
         create: (data: Omit<Exam, 'id' | 'createdAt'>) => {
            const newExam: Exam = { ...data, id: crypto.randomUUID(), createdAt: Date.now() };
            store.exams.push(newExam);
writeData(examsPath, store.exams); // Persist
            return newExam;
        },
        delete: (id: string) => {
            const initialLength = store.exams.length;
            const examExists = store.exams.some(e => e.id === id);
            if (!examExists) return false;
        
            // Find problems associated with the exam
            const problemsToDelete = store.problems.filter(p => p.examId === id);
            const problemIdsToDelete = problemsToDelete.map(p => p.id);
        
            // Delete submissions associated with those problems
            store.submissions = store.submissions.filter(s => !problemIdsToDelete.includes(s.problemId));
        
            // Delete exam attempts for this exam
            store.examAttempts = store.examAttempts.filter(att => att.examId !== id);
        
            // Delete the problems
            store.problems = store.problems.filter(p => p.examId !== id);
        
            // Delete the exam
            store.exams = store.exams.filter(e => e.id !== id);
        
            // Persist all changes
            writeData(examsPath, store.exams);
            writeData(problemsPath, store.problems);
            writeData(submissionsPath, store.submissions);
            writeData(examAttemptsPath, store.examAttempts);
        
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
            writeData(examAttemptsPath, store.examAttempts); // Persist
            return newAttempt;
        },
        update: (id: string, data: Partial<ExamAttempt>) => {
             const attemptIndex = store.examAttempts.findIndex(a => a.id === id);
            if (attemptIndex === -1) return null;
            const updatedAttempt = { ...store.examAttempts[attemptIndex], ...data };
            store.examAttempts[attemptIndex] = updatedAttempt;
            writeData(examAttemptsPath, store.examAttempts); // Persist
            return updatedAttempt;
        },
    }
};