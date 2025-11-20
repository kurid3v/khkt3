
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: Request) {
    try {
        const body = await req.json();
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
          disablePaste,
          classroomIds,
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
                title, createdBy, type, examId, prompt, rawRubric, rubricItems, customMaxScore, isRubricHidden, disablePaste, classroomIds
            };
        } else if (type === 'reading_comprehension') {
            if (!passage || !questions) {
                return new NextResponse('Missing required fields for reading comprehension: passage, questions', { status: 400 });
            }
            problemData = {
                title, createdBy, type, examId, passage, questions, disablePaste, classroomIds,
                // FIX: Added type annotation for accumulator (acc: number) to resolve build error
                customMaxScore: questions.reduce((acc: number, q: any) => acc + (Number(q.maxScore) || 1), 0) || 0,
            };
        } else {
            return new NextResponse('Invalid problem type specified', { status: 400 });
        }

        const newProblem = await db.problems.create(problemData);

        return NextResponse.json(newProblem, { status: 201 });
    } catch (error) {
        console.error('[PROBLEMS_POST_API]', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
