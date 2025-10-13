
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { title, prompt, rawRubric, rubricItems, customMaxScore, createdBy, isRubricHidden, examId } = body;
        
        // Basic validation
        if (!title || !prompt || !createdBy) {
            return new NextResponse('Missing required fields', { status: 400 });
        }

        const newProblem = db.problems.create({
            title,
            prompt,
            rawRubric,
            rubricItems,
            customMaxScore,
            createdBy,
            isRubricHidden,
            examId,
        });

        return NextResponse.json(newProblem, { status: 201 });
    } catch (error) {
        console.error('[PROBLEMS_POST_API]', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
