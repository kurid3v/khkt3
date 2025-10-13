'use server';

// This file is deprecated.
// Server-side session simulation was causing inconsistencies with client-side authentication.
// Authentication is now handled entirely through client-side context ('@/context/SessionContext')
// which communicates with the backend API for auth operations.
// The `getCurrentUser` function has been removed to prevent its use in Server Components.
