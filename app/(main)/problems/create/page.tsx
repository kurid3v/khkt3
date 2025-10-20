

'use client';

import React, { useState, useTransition, Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
// FIX: Import the `Link` component from 'next/link' to resolve the 'Cannot find name Link' error.
import Link from 'next/link';
import { useSession } from '@/context/SessionContext';
import { useDataContext } from '@/context/DataContext';
import { createProblem } from '@/app/actions';
import type { RubricItem, Question, Option } from '@/types';
import { parseRubric } from '@/services/geminiService';
import BookOpenIcon from '@/components/icons/BookOpenIcon';
import ClipboardListIcon from '@/components/icons/ClipboardListIcon';
import TrashIcon from '@/components/icons/TrashIcon';

function CreateProblemForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const examId = searchParams?.get('examId');
  const { currentUser } = useSession();
  const { classrooms, refetchData } = useDataContext();

  // Common state
  const [problemType, setProblemType] = useState<'essay' | 'reading_comprehension'>('essay');
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const [selectedClassroomIds, setSelectedClassroomIds] = useState<string[]>([]);
  const [disablePaste, setDisablePaste] = useState(false);

  // Essay state
  const [prompt, setPrompt] = useState('');
  const [rawRubric, setRawRubric] = useState('');
  const [rubricItems, setRubricItems] = useState<RubricItem[]>([]);
  const [customMaxScore, setCustomMaxScore] = useState<string>('10');
  const [isRubricHidden, setIsRubricHidden] = useState(false);
  const [isParsingRubric, setIsParsingRubric] = useState(false);
  const [parsingError, setParsingError] = useState('');
  
  // Reading Comprehension state
  const [passage, setPassage] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);

  const teacherClassrooms = useMemo(() => 
    currentUser ? classrooms.filter(c => c.teacherId === currentUser.id) : [],
    [classrooms, currentUser]
  );

  const handleClassroomToggle = (classId: string) => {
    setSelectedClassroomIds(prev => 
      prev.includes(classId) ? prev.filter(id => id !== classId) : [...prev, classId]
    );
  };

  // --- Essay Rubric Methods ---
  const addRubricItem = () => setRubricItems([...rubricItems, { id: crypto.randomUUID(), criterion: '', maxScore: 0 }]);
  const updateRubricItem = (id: string, field: 'criterion' | 'maxScore', value: string) => {
    setRubricItems(rubricItems.map(item => item.id === id ? { ...item, [field]: field === 'maxScore' ? Number(value) : value } : item));
  };
  const removeRubricItem = (id: string) => setRubricItems(rubricItems.filter(item => item.id !== id));
  const totalMaxScore = rubricItems.reduce((acc, item) => acc + item.maxScore, 0);

  // --- Reading Comprehension Question Methods ---
  const addQuestion = () => {
    const newOptionId = crypto.randomUUID();
    setQuestions([...questions, {
      id: crypto.randomUUID(),
      questionText: '',
      questionType: 'multiple_choice',
      options: [{ id: newOptionId, text: '' }],
      correctOptionId: newOptionId,
      maxScore: 1,
    }]);
  };
  const removeQuestion = (qId: string) => setQuestions(questions.filter(q => q.id !== qId));
  const updateQuestionText = (qId: string, text: string) => {
    setQuestions(questions.map(q => q.id === qId ? { ...q, questionText: text } : q));
  };
  const setQuestionType = (qId: string, type: 'multiple_choice' | 'short_answer') => {
    setQuestions(questions.map(q => {
        if (q.id === qId) {
            const newQ: Question = { ...q, questionType: type };
            if (type === 'multiple_choice') {
                if (!q.options?.length) { // Only add options if they don't exist
                    const newOptionId = crypto.randomUUID();
                    newQ.options = [{ id: newOptionId, text: '' }];
                    newQ.correctOptionId = newOptionId;
                }
                delete newQ.gradingCriteria;
            } else { // type === 'short_answer'
                delete newQ.options;
                delete newQ.correctOptionId;
            }
            // Ensure maxScore exists, default to 1
            if (newQ.maxScore === undefined || newQ.maxScore === null) {
                newQ.maxScore = 1;
            }
            return newQ;
        }
        return q;
    }));
  };
  const updateGradingCriteria = (qId: string, text: string) => {
    setQuestions(questions.map(q => q.id === qId ? { ...q, gradingCriteria: text } : q));
  }
   const updateQuestionMaxScore = (qId: string, value: string) => {
    const score = parseFloat(value);
    setQuestions(questions.map(q => q.id === qId ? { ...q, maxScore: isNaN(score) ? undefined : score } : q));
  };
  const addOption = (qId: string) => {
    setQuestions(questions.map(q => q.id === qId ? { ...q, options: [...(q.options || []), { id: crypto.randomUUID(), text: '' }] } : q));
  };
  const removeOption = (qId: string, oId: string) => {
    setQuestions(questions.map(q => {
      if (q.id === qId && q.options) {
        const newOptions = q.options.filter(o => o.id !== oId);
        const newCorrectId = q.correctOptionId === oId ? (newOptions[0]?.id || '') : q.correctOptionId;
        return { ...q, options: newOptions, correctOptionId: newCorrectId };
      }
      return q;
    }));
  };
  const updateOptionText = (qId: string, oId: string, text: string) => {
    setQuestions(questions.map(q => q.id === qId
      ? { ...q, options: q.options?.map(o => o.id === oId ? { ...o, text } : o) }
      : q));
  };
  const setCorrectOption = (qId: string, oId: string) => {
    setQuestions(questions.map(q => q.id === qId ? { ...q, correctOptionId: oId } : q));
  };


  // --- Form Submission ---
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!currentUser) {
        setError("Bạn phải đăng nhập để tạo bài tập.");
        return;
    }
    if (!title.trim()) {
      setError('Tiêu đề không được để trống.');
      return;
    }

    let problemData: any;

    if (problemType === 'essay') {
      if (!prompt.trim()) {
        setError('Đề bài không được để trống.');
        return;
      }
      problemData = { type: 'essay', title, prompt, rawRubric, rubricItems, customMaxScore: Number(customMaxScore), isRubricHidden, createdBy: currentUser.id, examId: examId || undefined, classroomIds: selectedClassroomIds, disablePaste };
    } else { // reading_comprehension
      if (!passage.trim()) {
        setError('Đoạn văn không được để trống.');
        return;
      }
      if (questions.length === 0 || questions.some(q => !q.questionText.trim() || (q.questionType === 'multiple_choice' && (q.options?.length ?? 0) < 2) || (q.questionType === 'multiple_choice' && q.options?.some(o => !o.text.trim())))) {
        setError('Phải có ít nhất một câu hỏi, mỗi câu hỏi trắc nghiệm phải có ít nhất hai lựa chọn và không có trường nào được để trống.');
        return;
      }
      problemData = { type: 'reading_comprehension', title, passage, questions, createdBy: currentUser.id, examId: examId || undefined, classroomIds: selectedClassroomIds, disablePaste };
    }

    startTransition(async () => {
        try {
            await createProblem(problemData);
            await refetchData();
            const destination = examId ? `/exams/${examId}` : '/dashboard';
            router.push(destination);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra. Vui lòng thử lại.");
        }
    });
  };
  
  const handleParseRubric = async () => {
    if (!rawRubric.trim()) return;
    setIsParsingRubric(true);
    setParsingError('');
    try {
      const parsedItems = await parseRubric(rawRubric);
      if (parsedItems && parsedItems.length > 0) {
        setRubricItems(parsedItems.map(item => ({ ...item, id: crypto.randomUUID() })));
      } else {
        setParsingError("AI không thể tìm thấy tiêu chí nào trong văn bản được cung cấp.");
      }
    } catch (e) {
      console.error("Rubric parsing failed", e);
      setParsingError("Đã xảy ra lỗi khi phân tích hướng dẫn chấm. Vui lòng thử lại.");
    } finally {
      setIsParsingRubric(false);
    }
  };
  
  const handleCancel = () => router.back();

  const inputClass = "mt-1 block w-full px-4 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-ring";
  const textareaClass = `${inputClass} resize-y`;
  const labelClass = "text-base font-semibold text-foreground";

  const TypeButton = ({ type, label, icon }: { type: 'essay' | 'reading_comprehension', label: string, icon: React.ReactNode }) => (
    <button
      type="button"
      onClick={() => setProblemType(type)}
      className={`w-full p-4 border-2 rounded-lg flex flex-col items-center justify-center gap-2 font-semibold transition-all ${
        problemType === type
          ? 'bg-primary/10 border-primary text-primary shadow-sm'
          : 'bg-card border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  const ProblemOptions = () => (
    <div className="pt-6 border-t border-border">
      <label className={labelClass}>Tùy chọn bài tập</label>
      <div className="mt-2 p-4 bg-secondary/30 rounded-lg">
          <label className="flex items-center justify-between gap-3 p-2 rounded-md hover:bg-muted cursor-pointer">
              <div>
                  <span className="font-medium text-foreground">Vô hiệu hóa dán (paste)</span>
                  <p className="text-sm text-muted-foreground">Ngăn học sinh dán văn bản từ bên ngoài vào ô trả lời.</p>
              </div>
              <input
                  type="checkbox"
                  checked={disablePaste}
                  onChange={(e) => setDisablePaste(e.target.checked)}
                  className="form-checkbox h-5 w-5 text-primary focus:ring-primary rounded"
              />
          </label>
      </div>
    </div>
  );

  const ClassroomSelector = () => (
    <div>
        <label className={labelClass}>Giao cho lớp học (tùy chọn)</label>
        <p className="text-sm text-muted-foreground mt-1 mb-2">Nếu không chọn lớp nào, bài tập sẽ được hiển thị cho tất cả học sinh.</p>
        {teacherClassrooms.length > 0 ? (
            <div className="mt-2 space-y-2 max-h-40 overflow-y-auto p-3 bg-secondary/30 rounded-lg">
                {teacherClassrooms.map(c => (
                    <label key={c.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer has-[:checked]:bg-primary/10">
                        <input
                            type="checkbox"
                            checked={selectedClassroomIds.includes(c.id)}
                            onChange={() => handleClassroomToggle(c.id)}
                            className="form-checkbox h-4 w-4 text-primary focus:ring-primary"
                        />
                        <span className="font-medium text-foreground">{c.name}</span>
                    </label>
                ))}
            </div>
        ) : (
            <p className="text-sm text-muted-foreground p-3 bg-secondary/30 rounded-lg">Bạn chưa tạo lớp học nào. <Link href="/classrooms" className="text-primary font-semibold underline">Tạo lớp học mới</Link>.</p>
        )}
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold text-foreground mb-8">
        {examId ? 'Thêm câu hỏi vào đề thi' : 'Tạo bài tập mới'}
      </h1>
      <form onSubmit={handleSubmit} className="bg-card p-8 rounded-xl shadow-sm border border-border space-y-6">
        
        {/* Step 1: Choose Type */}
        <div>
            <label className={labelClass}>Chọn loại bài tập</label>
            <div className="mt-2 grid grid-cols-2 gap-4">
                <TypeButton type="essay" label="Bài làm văn" icon={<BookOpenIcon className="w-8 h-8"/>} />
                <TypeButton type="reading_comprehension" label="Đọc hiểu văn bản" icon={<ClipboardListIcon className="w-8 h-8"/>} />
            </div>
        </div>

        {error && <p className="text-destructive bg-destructive/10 p-3 rounded-md">{error}</p>}
        
        {/* Common Field: Title */}
        <div>
          <label htmlFor="problem-title" className={labelClass}>
            Tiêu đề bài tập / Tên câu hỏi
          </label>
          <input id="problem-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nhập tiêu đề..." className={inputClass} />
        </div>

        {/* --- ESSAY FORM --- */}
        {problemType === 'essay' && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <label htmlFor="problem-prompt" className={labelClass}>Đề bài / Yêu cầu chi tiết</label>
              <textarea id="problem-prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Nhập nội dung đề bài văn..." className={`${textareaClass} h-40`} />
            </div>
            {!examId && <ClassroomSelector />}
            <ProblemOptions />
            <div>
                <label htmlFor="max-score-input" className={labelClass}>Thang điểm</label>
                <input id="max-score-input" type="number" value={customMaxScore} onChange={(e) => setCustomMaxScore(e.target.value)} min="1" step="any" className={`${inputClass} w-40`} />
                <p className="text-sm text-muted-foreground mt-1">Điểm cuối cùng sẽ được quy đổi về thang điểm này.</p>
            </div>
            <div className="pt-6 border-t border-border">
              {/* Rubric Section from original component */}
              <div className="flex justify-between items-center flex-wrap gap-2">
                 <label className={labelClass}>Biểu điểm chấm (tùy chọn)</label>
                 <div className="flex items-center gap-2">
                    <label htmlFor="hide-rubric-toggle" className="text-sm font-medium text-muted-foreground cursor-pointer">Ẩn với học sinh</label>
                    <button type="button" id="hide-rubric-toggle" onClick={() => setIsRubricHidden(!isRubricHidden)} className={`${isRubricHidden ? 'bg-primary' : 'bg-input'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent`} role="switch" aria-checked={isRubricHidden}>
                        <span aria-hidden="true" className={`${isRubricHidden ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0`} />
                    </button>
                 </div>
              </div>
              <p className="text-sm text-muted-foreground mt-1 mb-2">Cung cấp biểu điểm để AI chấm chính xác hơn.</p>
              <div className="mt-2 flex flex-col gap-3 p-4 bg-secondary/30 rounded-lg">
                <div className="flex justify-between items-center gap-2">
                    <label htmlFor="raw-rubric-input" className="text-md font-semibold text-foreground">Dán toàn bộ hướng dẫn chấm</label>
                    <button type="button" onClick={handleParseRubric} disabled={!rawRubric.trim() || isParsingRubric} className="px-3 py-1.5 text-sm text-primary font-semibold bg-primary/10 hover:bg-primary/20 rounded-md disabled:opacity-50 flex items-center gap-2">
                        {isParsingRubric ? 'Đang phân tích...' : 'Phân tích bằng AI'}
                    </button>
                </div>
                <textarea id="raw-rubric-input" value={rawRubric} onChange={(e) => setRawRubric(e.target.value)} placeholder="Dán hướng dẫn chấm vào đây..." className={`${textareaClass} h-40 bg-card`} />
                 {parsingError && <p className="text-sm text-destructive -mt-1">{parsingError}</p>}
                <div className="relative my-2"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border"></div></div><div className="relative flex justify-center"><span className="bg-secondary/30 px-2 text-sm text-muted-foreground">HOẶC</span></div></div>
                <label className="text-md font-semibold text-foreground">Tạo biểu điểm thủ công</label>
                {rubricItems.map((item, index) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <span className="font-medium text-muted-foreground">{index + 1}.</span>
                      <input type="text" value={item.criterion} onChange={(e) => updateRubricItem(item.id, 'criterion', e.target.value)} placeholder="Tên tiêu chí..." className="flex-grow p-2 border border-border rounded-md bg-card" />
                      <input type="number" value={item.maxScore} min="0" step="any" onChange={(e) => updateRubricItem(item.id, 'maxScore', e.target.value)} placeholder="Điểm" className="w-24 p-2 border border-border rounded-md bg-card" />
                      <button type="button" onClick={() => removeRubricItem(item.id)} className="p-2 text-muted-foreground hover:text-destructive rounded-full"> &times; </button>
                    </div>
                ))}
                <button type="button" onClick={addRubricItem} className="mt-2 self-start px-4 py-2 text-sm text-primary font-semibold bg-primary/10 hover:bg-primary/20 rounded-md">+ Thêm tiêu chí</button>
                {rubricItems.length > 0 && (<div className="mt-2 text-right font-semibold text-foreground">Tổng điểm: {totalMaxScore}</div>)}
              </div>
            </div>
          </div>
        )}

        {/* --- READING COMPREHENSION FORM --- */}
        {problemType === 'reading_comprehension' && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <label htmlFor="passage-input" className={labelClass}>Đoạn văn đọc hiểu</label>
              <textarea id="passage-input" value={passage} onChange={(e) => setPassage(e.target.value)} placeholder="Dán đoạn văn vào đây..." className={`${textareaClass} h-60`} />
            </div>
            {!examId && <ClassroomSelector />}
            <ProblemOptions />
            <div className="pt-6 border-t border-border space-y-4">
              <div className="flex justify-between items-center">
                <label className={labelClass}>Câu hỏi</label>
                <button type="button" onClick={addQuestion} className="px-4 py-2 text-sm text-primary font-semibold bg-primary/10 hover:bg-primary/20 rounded-md">+ Thêm câu hỏi</button>
              </div>
              {questions.map((q, qIndex) => (
                <div key={q.id} className="p-4 bg-secondary/30 rounded-lg space-y-3">
                  <div className="flex items-start gap-2">
                    <label htmlFor={`q-text-${q.id}`} className="font-semibold text-foreground pt-2">Câu {qIndex + 1}</label>
                    <div className="flex-grow">
                      <input id={`q-text-${q.id}`} type="text" value={q.questionText} onChange={e => updateQuestionText(q.id, e.target.value)} placeholder="Nhập câu hỏi..." className="w-full p-2 border border-border rounded-md bg-card" />
                      {/* Type selector */}
                      <div className="flex items-center gap-4 mt-2">
                          <label className="text-sm font-semibold text-muted-foreground">Loại:</label>
                          <div className="flex rounded-md border border-border p-0.5 bg-background">
                              <button type="button" onClick={() => setQuestionType(q.id, 'multiple_choice')} className={`px-3 py-1 text-xs rounded-sm ${q.questionType === 'multiple_choice' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'}`}>Trắc nghiệm</button>
                              <button type="button" onClick={() => setQuestionType(q.id, 'short_answer')} className={`px-3 py-1 text-xs rounded-sm ${q.questionType === 'short_answer' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'}`}>Tự luận</button>
                          </div>
                      </div>
                    </div>
                    <button type="button" onClick={() => removeQuestion(q.id)} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full" aria-label="Xóa câu hỏi">
                      <TrashIcon />
                    </button>
                  </div>
                  
                  {q.questionType === 'multiple_choice' ? (
                      <div className="pl-8 space-y-2">
                        {q.options?.map((opt, oIndex) => (
                          <div key={opt.id} className="flex items-center gap-2">
                            <input type="radio" name={`correct-opt-${q.id}`} id={`radio-${opt.id}`} checked={q.correctOptionId === opt.id} onChange={() => setCorrectOption(q.id, opt.id)} className="form-radio h-4 w-4 text-primary focus:ring-primary"/>
                            <label htmlFor={`radio-${opt.id}`} className="sr-only">Đáp án đúng</label>
                            <input type="text" value={opt.text} onChange={e => updateOptionText(q.id, opt.id, e.target.value)} placeholder={`Lựa chọn ${oIndex + 1}`} className="flex-grow p-2 border border-border rounded-md bg-card" />
                            {(q.options?.length ?? 0) > 1 && <button type="button" onClick={() => removeOption(q.id, opt.id)} className="p-1 text-sm text-muted-foreground hover:text-destructive rounded-full">&times;</button>}
                          </div>
                        ))}
                        <button type="button" onClick={() => addOption(q.id)} className="px-3 py-1 text-xs text-primary font-semibold bg-primary/10 hover:bg-primary/20 rounded-md">+ Thêm lựa chọn</button>
                        <div className="flex items-center gap-2 pt-2">
                            <label htmlFor={`maxscore-mc-${q.id}`} className="text-sm font-semibold text-muted-foreground">Điểm tối đa:</label>
                            <input
                                id={`maxscore-mc-${q.id}`}
                                type="number"
                                value={q.maxScore || ''}
                                onChange={e => updateQuestionMaxScore(q.id, e.target.value)}
                                className="w-20 p-1 border border-border rounded-md bg-card text-sm text-center"
                                placeholder="1"
                                min="0.25"
                                step="0.25"
                            />
                        </div>
                      </div>
                  ) : (
                    <div className="pl-8 space-y-2">
                        <label htmlFor={`criteria-${q.id}`} className="text-sm font-semibold text-muted-foreground">Đáp án mẫu / Tiêu chí chấm (cho AI)</label>
                        <textarea 
                            id={`criteria-${q.id}`}
                            value={q.gradingCriteria || ''} 
                            onChange={e => updateGradingCriteria(q.id, e.target.value)}
                            placeholder="Cung cấp đáp án mẫu hoặc tiêu chí để AI chấm điểm chính xác..."
                            className="w-full p-2 border border-border rounded-md bg-card text-sm"
                            rows={2}
                        />
                         <div className="flex items-center gap-2 pt-2">
                            <label htmlFor={`maxscore-${q.id}`} className="text-sm font-semibold text-muted-foreground">Điểm tối đa:</label>
                            <input
                                id={`maxscore-${q.id}`}
                                type="number"
                                value={q.maxScore || ''}
                                onChange={e => updateQuestionMaxScore(q.id, e.target.value)}
                                className="w-20 p-1 border border-border rounded-md bg-card text-sm text-center"
                                placeholder="1"
                                min="0.25"
                                step="0.25"
                            />
                        </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-4">
          <button type="button" onClick={handleCancel} className="px-6 py-3 bg-secondary text-secondary-foreground font-semibold rounded-md hover:bg-muted">Hủy</button>
          <button type="submit" disabled={isPending} className="px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-md shadow-sm hover:bg-primary/90 disabled:opacity-50">
            {isPending ? 'Đang lưu...' : (examId ? 'Thêm câu hỏi' : 'Tạo bài tập')}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function CreateProblemPage() {
    return (
        <Suspense fallback={<div className="p-8">Đang tải...</div>}>
            <CreateProblemForm />
        </Suspense>
    )
}