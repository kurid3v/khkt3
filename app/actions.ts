// @ts-nocheck
'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import type { Problem, Submission, Exam, ExamAttempt, RubricItem } from '@/types';

// --- Problems ---
export async function createProblem(data: {
  title: string;
  prompt: string;
  rawRubric?: string;
  rubricItems?: RubricItem[];
  customMaxScore?: number;
  isRubricHidden?: boolean;
  createdBy: string;
  examId?: string;
}) {
  try {
    db.problems.create(data);
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
