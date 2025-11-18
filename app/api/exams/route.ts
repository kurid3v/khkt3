
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { title, description, startTime, endTime, password, createdBy, classroomIds } = body;

        if (!title || !startTime || !endTime || !createdBy) {
            return new NextResponse('Missing required fields', { status: 400 });
        }

        const newExam = await db.exams.create({
            title,
            description,
            startTime,
            endTime,
            password,
            createdBy,
            classroomIds,
        });

        return NextResponse.json(newExam, { status: 201 });
    } catch (error) {
        console.error('[EXAMS_POST_API]', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}