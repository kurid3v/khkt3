import type { User, Problem, Submission, Exam, ExamAttempt } from '@/types';

const USERS_KEY = 'ai_classroom_users';
const PROBLEMS_KEY = 'ai_classroom_problems';
const SUBMISSIONS_KEY = 'ai_classroom_submissions';
const EXAMS_KEY = 'ai_classroom_exams';
const EXAM_ATTEMPTS_KEY = 'ai_classroom_exam_attempts';


// --- Mock Data ---
const getMockUsers = (): User[] => [
  { id: 'user_admin_1', name: 'Admin User', role: 'admin', password: 'admin' },
  { id: 'user_teacher_1', name: 'Cô giáo Thảo', role: 'teacher', password: 'password123' },
  { id: 'user_student_1', name: 'Học sinh An', role: 'student', password: 'password123' },
  { id: 'user_student_2', name: 'Học sinh Bình', role: 'student', password: 'password123' },
  { id: 'user_student_3', name: 'Học sinh Cường', role: 'student', password: 'password123' },
];

const getMockProblems = (): Problem[] => [
    {
        id: 'problem_1',
        title: 'Nghị luận về "Vùng an toàn"',
        prompt: 'Từ trải nghiệm cá nhân, hãy viết bài văn nghị luận (khoảng 500 chữ) trình bày suy nghĩ của bạn về việc thế hệ trẻ nên bước ra khỏi vùng an toàn của bản thân.',
        createdBy: 'user_teacher_1',
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2, // 2 days ago
    },
];

const getMockExams = (): Exam[] => [];
const getMockExamAttempts = (): ExamAttempt[] => [];


// --- API ---

const getFromStorage = <T>(key: string, mockData: T[]): T[] => {
  // Prevent SSR errors by checking for `window`
  if (typeof window === 'undefined') {
      return mockData;
  }
  try {
    const data = localStorage.getItem(key);
    if (data) {
      return JSON.parse(data);
    }
    // Seed with mock data if nothing is in storage
    localStorage.setItem(key, JSON.stringify(mockData));
    return mockData;
  } catch (error) {
    console.error(`Error reading from localStorage key "${key}":`, error);
    return mockData;
  }
};

const saveToStorage = <T>(key: string, data: T[]): void => {
  // Prevent SSR errors by checking for `window`
  if (typeof window === 'undefined') {
      return;
  }
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error saving to localStorage key "${key}":`, error);
  }
};

// Users
export const getUsers = (): User[] => getFromStorage<User>(USERS_KEY, getMockUsers());
export const saveUsers = (users: User[]): void => saveToStorage<User>(USERS_KEY, users);

// Problems
export const getProblems = (): Problem[] => getFromStorage<Problem>(PROBLEMS_KEY, getMockProblems());
export const saveProblems = (problems: Problem[]): void => saveToStorage<Problem>(PROBLEMS_KEY, problems);

// Submissions
export const getSubmissions = (): Submission[] => getFromStorage<Submission>(SUBMISSIONS_KEY, []);
export const saveSubmissions = (submissions: Submission[]): void => saveToStorage<Submission>(SUBMISSIONS_KEY, submissions);

// Exams
export const getExams = (): Exam[] => getFromStorage<Exam>(EXAMS_KEY, getMockExams());
export const saveExams = (exams: Exam[]): void => saveToStorage<Exam>(EXAMS_KEY, exams);

// Exam Attempts
export const getExamAttempts = (): ExamAttempt[] => getFromStorage<ExamAttempt>(EXAM_ATTEMPTS_KEY, getMockExamAttempts());
export const saveExamAttempts = (attempts: ExamAttempt[]): void => saveToStorage<ExamAttempt>(EXAM_ATTEMPTS_KEY, attempts);
