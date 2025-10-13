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

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function runProblemSimilarityCheck(problemId: string) {
  try {
    const submissions = db.all.submissions.filter(s => s.problemId === problemId);
    const users = db.all.users;

    if (submissions.length < 2) {
      return { success: true, message: "Không đủ bài nộp để so sánh." };
    }

    const userMap = new Map(users.map(u => [u.id, u.name]));

    for (const subA of submissions) {
      const otherSubmissions = submissions
        .filter(s => s.id !== subA.id)
        .map(s => ({ id: s.id, essay: s.essay, submitterId: s.submitterId }));

      if (otherSubmissions.length === 0) {
        continue;
      }
      
      try {
        const simResult = await checkSimilarityOnServer(
            subA.essay, 
            otherSubmissions.map(s => s.essay)
        );
        
        const mostSimilarSub = otherSubmissions[simResult.mostSimilarEssayIndex];
        
        if (mostSimilarSub) {
          const resultToStore = {
            similarityPercentage: simResult.similarityPercentage,
            explanation: simResult.explanation,
            mostSimilarTo: mostSimilarSub.id,
            mostSimilarToStudentName: userMap.get(mostSimilarSub.submitterId) || 'Không rõ',
          };
          db.submissions.update(subA.id, { similarityCheck: resultToStore });
        } else {
            const defaultResult = {
                similarityPercentage: 0,
                explanation: "Không tìm thấy sự tương đồng đáng kể hoặc có lỗi xảy ra.",
            };
            db.submissions.update(subA.id, { similarityCheck: defaultResult });
        }
      } catch (e) {
          console.error(`Error checking similarity for ${subA.id}`, e);
      }
      
      // Add a delay to stay within API rate limits (e.g., 10 requests/minute for free tier)
      await delay(6000); // 6 seconds
    }

    revalidatePath(`/problems/${problemId}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to run similarity check:", error);
    throw new Error("Không thể chạy kiểm tra tương đồng.");
  }
}