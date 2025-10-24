
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { 
    gradeEssayOnServer, 
    parseRubricOnServer, 
    gradeReadingComprehensionOnServer, 
    imageToTextOnServer,
    checkSimilarityOnServer 
} from '@/lib/gemini';
import type { Submission } from '@/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, payload } = body;

    if (action === 'grade') {
      const { problemId, prompt, essay, rubric, rawRubric, customMaxScore } = payload;
      
      const existingSubmissions = db.all.submissions.filter(s => s.problemId === problemId && s.essay);
      const existingEssays = existingSubmissions.map(s => s.essay).filter(Boolean) as string[];

      // Find the best submission to use as a few-shot example.
      // This assumes that the highest-scored submission is a good example,
      // likely one that has been reviewed or corrected by a teacher.
      let bestExample: Submission | null = null;
      if (existingSubmissions.length > 0) {
          bestExample = existingSubmissions.reduce((prev, current) => 
              (prev.feedback.totalScore > current.feedback.totalScore) ? prev : current
          );
      }

      const examplePayload = bestExample ? { essay: bestExample.essay!, feedback: bestExample.feedback } : undefined;

      // Run grading and similarity check in parallel for efficiency
      const [feedback, similarityCheck] = await Promise.all([
        gradeEssayOnServer(prompt, essay, rubric, rawRubric, customMaxScore, examplePayload),
        checkSimilarityOnServer(essay, existingEssays)
      ]);
      
      return NextResponse.json({ feedback, similarityCheck });
    }
    
    if (action === 'grade_reading_comprehension') {
        const { problem, answers } = payload;
        const feedback = await gradeReadingComprehensionOnServer(problem, answers);
        return NextResponse.json(feedback);
    }

    if (action === 'parseRubric') {
      const { rawRubricText } = payload;
      const parsedRubric = await parseRubricOnServer(rawRubricText);
      return NextResponse.json(parsedRubric);
    }

    if (action === 'image_to_text') {
        const { base64Image } = payload;
        const text = await imageToTextOnServer(base64Image);
        return NextResponse.json(text);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error("Error in Gemini API route:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: "Failed to process AI request.", details: errorMessage }, { status: 500 });
  }
}
