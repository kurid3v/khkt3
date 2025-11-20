
import type { User, Problem, Submission, Exam, ExamAttempt, Classroom } from '@/types';
import initialUsers from '../data/users.json';
import initialProblems from '../data/problems.json';
import initialClassrooms from '../data/classrooms.json';
import initialExams from '../data/exams.json';
import initialSubmissions from '../data/submissions.json';
import initialExamAttempts from '../data/examAttempts.json';

// In-memory store class
class Store {
  users: User[];
  problems: Problem[];
  submissions: Submission[];
  exams: Exam[];
  examAttempts: ExamAttempt[];
  classrooms: Classroom[];

  constructor() {
    this.users = [...initialUsers] as User[];
    this.problems = [...initialProblems] as Problem[];
    this.submissions = [...initialSubmissions] as Submission[];
    this.exams = [...initialExams] as Exam[];
    this.examAttempts = [...initialExamAttempts] as ExamAttempt[];
    this.classrooms = [...initialClassrooms] as Classroom[];
  }
}

// Global singleton to persist data across hot reloads in development
declare global {
  var storeGlobal: Store | undefined;
}

const store = globalThis.storeGlobal ?? new Store();

if (process.env.NODE_ENV !== 'production') {
  globalThis.storeGlobal = store;
}

// Helper to simulate async DB delay slightly if needed, but for now we resolve immediately.
export const db = {
    get all() {
        return {
            users: Promise.resolve([...store.users]),
            problems: Promise.resolve([...store.problems]),
            submissions: Promise.resolve([...store.submissions]),
            exams: Promise.resolve([...store.exams]),
            examAttempts: Promise.resolve([...store.examAttempts]),
            classrooms: Promise.resolve([...store.classrooms]),
        };
    },
    users: {
        find: async (predicate: (user: User) => boolean) => {
            return store.users.find(predicate);
        },
        some: async (predicate: (user: User) => boolean) => {
            return store.users.some(predicate);
        },
        create: async (data: Omit<User, 'id'>) => {
            const newUser = { ...data, id: crypto.randomUUID() } as User;
            store.users.push(newUser);
            return newUser;
        },
        update: async (id: string, data: Partial<User>) => {
            const index = store.users.findIndex(u => u.id === id);
            if (index === -1) throw new Error("User not found");
            store.users[index] = { ...store.users[index], ...data };
            return store.users[index];
        },
        delete: async (id: string) => {
            const adminUser = store.users.find(u => u.role === 'admin');
            if (!adminUser) throw new Error("Admin user not found for content reassignment.");
            if (id === adminUser.id) throw new Error("Cannot delete the primary admin user.");

            // Reassign content ownership
            store.problems.forEach(p => { if (p.createdBy === id) p.createdBy = adminUser.id; });
            store.exams.forEach(e => { if (e.createdBy === id) e.createdBy = adminUser.id; });

            // Delete related data
            store.submissions = store.submissions.filter(s => s.submitterId !== id);
            store.examAttempts = store.examAttempts.filter(a => a.studentId !== id);
            
            // Handle classroom teacher removal and student removal
            store.classrooms = store.classrooms.filter(c => c.teacherId !== id);
            store.classrooms.forEach(c => {
                c.studentIds = c.studentIds.filter(sid => sid !== id);
            });

            store.users = store.users.filter(u => u.id !== id);
            return true;
        }
    },
    problems: {
        create: async (data: Omit<Problem, 'id' | 'createdAt'>) => {
            const newProblem = {
                ...data,
                id: crypto.randomUUID(),
                createdAt: Date.now(),
                rubricItems: data.rubricItems ?? undefined,
                questions: data.questions ?? undefined,
                classroomIds: data.classroomIds ?? [],
            } as Problem;
            store.problems.push(newProblem);
            return newProblem;
        },
        update: async (id: string, data: Partial<Problem>) => {
             const index = store.problems.findIndex(p => p.id === id);
             if (index === -1) throw new Error("Problem not found");
             store.problems[index] = { 
                 ...store.problems[index], 
                 ...data,
                 rubricItems: data.rubricItems ?? store.problems[index].rubricItems,
                 questions: data.questions ?? store.problems[index].questions
             };
            return store.problems[index];
        },
        delete: async (id: string) => {
            store.problems = store.problems.filter(p => p.id !== id);
            return { id };
        }
    },
    submissions: {
         create: async (data: Omit<Submission, 'id' | 'submittedAt'>) => {
            const newSubmission = { 
                ...data,
                id: crypto.randomUUID(),
                submittedAt: Date.now(),
                feedback: data.feedback,
                answers: data.answers ?? undefined,
                similarityCheck: data.similarityCheck ?? undefined,
            } as Submission;
            store.submissions.push(newSubmission);
            return newSubmission;
        },
        update: async (id: string, data: Partial<Submission>) => {
            const index = store.submissions.findIndex(s => s.id === id);
            if (index === -1) throw new Error("Submission not found");
            store.submissions[index] = { 
                ...store.submissions[index], 
                ...data,
                feedback: data.feedback ?? store.submissions[index].feedback,
                answers: data.answers ?? store.submissions[index].answers,
                similarityCheck: data.similarityCheck ?? store.submissions[index].similarityCheck
            };
            return store.submissions[index];
        },
    },
    exams: {
         create: async (data: Omit<Exam, 'id' | 'createdAt'>) => {
            const newExam = { 
                ...data,
                id: crypto.randomUUID(),
                createdAt: Date.now(),
                startTime: Number(data.startTime),
                endTime: Number(data.endTime),
                classroomIds: data.classroomIds ?? [],
            } as Exam;
            store.exams.push(newExam);
            return newExam;
        },
        delete: async (id: string) => {
            store.exams = store.exams.filter(e => e.id !== id);
            return { id };
        }
    },
    examAttempts: {
        create: async (data: Omit<ExamAttempt, 'id' | 'startedAt' | 'fullscreenExits' | 'visibilityStateChanges' | 'submissionIds'>) => {
            const newAttempt = {
                ...data,
                id: crypto.randomUUID(),
                startedAt: Date.now(),
                fullscreenExits: [],
                visibilityStateChanges: [],
                submissionIds: [],
            } as ExamAttempt;
            store.examAttempts.push(newAttempt);
            return newAttempt;
        },
        update: async (id: string, data: Partial<ExamAttempt>) => {
             const index = store.examAttempts.findIndex(a => a.id === id);
             if (index === -1) throw new Error("Exam attempt not found");
             store.examAttempts[index] = { 
                 ...store.examAttempts[index], 
                 ...data,
                 visibilityStateChanges: data.visibilityStateChanges ?? store.examAttempts[index].visibilityStateChanges
             };
            return store.examAttempts[index];
        },
    },
    classrooms: {
        find: async (predicate: (classroom: Classroom) => boolean) => {
            return store.classrooms.find(predicate);
        },
        create: async (data: Omit<Classroom, 'id' | 'studentIds' | 'joinCode'>) => {
            const generateJoinCode = () => {
                const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
                let code = '';
                for (let i = 0; i < 6; i++) {
                    code += chars.charAt(Math.floor(Math.random() * chars.length));
                }
                return code;
            };
            const newClassroom = {
                ...data,
                id: crypto.randomUUID(),
                studentIds: [],
                joinCode: generateJoinCode(),
            } as Classroom;
            store.classrooms.push(newClassroom);
            return newClassroom;
        },
        update: async (id: string, data: Partial<Classroom>) => {
            const index = store.classrooms.findIndex(c => c.id === id);
            if (index === -1) throw new Error("Classroom not found");
            store.classrooms[index] = { ...store.classrooms[index], ...data };
            return store.classrooms[index];
        },
        delete: async (id: string) => {
            // Remove references in problems and exams
            store.problems.forEach(p => {
                if (p.classroomIds) {
                    p.classroomIds = p.classroomIds.filter(cid => cid !== id);
                }
            });
            store.exams.forEach(e => {
                if (e.classroomIds) {
                    e.classroomIds = e.classroomIds.filter(cid => cid !== id);
                }
            });
            store.classrooms = store.classrooms.filter(c => c.id !== id);
            return true;
        }
    }
};
