import type { User, Problem, Submission, Exam, ExamAttempt } from '@/types';
import fs from 'fs';
import path from 'path';
// FIX: Import 'process' to ensure the correct Node.js process type is used, resolving the 'cwd' property error.
import process from 'process';

// Define file paths
const dataDir = path.join(process.cwd(), 'data');
const usersPath = path.join(dataDir, 'users.json');
const problemsPath = path.join(dataDir, 'problems.json');
const submissionsPath = path.join(dataDir, 'submissions.json');
const examsPath = path.join(dataDir, 'exams.json');
const examAttemptsPath = path.join(dataDir, 'examAttempts.json');

// Helper to read JSON file safely
const readData = <T>(filePath: string): T[] => {
    try {
        if (fs.existsSync(filePath)) {
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            // Handle empty file case
            return fileContent ? JSON.parse(fileContent) : [];
        }
    } catch (error) {
        console.error(`Error reading data from ${filePath}:`, error);
    }
    return [];
};

// Helper to write JSON file
const writeData = (filePath: string, data: any) => {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
        console.error(`Error writing data to ${filePath}:`, error);
    }
};


// In-memory data store, initialized by reading from files.
const store = {
    users: readData<User>(usersPath),
    problems: readData<Problem>(problemsPath),
    submissions: readData<Submission>(submissionsPath),
    exams: readData<Exam>(examsPath),
    examAttempts: readData<ExamAttempt>(examAttemptsPath),
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
            const newUser: User = { ...data, id: crypto.randomUUID() };
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
            store.exams = store.exams.filter(e => e.id !== id);
            // Also delete associated problems
            store.problems = store.problems.filter(p => p.examId !== id);
            writeData(examsPath, store.exams); // Persist exams
            writeData(problemsPath, store.problems); // Persist problems
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