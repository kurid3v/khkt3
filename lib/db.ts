
import { PrismaClient } from '@prisma/client';
import type { User, Problem, Submission, Exam, ExamAttempt, Classroom } from '@/types';

const prismaClientSingleton = () => {
  return new PrismaClient()
}

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma
}

export const db = {
    get all() {
        return {
            users: prisma.user.findMany() as Promise<User[]>,
            problems: prisma.problem.findMany() as Promise<Problem[]>,
            submissions: prisma.submission.findMany() as Promise<Submission[]>,
            exams: prisma.exam.findMany() as Promise<Exam[]>,
            examAttempts: prisma.examAttempt.findMany() as Promise<ExamAttempt[]>,
            classrooms: prisma.classroom.findMany() as Promise<Classroom[]>,
        };
    },
    users: {
        find: (predicate: (user: User) => boolean) => {
            return prisma.user.findMany().then(users => (users as User[]).find(predicate));
        },
        some: (predicate: (user: User) => boolean) => {
            return prisma.user.findMany().then(users => (users as User[]).some(predicate));
        },
        create: (data: Omit<User, 'id'>) => {
            return prisma.user.create({ data: { ...data, id: crypto.randomUUID() } }) as Promise<User>;
        },
        update: (id: string, data: Partial<User>) => {
            return prisma.user.update({ where: { id }, data }) as Promise<User>;
        },
        delete: async (id: string) => {
            const adminUser = await prisma.user.findFirst({ where: { role: 'admin' }});
            if (!adminUser) throw new Error("Admin user not found for content reassignment.");
            if (id === adminUser.id) throw new Error("Cannot delete the primary admin user.");

            return prisma.$transaction(async (tx) => {
                await tx.problem.updateMany({ where: { createdBy: id }, data: { createdBy: adminUser.id } });
                await tx.exam.updateMany({ where: { createdBy: id }, data: { createdBy: adminUser.id } });
                await tx.submission.deleteMany({ where: { submitterId: id } });
                await tx.examAttempt.deleteMany({ where: { studentId: id } });
                await tx.classroom.deleteMany({ where: { teacherId: id } });
                
                // In-memory filtering for JSON arrays (SQLite limitation)
                const allClassrooms = await tx.classroom.findMany();
                const classroomsAsStudent = allClassrooms.filter(c => {
                    const students = c.studentIds as unknown as string[];
                    return students.includes(id);
                });

                for(const classroom of classroomsAsStudent) {
                    const currentStudents = classroom.studentIds as unknown as string[];
                    await tx.classroom.update({
                        where: { id: classroom.id },
                        data: { studentIds: currentStudents.filter(sid => sid !== id) }
                    });
                }
                
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
            }) as Promise<Problem>;
        },
        update: (id: string, data: Partial<Problem>) => {
             return prisma.problem.update({ 
                 where: { id }, 
                 data: {
                     ...data,
                     rubricItems: data.rubricItems ?? undefined,
                     questions: data.questions ?? undefined,
                 }
            }) as Promise<Problem>;
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
            }) as Promise<Submission>;
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
            }) as Promise<Submission>;
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
            }) as Promise<Exam>;
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
            }) as Promise<ExamAttempt>;
        },
        update: (id: string, data: Partial<ExamAttempt>) => {
             return prisma.examAttempt.update({ 
                where: { id }, 
                data: {
                    ...data,
                    visibilityStateChanges: data.visibilityStateChanges ?? undefined,
                }
            }) as Promise<ExamAttempt>;
        },
    },
    classrooms: {
        find: (predicate: (classroom: Classroom) => boolean) => {
            return prisma.classroom.findMany().then(classrooms => (classrooms as Classroom[]).find(predicate));
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
            }) as Promise<Classroom>;
        },
        update: (id: string, data: Partial<Classroom>) => {
            return prisma.classroom.update({ where: { id }, data }) as Promise<Classroom>;
        },
        delete: (id: string) => {
            return prisma.$transaction(async (tx) => {
                // In-memory filtering for JSON arrays
                const allProblems = await tx.problem.findMany();
                const problemsToUpdate = allProblems.filter(p => {
                    const cids = p.classroomIds as unknown as string[];
                    return cids.includes(id);
                });

                for (const problem of problemsToUpdate) {
                    const cids = problem.classroomIds as unknown as string[];
                    await tx.problem.update({
                        where: { id: problem.id },
                        data: { classroomIds: cids.filter(cid => cid !== id) }
                    });
                }

                const allExams = await tx.exam.findMany();
                const examsToUpdate = allExams.filter(e => {
                    const cids = e.classroomIds as unknown as string[];
                    return cids.includes(id);
                });

                for (const exam of examsToUpdate) {
                    const cids = exam.classroomIds as unknown as string[];
                    await tx.exam.update({
                        where: { id: exam.id },
                        data: { classroomIds: cids.filter(cid => cid !== id) }
                    });
                }
                await tx.classroom.delete({ where: { id } });
                return true;
            });
        }
    }
};
