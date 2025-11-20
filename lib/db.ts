
import { PrismaClient } from '@prisma/client';
import type { User, Problem, Submission, Exam, ExamAttempt, Classroom } from '@/types';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
//
// Learn more: https://pris.ly/d/help/next-js-best-practices

declare global {
  var prisma: PrismaClient | undefined;
}

const prisma = globalThis.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}


// New data access layer using Prisma
export const db = {
    get all() {
        return {
            users: prisma.user.findMany(),
            problems: prisma.problem.findMany(),
            submissions: prisma.submission.findMany(),
            exams: prisma.exam.findMany(),
            examAttempts: prisma.examAttempt.findMany(),
            classrooms: prisma.classroom.findMany(),
        };
    },
    users: {
        find: (predicate: (user: User) => boolean) => {
            // This is inefficient and should be replaced by specific queries
            // For now, it mimics the old behavior
            return prisma.user.findMany().then(users => users.find(predicate));
        },
        some: (predicate: (user: User) => boolean) => {
            return prisma.user.findMany().then(users => users.some(predicate));
        },
        create: (data: Omit<User, 'id'>) => {
            return prisma.user.create({ data: { ...data, id: crypto.randomUUID() } });
        },
        update: (id: string, data: Partial<User>) => {
            return prisma.user.update({ where: { id }, data });
        },
        delete: async (id: string) => {
            const adminUser = await prisma.user.findFirst({ where: { role: 'admin' }});
            if (!adminUser) throw new Error("Admin user not found for content reassignment.");
            if (id === adminUser.id) throw new Error("Cannot delete the primary admin user.");

            return prisma.$transaction(async (tx) => {
                // Reassign content
                await tx.problem.updateMany({ where: { createdBy: id }, data: { createdBy: adminUser.id } });
                await tx.exam.updateMany({ where: { createdBy: id }, data: { createdBy: adminUser.id } });
                
                // Delete user-specific data
                await tx.submission.deleteMany({ where: { submitterId: id } });
                await tx.examAttempt.deleteMany({ where: { studentId: id } });
                await tx.classroom.deleteMany({ where: { teacherId: id } });

                // Remove user from any classes they are a student in
                const classroomsAsStudent = await tx.classroom.findMany({ where: { studentIds: { has: id } } });
                for(const classroom of classroomsAsStudent) {
                    await tx.classroom.update({
                        where: { id: classroom.id },
                        data: { studentIds: { set: classroom.studentIds.filter(sid => sid !== id) } }
                    });
                }
                
                // Finally, delete the user
                await tx.user.delete({ where: { id } });
                return true;
            });
        }
    },
    problems: {
        create: (data: Omit<Problem, 'id' | 'createdAt'>) => {
            return prisma.problem.create({
                data: {
                    ...data,
                    id: crypto.randomUUID(),
                    createdAt: new Date(),
                    rubricItems: data.rubricItems ?? undefined,
                    questions: data.questions ?? undefined,
                    classroomIds: data.classroomIds ?? [],
                }
            });
        },
        update: (id: string, data: Partial<Problem>) => {
             return prisma.problem.update({ 
                 where: { id }, 
                 data: {
                     ...data,
                     rubricItems: data.rubricItems ?? undefined,
                     questions: data.questions ?? undefined,
                 }
            });
        },
        delete: (id: string) => {
            return prisma.problem.delete({ where: { id } });
        }
    },
    submissions: {
         create: (data: Omit<Submission, 'id' | 'submittedAt'>) => {
            return prisma.submission.create({ 
                data: { 
                    ...data,
                    id: crypto.randomUUID(),
                    submittedAt: new Date(),
                    feedback: data.feedback,
                    answers: data.answers ?? undefined,
                    similarityCheck: data.similarityCheck ?? undefined,
                } 
            });
        },
        update: (id: string, data: Partial<Submission>) => {
            return prisma.submission.update({ 
                where: { id }, 
                data: {
                    ...data,
                    feedback: data.feedback ?? undefined,
                    answers: data.answers ?? undefined,
                    similarityCheck: data.similarityCheck ?? undefined,
                }
            });
        },
    },
    exams: {
         create: (data: Omit<Exam, 'id' | 'createdAt'>) => {
            return prisma.exam.create({ 
                data: { 
                    ...data,
                    id: crypto.randomUUID(),
                    createdAt: new Date(),
                    startTime: new Date(data.startTime),
                    endTime: new Date(data.endTime),
                    classroomIds: data.classroomIds ?? [],
                }
            });
        },
        delete: (id: string) => {
            return prisma.exam.delete({ where: { id } });
        }
    },
    examAttempts: {
        create: (data: Omit<ExamAttempt, 'id' | 'startedAt' | 'fullscreenExits' | 'visibilityStateChanges' | 'submissionIds'>) => {
            return prisma.examAttempt.create({
                data: {
                    ...data,
                    id: crypto.randomUUID(),
                    startedAt: new Date(),
                    fullscreenExits: [],
                    visibilityStateChanges: [],
                    submissionIds: [],
                }
            });
        },
        update: (id: string, data: Partial<ExamAttempt>) => {
             return prisma.examAttempt.update({ 
                where: { id }, 
                data: {
                    ...data,
                    visibilityStateChanges: data.visibilityStateChanges ?? undefined,
                }
            });
        },
    },
    classrooms: {
        find: (predicate: (classroom: Classroom) => boolean) => {
            return prisma.classroom.findMany().then(classrooms => classrooms.find(predicate));
        },
        create: (data: Omit<Classroom, 'id' | 'studentIds' | 'joinCode'>) => {
            const generateJoinCode = () => {
                const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
                let code = '';
                for (let i = 0; i < 6; i++) {
                    code += chars.charAt(Math.floor(Math.random() * chars.length));
                }
                return code;
            };
            return prisma.classroom.create({
                data: {
                    ...data,
                    id: crypto.randomUUID(),
                    studentIds: [],
                    joinCode: generateJoinCode(),
                }
            });
        },
        update: (id: string, data: Partial<Classroom>) => {
            return prisma.classroom.update({ where: { id }, data });
        },
        delete: (id: string) => {
            return prisma.$transaction(async (tx) => {
                // Unassign classroom from problems and exams
                const problemsToUpdate = await tx.problem.findMany({ where: { classroomIds: { has: id } } });
                for (const problem of problemsToUpdate) {
                    await tx.problem.update({
                        where: { id: problem.id },
                        data: { classroomIds: { set: problem.classroomIds.filter(cid => cid !== id) } }
                    });
                }
                const examsToUpdate = await tx.exam.findMany({ where: { classroomIds: { has: id } } });
                for (const exam of examsToUpdate) {
                    await tx.exam.update({
                        where: { id: exam.id },
                        data: { classroomIds: { set: exam.classroomIds.filter(cid => cid !== id) } }
                    });
                }
                // Delete classroom
                await tx.classroom.delete({ where: { id } });
                return true;
            });
        }
    }
};
