
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function DELETE(
    req: Request,
    { params }: { params: { examId: string } }
) {
    try {
        const { examId } = params;
        const success = await db.exams.delete(examId);
        
        if (!success) {
            return new NextResponse("Exam not found", { status: 404 });
        }

        return new NextResponse(null, { status: 204 });

    } catch (error) {
        console.error('[EXAM_ID_DELETE_API]', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}