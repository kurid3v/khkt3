
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PUT(
    req: Request,
    { params }: { params: { problemId: string } }
) {
    try {
        const { problemId } = params;
        const values = await req.json();

        const updatedProblem = await db.problems.update(problemId, values);
        
        if (!updatedProblem) {
            return new NextResponse("Problem not found", { status: 404 });
        }

        return NextResponse.json(updatedProblem);

    } catch (error) {
        console.error('[PROBLEM_ID_PUT_API]', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}