
import type { Feedback, RubricItem, Problem, Answer } from '@/types';

async function callApi<T>(action: string, payload: unknown): Promise<T> {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, payload }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("API call failed with status:", response.status, "body:", errorBody);
    throw new Error(`AI service failed with status ${response.status}`);
  }

  return response.json();
}

export async function gradeEssay(prompt: string, essay: string, rubric: RubricItem[], rawRubric: string, customMaxScore: string): Promise<Feedback> {
  try {
    return await callApi<Feedback>('grade', { prompt, essay, rubric, rawRubric, customMaxScore });
  } catch (error) {
    console.error("Error in gradeEssay service:", error);
    throw new Error("Failed to get a valid response from the AI model.");
  }
}

export async function gradeReadingComprehension(problem: Problem, answers: Answer[]): Promise<Feedback> {
  try {
    return await callApi<Feedback>('grade_reading_comprehension', { problem, answers });
  } catch (error) {
    console.error("Error in gradeReadingComprehension service:", error);
    throw new Error("Failed to get a valid response from the AI model.");
  }
}

export async function parseRubric(rawRubricText: string): Promise<Omit<RubricItem, 'id'>[]> {
  try {
    return await callApi<Omit<RubricItem, 'id'>[]>('parseRubric', { rawRubricText });
  } catch (error)
{
    console.error("Error in parseRubric service:", error);
    throw new Error("Failed to parse rubric using the AI model.");
  }
}

export async function getTextFromImage(base64Image: string): Promise<string> {
  try {
    // The API route will return a JSON-encoded string, which callApi will parse.
    return await callApi<string>('image_to_text', { base64Image });
  } catch (error) {
    console.error("Error in getTextFromImage service:", error);
    throw new Error("Failed to extract text using the AI model.");
  }
}
