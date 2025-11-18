
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const data = {
        users: await db.all.users,
        problems: await db.all.problems,
        submissions: await db.all.submissions,
        exams: await db.all.exams,
        examAttempts: await db.all.examAttempts,
        classrooms: await db.all.classrooms,
    };
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