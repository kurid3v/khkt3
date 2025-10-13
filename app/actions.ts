// @ts-nocheck
'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import type { Problem, Submission, Exam, ExamAttempt, RubricItem, User } from '@/types';

// --- Problems ---
export async function createProblem(data: {
  title: string;
  prompt: string;
  rawRubric: string;
  rubricItems: RubricItem[];
  customMaxScore: number;
  isRubricHidden: boolean;
  createdBy: string;
  examId?: string;
}) {
  db.problems.create(data);
  revalidatePath('/dashboard');
  revalidatePath('/admin');
  if (data.examId) {
    revalidatePath(`/exams/${data.examId}`);
  }
}

// --- Exams ---
export async function removeExam(examId: string) {
  db.exams.delete(examId);
  revalidatePath('/exams');
  revalidatePath('/admin');
}