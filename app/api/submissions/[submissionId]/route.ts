
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PUT(
    req: Request,
    { params }: { params: { submissionId: string } }
) {
    try {
        const { submissionId } = params;
        const values = await req.json();

        const updatedSubmission = await db.submissions.update(submissionId, values);
        
        if (!updatedSubmission) {
            return new NextResponse("Submission not found", { status: 404 });
        }

        return NextResponse.json(updatedSubmission);

    } catch (error) {
        console.error('[SUBMISSION_ID_PUT_API]', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}