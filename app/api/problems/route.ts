
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        // FIX: The original handler was missing the 'type' field and only handled essay problems.
        // This updated logic handles both 'essay' and 'reading_comprehension' types,
        // ensuring the correct data is saved based on the problem type.
        const {
          title,
          createdBy,
          type,
          examId,
          prompt,
          rawRubric,
          rubricItems,
          customMaxScore,
          isRubricHidden,
          passage,
          questions,
        } = body;
        
        // Basic validation for common fields
        if (!title || !createdBy || !type) {
            return new NextResponse('Missing required fields: title, createdBy, type', { status: 400 });
        }

        let problemData;
        if (type === 'essay') {
            if (!prompt) {
                return new NextResponse('Missing required field for essay: prompt', { status: 400 });
            }
            problemData = {
                title,
                createdBy,
                type,
                examId,
                prompt,
                rawRubric,
                rubricItems,
                customMaxScore,
                isRubricHidden,
            };
        } else if (type === 'reading_comprehension') {
            if (!passage || !questions) {
                return new NextResponse('Missing required fields for reading comprehension: passage, questions', { status: 400 });
            }
            problemData = {
                title,
                createdBy,
                type,
                examId,
                passage,
                questions,
                customMaxScore: questions.length || 0,
            };
        } else {
            return new NextResponse('Invalid problem type specified', { status: 400 });
        }

        const newProblem = db.problems.create(problemData);

        return NextResponse.json(newProblem, { status: 201 });
    } catch (error) {
        console.error('[PROBLEMS_POST_API]', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}