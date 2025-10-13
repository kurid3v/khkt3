'use server';

import { db } from './db';
import type { User } from '@/types';

// This is a simplified simulation of server-side session management.
// In a real app, this would involve verifying a JWT or session cookie.
// For this project, we'll simulate it by having a "default" logged-in user if no specific session is found.
type UserSession = Omit<User, 'password'>;

// HACK: In a real app, you'd get this from a secure session cookie.
// Since the client-side uses sessionStorage, there's no easy way for the server to know the user.
// We'll hardcode a default user for server components to function.
// This simulates what would happen if a valid session was found.
export async function getCurrentUser(): Promise<UserSession | null> {
    const user = db.all.users.find(u => u.name === "Học sinh An"); // Default user for demonstration
    if (!user) return null;
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
}
