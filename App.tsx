import React, { useState, useEffect } from 'react';
import type { User, Problem, Submission, RubricItem, Exam, ExamAttempt } from './types';
import { getUsers, saveUsers, getProblems, saveProblems, getSubmissions, saveSubmissions, getExams, saveExams, getExamAttempts, saveExamAttempts } from './data/storage';
import Header from './components/Header';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import DashboardPage from './pages/DashboardPage';
import CreateProblemPage from './pages/CreateProblemPage';
import EditProblemPage from './pages/EditProblemPage';
import ProblemDetailPage from './pages/ProblemDetailPage';
import SubmissionResultPage from './pages/SubmissionResultPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AllSubmissionsPage from './pages/AllSubmissionsPage';
import ExamsPage from './pages/ExamsPage';
import CreateExamPage from './pages/CreateExamPage';
import ExamDetailPage from './pages/ExamDetailPage';
import ExamTakingPage from './pages/ExamTakingPage';

type Page = 'login' | 'signup' | 'dashboard' | 'create_problem' | 'edit_problem' | 'problem_detail' | 'submission_result' | 'admin_dashboard' | 'all_submissions' | 'exams_dashboard' | 'create_exam' | 'exam_detail' | 'exam_taking';
type PageState = {
    name: Page;
    problemId?: string;
    submissionId?: string;
    examId?: string;
    attemptId?: string;
};

const App: React.FC = () => {
    // Data state
    const [users, setUsers] = useState<User[]>([]);
    const [problems, setProblems] = useState<Problem[]>([]);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [exams, setExams] = useState<Exam[]>([]);
    const [examAttempts, setExamAttempts] = useState<ExamAttempt[]>([]);
    
    // App flow state
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [pageState, setPageState] = useState<PageState>({ name: 'login' });

    useEffect(() => {
        setUsers(getUsers());
        setProblems(getProblems());
        setSubmissions(getSubmissions());
        setExams(getExams());
        setExamAttempts(getExamAttempts());
    }, []);

    const handleLogin = (name: string, password: string): boolean => {
        const user = users.find(u => u.name.trim().toLowerCase() === name.trim().toLowerCase());
        if (user && user.password === password) {
            setCurrentUser(user);
            setPageState({ name: 'dashboard' });
            return true;
        }
        return false;
    };

    const handleSignUp = (name: string, role: 'teacher' | 'student', password: string): { success: boolean; message?: string } => {
        const trimmedName = name.trim();
        if (users.some(u => u.name.toLowerCase() === trimmedName.toLowerCase())) {
            return { success: false, message: 'Tên người dùng này đã tồn tại.' };
        }
        
        const newUser: User = {
            id: crypto.randomUUID(),
            name: trimmedName,
            role,
            password,
        };
        const updatedUsers = [...users, newUser];
        setUsers(updatedUsers);
        saveUsers(updatedUsers);
        setCurrentUser(newUser);
        setPageState({ name: 'dashboard' });
        return { success: true };
    };
    
    const handleLogout = () => {
        setCurrentUser(null);
        setPageState({ name: 'login' });
    };

    const handleAddProblem = (
        title: string,
        prompt: string,
        rawRubric: string,
        rubricItems: RubricItem[],
        customMaxScore: number,
        isRubricHidden: boolean,
        examId?: string,
    ) => {
        if (!currentUser || currentUser.role === 'student') return;
        const newProblem: Problem = {
            id: crypto.randomUUID(),
            title,
            prompt,
            rawRubric,
            rubricItems,
            customMaxScore,
            createdBy: currentUser.id,
            createdAt: Date.now(),
            isRubricHidden,
            examId,
        };
        const updatedProblems = [...problems, newProblem];
        setProblems(updatedProblems);
        saveProblems(updatedProblems);
        if (examId) {
            setPageState({ name: 'exam_detail', examId });
        } else {
            setPageState({ name: 'dashboard' });
        }
    };

    const handleAddSubmission = (submission: Submission) => {
        const updatedSubmissions = [...submissions, submission];
        setSubmissions(updatedSubmissions);
        saveSubmissions(updatedSubmissions);
        // If not an exam submission, navigate to result page. Exam submissions are handled in bulk.
        if (!submission.examId) {
            setPageState({ name: 'submission_result', submissionId: submission.id });
        }
    };

    const handleAddExam = (title: string, description: string, startTime: number, endTime: number, password?: string) => {
        if (!currentUser || currentUser.role === 'student') return;
        const newExam: Exam = {
            id: crypto.randomUUID(),
            title,
            description,
            startTime,
            endTime,
            password,
            createdBy: currentUser.id,
            createdAt: Date.now(),
        };
        const updatedExams = [...exams, newExam];
        setExams(updatedExams);
        saveExams(updatedExams);
        setPageState({ name: 'exams_dashboard' });
    };

    const handleDeleteExam = (examId: string) => {
        if (!currentUser || (currentUser.role !== 'teacher' && currentUser.role !== 'admin')) return;
        const updatedExams = exams.filter(exam => exam.id !== examId);
        setExams(updatedExams);
        saveExams(updatedExams);
        const updatedProblems = problems.filter(problem => problem.examId !== examId);
        setProblems(updatedProblems);
        saveProblems(updatedProblems);
    };
    
    const handleStartExamAttempt = (examId: string) => {
        if (!currentUser) return;

        const existingAttempt = examAttempts.find(att => att.examId === examId && att.studentId === currentUser.id && !att.submittedAt);
        
        if (existingAttempt) {
            // Resume existing attempt
            setPageState({ name: 'exam_taking', examId: examId, attemptId: existingAttempt.id });
        } else {
             // Create new attempt
            const newAttempt: ExamAttempt = {
                id: crypto.randomUUID(),
                examId: examId,
                studentId: currentUser.id,
                startedAt: Date.now(),
                fullscreenExits: [],
                visibilityStateChanges: [], // Initialize new field
                submissionIds: [],
            };
            const updatedAttempts = [...examAttempts, newAttempt];
            setExamAttempts(updatedAttempts);
            saveExamAttempts(updatedAttempts);
            setPageState({ name: 'exam_taking', examId: examId, attemptId: newAttempt.id });
        }
    };

    const handleUpdateExamAttempt = (updatedAttempt: ExamAttempt) => {
        const updatedAttempts = examAttempts.map(att => att.id === updatedAttempt.id ? updatedAttempt : att);
        setExamAttempts(updatedAttempts);
        saveExamAttempts(updatedAttempts);
    };

    const handleFinishExamAttempt = (finishedAttempt: ExamAttempt, newSubmissions: Submission[]) => {
        // Update the attempt with submittedAt and submissionIds
        const finalAttempt: ExamAttempt = {
            ...finishedAttempt,
            submittedAt: Date.now(),
            submissionIds: newSubmissions.map(s => s.id),
        };
        handleUpdateExamAttempt(finalAttempt);

        // Add all new submissions at once
        const updatedSubmissions = [...submissions, ...newSubmissions];
        setSubmissions(updatedSubmissions);
        saveSubmissions(updatedSubmissions);

        // Navigate back to the exam detail page
        setPageState({ name: 'exam_detail', examId: finishedAttempt.examId });
    };


    const handleSelectSubmission = (submissionId: string) => {
        setPageState({ name: 'submission_result', submissionId });
    };

    const handleUpdateUserRole = (userId: string, role: 'student' | 'teacher' | 'admin') => {
        const updatedUsers = users.map(user => 
            user.id === userId ? { ...user, role } : user
        );
        setUsers(updatedUsers);
        saveUsers(updatedUsers);
    };

    const handleUpdateProblem = (updatedProblem: Problem) => {
        const updatedProblems = problems.map(problem => 
            problem.id === updatedProblem.id ? updatedProblem : problem
        );
        setProblems(updatedProblems);
        saveProblems(updatedProblems);
        if (updatedProblem.examId) {
            setPageState({ name: 'exam_detail', examId: updatedProblem.examId });
        } else {
            setPageState({ name: 'admin_dashboard' });
        }
    };


    const renderPage = () => {
        if (!currentUser) {
            if (pageState.name === 'signup') {
                return <SignUpPage onSignUp={handleSignUp} onBackToLogin={() => setPageState({ name: 'login' })} />;
            }
            return <LoginPage onLogin={handleLogin} onNavigateToSignUp={() => setPageState({ name: 'signup' })} />;
        }
        
        switch (pageState.name) {
            case 'dashboard':
                return <DashboardPage 
                    user={currentUser} 
                    problems={problems.filter(p => !p.examId)}
                    onSelectProblem={(problemId) => setPageState({ name: 'problem_detail', problemId })}
                    onCreateProblem={() => setPageState({ name: 'create_problem' })}
                />;
            case 'create_problem':
                 return <CreateProblemPage 
                    examId={pageState.examId}
                    onAddProblem={handleAddProblem}
                    onCancel={() => {
                        if (pageState.examId) {
                            setPageState({ name: 'exam_detail', examId: pageState.examId });
                        } else {
                            setPageState({ name: 'dashboard' });
                        }
                    }}
                 />;
            case 'edit_problem':
                const problemToEdit = problems.find(p => p.id === pageState.problemId);
                if (!problemToEdit) return <p>Lỗi: Không tìm thấy bài tập để chỉnh sửa.</p>;
                return <EditProblemPage
                    problem={problemToEdit}
                    onUpdateProblem={handleUpdateProblem}
                    onCancel={() => {
                        if (problemToEdit.examId) {
                             setPageState({ name: 'exam_detail', examId: problemToEdit.examId });
                        } else {
                            setPageState({ name: 'admin_dashboard' });
                        }
                    }}
                />;
            case 'problem_detail':
                const problem = problems.find(p => p.id === pageState.problemId);
                if (!problem) return <p>Lỗi: Không tìm thấy bài tập.</p>;
                const backPage = problem.examId ? { name: 'exam_detail', examId: problem.examId } : { name: 'dashboard' };
                return <ProblemDetailPage 
                    problem={problem}
                    submissions={submissions}
                    users={users}
                    currentUser={currentUser}
                    onAddSubmission={handleAddSubmission}
                    onSelectSubmission={handleSelectSubmission}
                    onBack={() => setPageState(backPage as PageState)}
                />;
            case 'submission_result':
                const submission = submissions.find(s => s.id === pageState.submissionId);
                if (!submission) return <p>Lỗi: Không tìm thấy bài nộp.</p>;
                const problemForSubmission = problems.find(p => p.id === submission.problemId);
                 if (!problemForSubmission) return <p>Lỗi: Không tìm thấy bài tập tương ứng.</p>;
                const submitterForSubmission = users.find(u => u.id === submission.submitterId);
                return <SubmissionResultPage
                    submission={submission}
                    problem={problemForSubmission}
                    submitter={submitterForSubmission}
                    onBack={() => {
                        if (submission.examId) {
                            setPageState({ name: 'exam_detail', examId: submission.examId });
                        } else {
                            setPageState({ name: 'problem_detail', problemId: submission.problemId });
                        }
                    }}
                />;
            case 'admin_dashboard':
                return <AdminDashboardPage 
                    users={users}
                    problems={problems}
                    submissions={submissions}
                    onSelectProblem={(problemId) => setPageState({ name: 'problem_detail', problemId })}
                    onSelectSubmission={handleSelectSubmission}
                    onEditProblem={(problemId) => setPageState({ name: 'edit_problem', problemId })}
                    onUpdateUserRole={handleUpdateUserRole}
                    onBack={() => setPageState({ name: 'dashboard' })}
                />
            case 'all_submissions':
                return <AllSubmissionsPage
                    submissions={submissions}
                    users={users}
                    problems={problems}
                    onSelectSubmission={handleSelectSubmission}
                />
            case 'exams_dashboard':
                return <ExamsPage
                    user={currentUser}
                    exams={exams}
                    problems={problems}
                    onCreateExam={() => setPageState({ name: 'create_exam' })}
                    onSelectExam={(examId) => setPageState({ name: 'exam_detail', examId })}
                    onDeleteExam={handleDeleteExam}
                />;
            case 'create_exam':
                return <CreateExamPage
                    onAddExam={handleAddExam}
                    onCancel={() => setPageState({ name: 'exams_dashboard' })}
                />;
            case 'exam_detail':
                const exam = exams.find(e => e.id === pageState.examId);
                if (!exam) return <p>Lỗi: Không tìm thấy đề thi.</p>;
                const examProblems = problems.filter(p => p.examId === exam.id);
                return <ExamDetailPage
                    exam={exam}
                    problems={examProblems}
                    user={currentUser}
                    users={users}
                    exams={exams}
                    examAttempts={examAttempts}
                    onBack={() => setPageState({ name: 'exams_dashboard' })}
                    onCreateProblemInExam={() => setPageState({ name: 'create_problem', examId: exam.id })}
                    onSelectProblem={(problemId) => setPageState({ name: 'problem_detail', problemId })}
                    onStartExam={handleStartExamAttempt}
                />;
            case 'exam_taking':
                const takingExam = exams.find(e => e.id === pageState.examId);
                const takingAttempt = examAttempts.find(a => a.id === pageState.attemptId);
                if (!takingExam || !takingAttempt) return <p>Lỗi: Không tìm thấy đề thi hoặc phiên làm bài.</p>;
                const takingProblems = problems.filter(p => p.examId === takingExam.id);
                return <ExamTakingPage 
                    exam={takingExam}
                    problems={takingProblems}
                    attempt={takingAttempt}
                    user={currentUser}
                    onUpdateAttempt={handleUpdateExamAttempt}
                    onFinishExam={handleFinishExamAttempt}
                    onExit={() => setPageState({ name: 'exam_detail', examId: takingExam.id })}
                />;
            default:
                return <LoginPage onLogin={handleLogin} onNavigateToSignUp={() => setPageState({ name: 'signup' })} />;
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 font-sans text-slate-800">
            {currentUser && pageState.name !== 'exam_taking' && <Header 
                user={currentUser}
            />}
            <main>
                {renderPage()}
            </main>
        </div>
    );
};

export default App;