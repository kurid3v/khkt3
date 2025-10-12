import type { Feedback, RubricItem } from '@/types';

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

export async function parseRubric(rawRubricText: string): Promise<Omit<RubricItem, 'id'>[]> {
  try {
    return await callApi<Omit<RubricItem, 'id'>[]>('parseRubric', { rawRubricText });
  } catch (error) {
    console.error("Error in parseRubric service:", error);
    throw new Error("Failed to parse rubric using the AI model.");
  }
}
