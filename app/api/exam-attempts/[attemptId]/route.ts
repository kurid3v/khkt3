
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PUT(
    req: Request,
    { params }: { params: { attemptId: string } }
) {
    try {
        const { attemptId } = params;
        const values = await req.json();

        // When finishing, we also need to add the submissions to the database
        if (values.newSubmissions && Array.isArray(values.newSubmissions)) {
            values.newSubmissions.forEach((sub: any) => {
                db.submissions.create(sub);
            });
            // Don't store the full submission objects in the attempt record itself
            delete values.newSubmissions;
        }

        const updatedAttempt = db.examAttempts.update(attemptId, values);
        
        if (!updatedAttempt) {
            return new NextResponse("Attempt not found", { status: 404 });
        }

        return NextResponse.json(updatedAttempt);

    } catch (error) {
        console.error('[ATTEMPT_ID_PUT_API]', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
