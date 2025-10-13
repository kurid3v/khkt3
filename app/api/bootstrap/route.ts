
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const data = db.all;
    // We don't send passwords to the client
    const usersWithoutPasswords = data.users.map(({ password, ...user }) => user);
    
    return NextResponse.json({
      ...data,
      users: usersWithoutPasswords,
    });
  } catch (error) {
    console.error('[BOOTSTRAP_API]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
