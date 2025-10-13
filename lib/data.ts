'use server';

import { db } from './db';

// We separate data fetching logic into its own file
// These functions are marked with 'use server' and can be called from Server Components.

export async function getUsers() {
    // Exclude passwords when fetching users
    return db.all.users.map(({ password, ...user }) => user);
}

export async function getProblems() {
    return db.all.problems;
}

export async function getExams() {
    return db.all.exams;
}
