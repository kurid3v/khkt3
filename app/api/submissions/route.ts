
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        
        const newSubmission = await db.submissions.create(body);

        return NextResponse.json(newSubmission, { status: 201 });
    } catch (error) {
        console.error('[SUBMISSIONS_POST_API]', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}