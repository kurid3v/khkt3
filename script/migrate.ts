
import { PrismaClient } from '@prisma/client';
import users from '../data/users.json';
import problems from '../data/problems.json';
import classrooms from '../data/classrooms.json';
import exams from '../data/exams.json';
import submissions from '../data/submissions.json';
import examAttempts from '../data/examAttempts.json';
import type { Prisma } from '@prisma/client';


const prisma = new PrismaClient();

async function main() {
  console.log('Starting to seed data...');

  // Clear existing data to avoid conflicts, respecting foreign key constraints
  console.log('Deleting old data...');
  await prisma.submission.deleteMany();
  await prisma.examAttempt.deleteMany();
  await prisma.problem.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.classroom.deleteMany();
  await prisma.user.deleteMany();
  console.log('Old data deleted.');

  // Seed Users
  console.log('Seeding Users...');
  await prisma.user.createMany({
    data: users,
    skipDuplicates: true,
  });
  console.log(`Seeded ${users.length} users.`);

  // Seed Classrooms
  if (classrooms && classrooms.length > 0) {
    console.log('Seeding Classrooms...');
    await prisma.classroom.createMany({
      data: classrooms.map(c => ({
        ...c,
        studentIds: c.studentIds ?? [],
      })),
      skipDuplicates: true,
    });
    console.log(`Seeded ${classrooms.length} classrooms.`);
  }

  // Seed Exams
  if (exams && exams.length > 0) {
    console.log('Seeding Exams...');
    await prisma.exam.createMany({
      data: exams.map(e => ({
        ...e,
        createdAt: new Date(e.createdAt),
        startTime: new Date(e.startTime),
        endTime: new Date(e.endTime),
        classroomIds: e.classroomIds ?? [],
        password: e.password ?? null,
        description: e.description ?? '',
      })),
      skipDuplicates: true,
    });
    console.log(`Seeded ${exams.length} exams.`);
  }

  // Seed Problems
  console.log('Seeding Problems...');
  const formattedProblems = problems.map(p => ({
    ...p,
    createdAt: new Date(p.createdAt),
    rubricItems: (p.rubricItems ?? []) as Prisma.JsonValue,
    questions: (p.questions ?? []) as Prisma.JsonValue,
    classroomIds: p.classroomIds ?? [],
    prompt: p.prompt ?? null,
    rawRubric: p.rawRubric ?? null,
    isRubricHidden: p.isRubricHidden ?? false,
    passage: p.passage ?? null,
    customMaxScore: p.customMaxScore ?? null,
    examId: p.examId ?? null,
    disablePaste: p.disablePaste ?? false,
  }));

  await prisma.problem.createMany({
    data: formattedProblems,
    skipDuplicates: true,
  });
  console.log(`Seeded ${problems.length} problems.`);

  // Seed Submissions
  if (submissions && submissions.length > 0) {
    console.log('Seeding Submissions...');
    const formattedSubmissions = submissions.map(s => ({
        ...s,
        submittedAt: new Date(s.submittedAt),
        lastEditedByTeacherAt: s.lastEditedByTeacherAt ? new Date(s.lastEditedByTeacherAt) : null,
        feedback: s.feedback as Prisma.JsonValue,
        answers: (s.answers ?? []) as Prisma.JsonValue,
        similarityCheck: (s.similarityCheck ?? {}) as Prisma.JsonValue,
        examId: s.examId ?? null,
        essay: s.essay ?? null,
    }));
    await prisma.submission.createMany({
        data: formattedSubmissions,
        skipDuplicates: true,
    });
    console.log(`Seeded ${submissions.length} submissions.`);
  }

  // Seed Exam Attempts
  if (examAttempts && examAttempts.length > 0) {
      console.log('Seeding Exam Attempts...');
      const formattedAttempts = examAttempts.map(a => ({
          ...a,
          startedAt: new Date(a.startedAt),
          submittedAt: a.submittedAt ? new Date(a.submittedAt) : null,
          fullscreenExits: (a.fullscreenExits ?? []).map(ts => new Date(ts)),
          visibilityStateChanges: (a.visibilityStateChanges ?? []) as Prisma.JsonValue,
          submissionIds: a.submissionIds ?? [],
      }));
      await prisma.examAttempt.createMany({
          data: formattedAttempts,
          skipDuplicates: true,
      });
      console.log(`Seeded ${examAttempts.length} exam attempts.`);
  }


  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error('An error occurred during seeding:', e);
    // FIX: Use a type assertion to bypass a potential TypeScript configuration issue where 'process.exit' is not found.
    (process as any).exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
