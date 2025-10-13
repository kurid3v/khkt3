export interface User {
  id: string;
  name: string;
  role: 'teacher' | 'student' | 'admin';
  password: string;
}

export interface Problem {
  id: string;
  title: string;
  prompt: string;
  rawRubric?: string;
  rubricItems?: RubricItem[];
  customMaxScore?: number;
  createdBy: string; // userId of teacher
  createdAt: number;
  examId?: string; // ID of the exam this problem belongs to
  isRubricHidden?: boolean;
}

export interface SimilarityCheckResult {
  similarityPercentage: number;
  explanation: string;
}

export interface Submission {
  id: string;
  problemId: string;
  submitterId: string;
  essay: string;
  feedback: Feedback;
  submittedAt: number;
  examId?: string; // ID of the exam this submission belongs to
  similarityCheck?: SimilarityCheckResult;
}

export interface Exam {
  id:string;
  title: string;
  description: string;
  startTime: number; // Timestamp for when the exam starts
  endTime: number; // Timestamp for when the exam ends
  password?: string; // Optional password
  createdBy: string; // userId of teacher
  createdAt: number;
}

export interface ExamAttempt {
  id: string;
  examId: string;
  studentId: string;
  startedAt: number;
  submittedAt?: number;
  fullscreenExits: number[]; // Array of timestamps when user exited fullscreen
  // Add a new field to track when the user navigates away from the tab
  visibilityStateChanges: { timestamp: number, state: 'visible' | 'hidden' }[];
  submissionIds: string[];
}


// --- Existing Types ---
export interface RubricItem {
  id: string;
  criterion: string;
  maxScore: number;
}

export interface DetailedFeedbackItem {
  criterion: string;
  score: number;
  feedback: string;
}

export interface Feedback {
  detailedFeedback: DetailedFeedbackItem[];
  totalScore: number;
  maxScore: number;
  generalSuggestions: string[];
}