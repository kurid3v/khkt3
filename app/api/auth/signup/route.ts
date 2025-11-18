
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { User } from '@/types';

export async function POST(req: Request) {
  try {
    const { username, displayName, role, password, avatar } = await req.json();
    const trimmedUsername = username?.trim();
    const trimmedDisplayName = displayName?.trim();

    if (!trimmedUsername || !trimmedDisplayName || !role || !password) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }
    
    const existingUser = await db.users.some(u => u.username.toLowerCase() === trimmedUsername.toLowerCase());
    if (existingUser) {
        return NextResponse.json({ message: 'Tên đăng nhập này đã tồn tại.' }, { status: 409 });
    }

    const newUser = await db.users.create({ username: trimmedUsername, displayName: trimmedDisplayName, role, password, avatar });
    const { password: _, ...userWithoutPassword } = newUser;

    return NextResponse.json({ user: userWithoutPassword }, { status: 201 });

  } catch (error) {
    console.error('[SIGNUP_API]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}