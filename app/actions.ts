

// @ts-nocheck
'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import type { Problem, Submission, Exam, ExamAttempt, RubricItem, Question, User, Classroom } from '@/types';

// --- Users ---
export async function updateUser(userId: string, formData: FormData) {
    try {
        const displayName = formData.get('displayName') as string;
        const role = formData.get('role') as User['role'];
        const username = formData.get('username') as string;
        const password = formData.get('password') as string;
        const confirmPassword = formData.get('confirmPassword') as string;
        const avatar = formData.get('avatar') as string; // base64 string

        const updateData: Partial<User> = {};
        if (displayName) updateData.displayName = displayName;
        if (role) updateData.role = role;
        if (username) updateData.username = username;
        // Only update avatar if a new one was provided
        if (avatar && avatar.startsWith('data:image')) {
            updateData.avatar = avatar;
        }

        if (password) {
            if (password !== confirmPassword) {
                throw new Error("Mật khẩu không khớp.");
            }
            if (password.length < 6) {
                throw new Error("Mật khẩu phải có ít nhất 6 ký tự.");
            }
            updateData.password = password;
        }

        db.users.update(userId, updateData);

        revalidatePath('/admin');
        revalidatePath('/profile');
        revalidatePath(`/admin/users/${userId}/edit`);

    } catch (error) {
        console.error("Failed to update user:", error);
        throw new Error(error.message || "Không thể cập nhật người dùng.");
    }
}

export async function deleteUser(userId: string) {
    try {
        db.users.delete(userId);
        revalidatePath('/admin');
    } catch (error) {
        console.error("Failed to delete user:", error);
        throw new Error("Không thể xóa người dùng.");
    }
}


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
  classroomIds?: string[];
  disablePaste?: boolean;
}) {
  try {
    const existingProblem = db.all.problems.find(p => p.title.trim().toLowerCase() === data.title.trim().toLowerCase() && !p.examId);
    if (existingProblem) {
      throw new Error("Tên bài tập đã tồn tại. Vui lòng chọn một tên khác.");
    }

    // Ensure only relevant data for the type is passed
    const problemData = {
        title: data.title,
        createdBy: data.createdBy,
        type: data.type,
        examId: data.examId,
        classroomIds: data.classroomIds,
        disablePaste: data.disablePaste,
        ...(data.type === 'essay' ? {
            prompt: data.prompt,
            rawRubric: data.rawRubric,
            rubricItems: data.rubricItems,
            customMaxScore: data.customMaxScore,
            isRubricHidden: data.isRubricHidden,
        } : {
            passage: data.passage,
            questions: data.questions,
            // Reading comprehension score is calculated from questions
            customMaxScore: data.questions?.reduce((acc, q) => acc + (q.maxScore || 1), 0) || 0,
        })
    };

    db.problems.create(problemData);
    revalidatePath('/dashboard');
    if (data.examId) {
      revalidatePath(`/exams/${data.examId}`);
    }
  } catch (error) {
    console.error("Failed to create problem:", error);
    // Rethrow specific error for duplicate title
    if (error.message.includes("Tên bài tập đã tồn tại")) {
        throw error;
    }
    throw new Error("Không thể tạo bài tập.");
  }
}

export async function deleteProblem(problemId: string) {
  try {
    db.problems.delete(problemId);
    revalidatePath('/dashboard');
    revalidatePath('/admin');
    revalidatePath('/submissions/all');
    revalidatePath(`/problems/${problemId}`);
  } catch (error) {
    console.error("Failed to delete problem:", error);
    throw new Error("Không thể xóa bài tập.");
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
    revalidatePath('/admin');
    revalidatePath('/dashboard');
    revalidatePath('/submissions/all');
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

// --- Classrooms ---
export async function createClassroom(name: string, teacherId: string) {
    if (!name.trim()) throw new Error("Tên lớp không được để trống.");
    db.classrooms.create({ name, teacherId });
    revalidatePath('/classrooms');
}

export async function deleteClassroom(classroomId: string) {
    db.classrooms.delete(classroomId);
    revalidatePath('/classrooms');
}

export async function joinClassroom(joinCode: string, studentId: string) {
    const code = joinCode.trim().toUpperCase();
    if (!code) throw new Error("Mã tham gia không hợp lệ.");

    const classroom = db.classrooms.find(c => c.joinCode === code);
    if (!classroom) throw new Error("Không tìm thấy lớp học với mã này.");

    if (classroom.studentIds.includes(studentId)) {
        throw new Error("Bạn đã ở trong lớp học này.");
    }

    const updatedStudentIds = [...classroom.studentIds, studentId];
    db.classrooms.update(classroom.id, { studentIds: updatedStudentIds });
    revalidatePath('/classrooms');
}

export async function leaveClassroom(classroomId: string, studentId: string) {
    const classroom = db.classrooms.find(c => c.id === classroomId);
    if (!classroom) throw new Error("Không tìm thấy lớp học.");

    const updatedStudentIds = classroom.studentIds.filter(id => id !== studentId);
    db.classrooms.update(classroom.id, { studentIds: updatedStudentIds });
    revalidatePath('/classrooms');
}

export async function removeStudentFromClass(classroomId: string, studentId: string) {
    const classroom = db.classrooms.find(c => c.id === classroomId);
    if (!classroom) throw new Error("Không tìm thấy lớp học.");

    const updatedStudentIds = classroom.studentIds.filter(id => id !== studentId);
    db.classrooms.update(classroom.id, { studentIds: updatedStudentIds });
    revalidatePath(`/classrooms`);
    revalidatePath(`/classrooms/${classroomId}`);
}