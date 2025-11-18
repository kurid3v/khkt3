
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { examId, studentId } = body;

        if (!examId || !studentId) {
             return new NextResponse('Missing required fields', { status: 400 });
        }

        const newAttempt = await db.examAttempts.create({ examId, studentId });

        return NextResponse.json(newAttempt, { status: 201 });
    } catch (error) {
        console.error('[EXAM_ATTEMPTS_POST_API]', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}