// @ts-nocheck
'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import type { Problem, Submission, Exam, ExamAttempt, RubricItem } from '@/types';
import { checkSimilarityOnServer } from '@/lib/gemini';

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

export async function runProblemSimilarityCheck(problemId: string) {
  try {
    const submissions = db.all.submissions.filter(s => s.problemId === problemId);
    const users = db.all.users;

    if (submissions.length < 2) {
      // No need to check if there are less than 2 submissions
      return { success: true, message: "Không đủ bài nộp để so sánh." };
    }

    const userMap = new Map(users.map(u => [u.id, u.name]));

    for (const subA of submissions) {
      let bestMatch = {
        similarityPercentage: 0,
        explanation: "Không tìm thấy sự tương đồng đáng kể.",
        mostSimilarTo: undefined as string | undefined,
        mostSimilarToStudentName: undefined as string | undefined,
      };
      let highestSimilarity = -1;

      const otherSubmissions = submissions.filter(s => s.id !== subA.id);

      for (const subB of otherSubmissions) {
        try {
          const simResult = await checkSimilarityOnServer(subA.essay, [subB.essay]);
          if (simResult.similarityPercentage > highestSimilarity) {
            highestSimilarity = simResult.similarityPercentage;
            bestMatch = {
              ...simResult,
              mostSimilarTo: subB.id,
              mostSimilarToStudentName: userMap.get(subB.submitterId) || 'Không rõ',
            };
          }
        } catch (e) {
            console.error(`Error checking similarity between ${subA.id} and ${subB.id}`, e);
        }
      }
      
      db.submissions.update(subA.id, { similarityCheck: bestMatch });
    }

    revalidatePath(`/problems/${problemId}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to run similarity check:", error);
    throw new Error("Không thể chạy kiểm tra tương đồng.");
  }
}