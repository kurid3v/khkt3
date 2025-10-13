// @ts-nocheck
'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import type { Problem, Submission, Exam, ExamAttempt, RubricItem, Question } from '@/types';

// --- Problems ---
export async function createProblem(data: {
  title: string;
  createdBy: string;
  type: 'essay' | 'reading_comprehension';
  // essay fields
  prompt?: string;
  rawRubric?: string;
  rubricItems?: RubricItem[];
  customMaxScore?: number;
  isRubricHidden?: boolean;
  // reading comprehension fields
  passage?: string;
  questions?: Question[];
  // common fields
  examId?: string;
}) {
  try {
    // Ensure only relevant data for the type is passed
    const problemData = {
        title: data.title,
        createdBy: data.createdBy,
        type: data.type,
        examId: data.examId,
        ...(data.type === 'essay' ? {
            prompt: data.prompt,
            rawRubric: data.rawRubric,
            rubricItems: data.rubricItems,
            customMaxScore: data.customMaxScore,
            isRubricHidden: data.isRubricHidden,
        } : {
            passage: data.passage,
            questions: data.questions,
            // Reading comprehension score is based on number of questions
            customMaxScore: data.questions?.length || 0,
        })
    };

    db.problems.create(problemData);
    revalidatePath('/dashboard');
    if (data.examId) {
      revalidatePath(`/exams/${data.examId}`);
    }
  } catch (error) {
    console.error("Failed to create problem:", error);
    throw new Error("Không thể tạo bài tập.");
  }
}


// --- Exams ---
export async function createExam(data: {
  title: string;
  description: string;
  startTime: number;
  endTime: number;
  password?: string;
  createdBy: string;
}) {
    try {
        const newExam = db.exams.create(data);
        revalidatePath('/exams');
        return newExam;
    } catch (error) {
        console.error("Failed to create exam:", error);
        throw new Error("Không thể tạo đề thi.");
    }
}

export async function removeExam(examId: string) {
  try {
    db.exams.delete(examId);
    revalidatePath('/exams');
  } catch (error) {
    console.error("Failed to remove exam:", error);
    throw new Error("Không thể xóa đề thi.");
  }
}

// --- Submissions ---
export async function addSubmission(submissionData: Omit<Submission, 'id' | 'submittedAt'>) {
    try {
        const newSubmission = db.submissions.create(submissionData);
        revalidatePath(`/problems/${submissionData.problemId}`);
        if(submissionData.examId) {
            revalidatePath(`/exams/${submissionData.examId}`);
        }
        return newSubmission;
    } catch (error) {
        console.error("Failed to add submission:", error);
        throw new Error("Không thể nộp bài.");
    }
}