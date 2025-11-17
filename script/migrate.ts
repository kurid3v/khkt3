import { PrismaClient } from '@prisma/client';
import users from '../data/users.json';
import problems from '../data/problems.json';
// Import các file json khác nếu bạn muốn di dời dữ liệu của chúng
// import classrooms from '../data/classrooms.json';
// import exams from '../data/exams.json';
// FIX: Import 'process' to provide correct types for a standalone Node.js script.
import process from 'process';

const prisma = new PrismaClient();

async function main() {
  console.log('Bắt đầu di dời dữ liệu...');

  // Xóa dữ liệu cũ để tránh trùng lặp khi chạy lại script
  // Chú ý thứ tự xóa để không vi phạm ràng buộc khóa ngoại
  await prisma.submission.deleteMany();
  await prisma.problem.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.classroom.deleteMany();
  await prisma.user.deleteMany();
  console.log('Đã xóa dữ liệu cũ.');

  // Di dời Users
  console.log('Đang di dời Users...');
  await prisma.user.createMany({
    data: users,
    skipDuplicates: true,
  });
  console.log(`Đã di dời ${users.length} người dùng.`);

  // Di dời Problems
  console.log('Đang di dời Problems...');
  // Chuyển đổi các trường cần thiết trước khi chèn
  const formattedProblems = problems.map(p => ({
    ...p,
    // Prisma yêu cầu kiểu Date, không phải number
    createdAt: new Date(p.createdAt),
    // Prisma yêu cầu các trường JSON phải là JsonValue (không phải undefined)
    rubricItems: p.rubricItems ?? [],
    questions: p.questions ?? [],
    // Đảm bảo các trường tùy chọn khác là null thay vì undefined
    prompt: p.prompt ?? null,
    rawRubric: p.rawRubric ?? null,
    isRubricHidden: p.isRubricHidden ?? null,
    passage: p.passage ?? null,
    customMaxScore: p.customMaxScore ?? null,
    examId: p.examId ?? null,
  }));
  
  await prisma.problem.createMany({
    data: formattedProblems,
    skipDuplicates: true,
  });
  console.log(`Đã di dời ${problems.length} bài tập.`);

  console.log('Di dời dữ liệu hoàn tất.');
}

main()
  .catch((e) => {
    console.error('Đã xảy ra lỗi trong quá trình di dời dữ liệu:', e);
    // FIX: Re-throwing the error will cause the process to exit with a non-zero status code
    // due to the unhandled promise rejection, which is the desired behavior and fixes the type error.
    throw e;
  })
  .finally(async () => {
    // Đóng kết nối Prisma
    await prisma.$disconnect();
  });