'use server';

import { db } from './db';
import type { User, Problem, Submission, Exam, ExamAttempt } from '@/types';

// We separate data fetching logic into its own file
// These functions are marked with 'use server' and can be called from Server Components.

export async function getUsers() {
    // Exclude passwords when fetching users
    return db.all.users.map(({ password, ...user }) => user);
}

export async function getProblems(): Promise<Problem[]> {
    return db.all.problems;
}

export async function getProblemById(id: string): Promise<Problem | undefined> {
    return db.all.problems.find(p => p.id === id);
}

export async function getSubmissions(): Promise<Submission[]> {
    return db.all.submissions;
}

export async function getExams(): Promise<Exam[]> {
    return db.all.exams;
}
