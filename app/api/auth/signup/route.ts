
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { User } from '@/types';

export async function POST(req: Request) {
  try {
    const { name, role, password } = await req.json();
    const trimmedName = name?.trim();

    if (!trimmedName || !role || !password) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }
    
    const existingUser = db.users.some(u => u.name.toLowerCase() === trimmedName.toLowerCase());
    if (existingUser) {
        return NextResponse.json({ message: 'Tên người dùng này đã tồn tại.' }, { status: 409 });
    }

    const newUser = db.users.create({ name: trimmedName, role, password });
    const { password: _, ...userWithoutPassword } = newUser;

    return NextResponse.json({ user: userWithoutPassword }, { status: 201 });

  } catch (error) {
    console.error('[SIGNUP_API]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
