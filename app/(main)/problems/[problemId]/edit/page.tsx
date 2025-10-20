// FIX: Create the page component for editing existing problems.
'use client';

import React, { useState, useTransition, useMemo, useEffect } from 'react';
import { useRouter, notFound } from 'next/navigation';
import Link from 'next/link';
import { useDataContext } from '@/context/DataContext';
import { updateProblem } from '@/app/actions';
import { parseRubric } from '@/services/geminiService';
import type { Problem, RubricItem, Question, Option } from '@/types';
import TrashIcon from '@/components/icons/TrashIcon';

// A sub-component to manage individual questions for reading comprehension (re-used from create page logic)
const QuestionEditor: React.FC<{
    question: Question;
    index: number;
    onUpdate: (index: number, updatedQuestion: Question) => void;
    onRemove: (index: number) => void;
}> = ({ question, index, onUpdate, onRemove }) => {

    const handleOptionChange = (optIndex: number, text: string) => {
        const newOptions = [...(question.options || [])];
        newOptions[optIndex] = { ...newOptions[optIndex], text };
        onUpdate(index, { ...question, options: newOptions });
    };

    const handleAddOption = () => {
        const newOptions = [...(question.options || []), { id: crypto.randomUUID(), text: '' }];
        onUpdate(index, { ...question, options: newOptions });
    };

    const handleRemoveOption = (optIndex: number) => {
        const newOptions = [...(question.options || [])];
        const removedOption = newOptions.splice(optIndex, 1)[0];
        const newQuestion = { ...question, options: newOptions };
        if (question.correctOptionId === removedOption.id) {
            newQuestion.correctOptionId = undefined;
        }
        onUpdate(index, newQuestion);
    };

    return (
        <div className="bg-secondary/50 p-4 rounded-lg border border-border">
            <div className="flex justify-between items-center mb-3">
                <p className="font-semibold text-foreground">Câu hỏi {index + 1}</p>
                <button type="button" onClick={() => onRemove(index)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full">
                    <TrashIcon />
                </button>
            </div>
            <div className="space-y-4">
                <textarea
                    value={question.questionText}
                    onChange={e => onUpdate(index, { ...question, questionText: e.target.value })}
                    placeholder="Nội dung câu hỏi"
                    className="w-full p-2 border border-border rounded-md bg-background"
                    rows={2}
                />
                 <div className="flex items-center gap-4">
                    <select
                        value={question.questionType}
                        onChange={e => onUpdate(index, { ...question, questionType: e.target.value as 'multiple_choice' | 'short_answer' })}
                        className="p-2 border border-border rounded-md bg-background"
                    >
                        <option value="multiple_choice">Trắc nghiệm</option>
                        <option value="short_answer">Tự luận</option>
                    </select>
                    <div className="flex items-center gap-2">
                         <label className="text-sm font-medium">Điểm:</label>
                        <input
                            type="number"
                            value={question.maxScore || 1}
                            onChange={e => onUpdate(index, { ...question, maxScore: Number(e.target.value) || 1 })}
                            className="w-20 p-2 border border-border rounded-md bg-background"
                            min="0.25"
                            step="0.25"
                        />
                    </div>
                </div>

                {question.questionType === 'multiple_choice' && (
                    <div className="pl-4 border-l-2 border-border space-y-2">
                        {question.options?.map((opt, optIndex) => (
                            <div key={opt.id} className="flex items-center gap-2">
                                <input
                                    type="radio"
                                    name={`correct-option-${question.id}`}
                                    checked={question.correctOptionId === opt.id}
                                    onChange={() => onUpdate(index, { ...question, correctOptionId: opt.id })}
                                    className="form-radio text-primary focus:ring-primary"
                                />
                                <input
                                    type="text"
                                    value={opt.text}
                                    onChange={e => handleOptionChange(optIndex, e.target.value)}
                                    placeholder={`Lựa chọn ${optIndex + 1}`}
                                    className="flex-grow p-2 border border-border rounded-md bg-background"
                                />
                                <button type="button" onClick={() => handleRemoveOption(optIndex)} className="text-muted-foreground hover:text-destructive p-1">
                                    &times;
                                </button>
                            </div>
                        ))}
                        <button type="button" onClick={handleAddOption} className="text-sm font-semibold text-primary hover:underline">
                            + Thêm lựa chọn
                        </button>
                    </div>
                )}
                {question.questionType === 'short_answer' && (
                    <textarea
                        value={question.gradingCriteria}
                        onChange={e => onUpdate(index, { ...question, gradingCriteria: e.target.value })}
                        placeholder="Đáp án mẫu hoặc tiêu chí chấm..."
                        className="w-full p-2 border border-border rounded-md bg-background"
                        rows={2}
                    />
                )}
            </div>
        </div>
    );
};

export default function EditProblemPage({ params }: { params: { problemId: string } }) {
    const router = useRouter();
    const { problems, currentUser, classrooms, isLoading: isDataLoading } = useDataContext();

    const [problem, setProblem] = useState<Problem | null>(null);

    // Form state
    const [problemType, setProblemType] = useState<'essay' | 'reading_comprehension'>('essay');
    const [title, setTitle] = useState('');
    const [error, setError] = useState('');
    const [disablePaste, setDisablePaste] = useState(false);
    const [selectedClassroomIds, setSelectedClassroomIds] = useState<string[]>([]);

    // Essay state
    const [prompt, setPrompt] = useState('');
    const [rawRubric, setRawRubric] = useState('');
    const [rubricItems, setRubricItems] = useState<RubricItem[]>([]);
    const [customMaxScore, setCustomMaxScore] = useState(10);
    const [isRubricHidden, setIsRubricHidden] = useState(false);
    const [isParsingRubric, setIsParsingRubric] = useState(false);

    // Reading comprehension state
    const [passage, setPassage] = useState('');
    const [questions, setQuestions] = useState<Question[]>([]);

    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        const foundProblem = problems.find(p => p.id === params.problemId);
        if (foundProblem) {
            setProblem(foundProblem);
            setTitle(foundProblem.title);
            setProblemType(foundProblem.type);
            setDisablePaste(foundProblem.disablePaste || false);
            setSelectedClassroomIds(foundProblem.classroomIds || []);

            if (foundProblem.type === 'essay') {
                setPrompt(foundProblem.prompt || '');
                setRawRubric(foundProblem.rawRubric || '');
                setRubricItems(foundProblem.rubricItems || []);
                setCustomMaxScore(foundProblem.customMaxScore || 10);
                setIsRubricHidden(foundProblem.isRubricHidden || false);
            } else {
                setPassage(foundProblem.passage || '');
                setQuestions(foundProblem.questions || []);
            }
        }
    }, [problems, params.problemId]);

    const teacherClassrooms = useMemo(() => 
        currentUser ? classrooms.filter(c => c.teacherId === currentUser.id) : [],
        [classrooms, currentUser]
    );

    const handleParseRubric = async () => {
        // Same as create page
        if (!rawRubric.trim()) return;
        setIsParsingRubric(true);
        setError('');
        try {
            const parsedItems = await parseRubric(rawRubric);
            const itemsWithIds = parsedItems.map(item => ({...item, id: crypto.randomUUID()}))
            setRubricItems(itemsWithIds);
        } catch (err) {
            setError("Không thể phân tích biểu điểm. Vui lòng kiểm tra lại văn bản hoặc thử lại.");
        } finally {
            setIsParsingRubric(false);
        }
    };
    
    // Question handlers are identical to create page
    const handleAddQuestion = () => {
        const newQuestion: Question = { id: crypto.randomUUID(), questionText: '', questionType: 'multiple_choice', options: [{ id: crypto.randomUUID(), text: '' }], maxScore: 1 };
        setQuestions([...questions, newQuestion]);
    };
    const handleUpdateQuestion = (index: number, updatedQuestion: Question) => {
        const newQuestions = [...questions];
        newQuestions[index] = updatedQuestion;
        setQuestions(newQuestions);
    };
    const handleRemoveQuestion = (index: number) => {
        setQuestions(questions.filter((_, i) => i !== index));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!problem) return;
        setError('');

        const problemData: Partial<Problem> = {
            title: title.trim(),
            type: problemType,
            disablePaste,
            classroomIds: selectedClassroomIds,
        };

        if (problemType === 'essay') {
            problemData.prompt = prompt.trim();
            problemData.rawRubric = rawRubric.trim();
            problemData.rubricItems = rubricItems;
            problemData.customMaxScore = customMaxScore;
            problemData.isRubricHidden = isRubricHidden;
        } else {
            problemData.passage = passage.trim();
            problemData.questions = questions;
        }

        startTransition(async () => {
            try {
                await updateProblem(problem.id, problemData);
                router.push(`/problems/${problem.id}`);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra khi cập nhật.");
            }
        });
    };

    const handleClassroomToggle = (classId: string) => {
        setSelectedClassroomIds(prev => 
            prev.includes(classId) ? prev.filter(id => id !== classId) : [...prev, classId]
        );
    };


    const inputClass = "w-full p-3 bg-background border border-border rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring/50";
    const labelClass = "text-lg font-semibold text-foreground";

    if (isDataLoading) {
        return <div className="container mx-auto px-4 py-8 text-center">Đang tải dữ liệu...</div>;
    }

    if (!problem) {
        // Let notFound handle it after data has loaded
        if (!isDataLoading) {
            notFound();
        }
        return null;
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <Link href={`/problems/${problem.id}`} className="mb-6 text-primary font-semibold hover:underline inline-block">
                &larr; Quay lại bài tập
            </Link>
            <h1 className="text-3xl font-bold text-foreground mb-6">
                Chỉnh sửa bài tập
            </h1>
            <form onSubmit={handleSubmit} className="bg-card p-8 rounded-xl shadow-card border border-border space-y-8">
                 {error && <p className="text-destructive bg-destructive/10 p-3 rounded-md text-center">{error}</p>}
                
                <div>
                    <label className={labelClass}>Loại bài tập</label>
                    <div className="mt-2 text-muted-foreground">Không thể thay đổi loại bài tập sau khi đã tạo.</div>
                </div>

                <div>
                    <label htmlFor="problem-title" className={labelClass}>Tiêu đề {problemType === 'essay' ? 'bài tập' : 'bài đọc hiểu'}</label>
                    <input id="problem-title" type="text" value={title} onChange={e => setTitle(e.target.value)} className={`mt-2 ${inputClass}`} required />
                </div>

                {problemType === 'essay' ? (
                    <div className="space-y-6">
                        <div>
                            <label htmlFor="problem-prompt" className={labelClass}>Đề bài</label>
                            <textarea id="problem-prompt" value={prompt} onChange={e => setPrompt(e.target.value)} className={`mt-2 h-32 ${inputClass}`} />
                        </div>
                        <div>
                            <label htmlFor="problem-rubric" className={labelClass}>Hướng dẫn chấm (Biểu điểm)</label>
                            <textarea id="problem-rubric" value={rawRubric} onChange={e => setRawRubric(e.target.value)} className={`mt-2 h-40 ${inputClass}`} placeholder="Dán biểu điểm chi tiết vào đây..." />
                            <button type="button" onClick={handleParseRubric} disabled={isParsingRubric} className="mt-2 btn-secondary px-4 py-2 text-sm disabled:opacity-50">
                                {isParsingRubric ? 'Đang phân tích...' : 'Phân tích biểu điểm bằng AI'}
                            </button>
                            {rubricItems.length > 0 && (
                                <div className="mt-4 p-4 bg-secondary/50 rounded-md border border-border">
                                    <p className="font-semibold mb-2">Các tiêu chí đã phân tích:</p>
                                    <ul className="list-disc list-inside space-y-1 text-sm">
                                        {rubricItems.map((item, i) => <li key={item.id || i}><strong>{item.criterion}:</strong> {item.maxScore} điểm</li>)}
                                    </ul>
                                </div>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="problem-max-score" className={labelClass}>Thang điểm</label>
                                <input id="problem-max-score" type="number" value={customMaxScore} onChange={e => setCustomMaxScore(Number(e.target.value))} className={`mt-2 ${inputClass}`} min="1" step="0.5" />
                            </div>
                            <div className="flex items-center gap-3 pt-8">
                                <input id="problem-hide-rubric" type="checkbox" checked={isRubricHidden} onChange={e => setIsRubricHidden(e.target.checked)} className="h-5 w-5 rounded form-checkbox text-primary focus:ring-primary"/>
                                <label htmlFor="problem-hide-rubric" className="font-medium">Ẩn hướng dẫn chấm với học sinh</label>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div>
                            <label htmlFor="problem-passage" className={labelClass}>Đoạn văn</label>
                            <textarea id="problem-passage" value={passage} onChange={e => setPassage(e.target.value)} className={`mt-2 h-48 ${inputClass}`} />
                        </div>
                        <div>
                            <label className={labelClass}>Câu hỏi</label>
                            <div className="mt-2 space-y-4">
                                {questions.map((q, i) => <QuestionEditor key={q.id} question={q} index={i} onUpdate={handleUpdateQuestion} onRemove={handleRemoveQuestion} />)}
                            </div>
                            <button type="button" onClick={handleAddQuestion} className="mt-4 btn-secondary px-4 py-2 text-sm">+ Thêm câu hỏi</button>
                        </div>
                    </div>
                )}
                
                {!problem.examId && (
                     <div>
                        <label className={labelClass}>Giao cho lớp học (tùy chọn)</label>
                         <p className="text-sm text-muted-foreground mt-1 mb-2">Nếu không chọn lớp nào, bài tập sẽ được hiển thị cho tất cả học sinh.</p>
                         {teacherClassrooms.length > 0 ? (
                            <div className="mt-2 space-y-2 max-h-40 overflow-y-auto p-3 bg-secondary/50 rounded-lg border">
                                {teacherClassrooms.map(c => (
                                    <label key={c.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer has-[:checked]:bg-primary/10">
                                        <input type="checkbox" checked={selectedClassroomIds.includes(c.id)} onChange={() => handleClassroomToggle(c.id)} className="form-checkbox h-4 w-4 text-primary focus:ring-primary" />
                                        <span className="font-medium text-foreground">{c.name}</span>
                                    </label>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground p-3 bg-secondary/50 rounded-lg">Bạn chưa tạo lớp học nào. <Link href="/classrooms" className="text-primary font-semibold underline">Tạo lớp học mới</Link>.</p>
                        )}
                    </div>
                )}

                 <div className="flex items-center gap-3 pt-4 border-t border-border">
                    <input id="problem-disable-paste" type="checkbox" checked={disablePaste} onChange={e => setDisablePaste(e.target.checked)} className="h-5 w-5 rounded form-checkbox text-primary focus:ring-primary"/>
                    <label htmlFor="problem-disable-paste" className="font-medium">Vô hiệu hóa tính năng dán (paste) văn bản</label>
                </div>

                <div className="flex justify-end gap-4 pt-4 border-t border-border">
                    <button type="button" onClick={() => router.back()} className="btn-secondary px-6 py-3">Hủy</button>
                    <button type="submit" disabled={isPending} className="btn-primary px-6 py-3 disabled:opacity-50">
                        {isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                </div>
            </form>
        </div>
    );
}