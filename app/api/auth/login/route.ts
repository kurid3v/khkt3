
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { User } from '@/types';

export async function POST(req: Request) {
  try {
    const { name, password } = await req.json();
    if (!name || !password) {
      return new NextResponse('Missing name or password', { status: 400 });
    }

    const user = db.users.find(u => u.name.trim().toLowerCase() === name.trim().toLowerCase());

    if (user && user.password === password) {
      // In a real app, you'd generate a JWT here.
      // For this simulation, we return the user object without the password.
      const { password: _, ...userWithoutPassword } = user;
      return NextResponse.json(userWithoutPassword);
    }

    return new NextResponse('Invalid credentials', { status: 401 });
  } catch (error) {
    console.error('[LOGIN_API]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
