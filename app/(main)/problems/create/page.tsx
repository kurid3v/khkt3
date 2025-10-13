'use client';

import React, { useState, useTransition, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '@/context/SessionContext';
import { createProblem } from '@/app/actions';
import type { RubricItem, Question, Option } from '@/types';
import { parseRubric } from '@/services/geminiService';
import BookOpenIcon from '@/components/icons/BookOpenIcon';
import ClipboardListIcon from '@/components/icons/ClipboardListIcon';
// FIX: Import the missing TrashIcon component.
import TrashIcon from '@/components/icons/TrashIcon';

function CreateProblemForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const examId = searchParams?.get('examId');
  const { currentUser } = useSession();

  // Common state
  const [problemType, setProblemType] = useState<'essay' | 'reading_comprehension'>('essay');
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

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
      options: [{ id: newOptionId, text: '' }],
      correctOptionId: newOptionId,
    }]);
  };
  const removeQuestion = (qId: string) => setQuestions(questions.filter(q => q.id !== qId));
  const updateQuestionText = (qId: string, text: string) => {
    setQuestions(questions.map(q => q.id === qId ? { ...q, questionText: text } : q));
  };
  const addOption = (qId: string) => {
    setQuestions(questions.map(q => q.id === qId ? { ...q, options: [...q.options, { id: crypto.randomUUID(), text: '' }] } : q));
  };
  const removeOption = (qId: string, oId: string) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        const newOptions = q.options.filter(o => o.id !== oId);
        // If the deleted option was the correct one, default to the first remaining option
        const newCorrectId = q.correctOptionId === oId ? (newOptions[0]?.id || '') : q.correctOptionId;
        return { ...q, options: newOptions, correctOptionId: newCorrectId };
      }
      return q;
    }));
  };
  const updateOptionText = (qId: string, oId: string, text: string) => {
    setQuestions(questions.map(q => q.id === qId
      ? { ...q, options: q.options.map(o => o.id === oId ? { ...o, text } : o) }
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
      problemData = { type: 'essay', title, prompt, rawRubric, rubricItems, customMaxScore: Number(customMaxScore), isRubricHidden, createdBy: currentUser.id, examId: examId || undefined };
    } else { // reading_comprehension
      if (!passage.trim()) {
        setError('Đoạn văn không được để trống.');
        return;
      }
      if (questions.length === 0 || questions.some(q => !q.questionText.trim() || q.options.length < 2 || q.options.some(o => !o.text.trim()))) {
        setError('Phải có ít nhất một câu hỏi, mỗi câu hỏi phải có ít nhất hai lựa chọn và không có trường nào được để trống.');
        return;
      }
      problemData = { type: 'reading_comprehension', title, passage, questions, createdBy: currentUser.id, examId: examId || undefined };
    }

    startTransition(async () => {
        try {
            await createProblem(problemData);
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
            <div className="pt-6 border-t border-border space-y-4">
              <div className="flex justify-between items-center">
                <label className={labelClass}>Câu hỏi trắc nghiệm</label>
                <button type="button" onClick={addQuestion} className="px-4 py-2 text-sm text-primary font-semibold bg-primary/10 hover:bg-primary/20 rounded-md">+ Thêm câu hỏi</button>
              </div>
              {questions.map((q, qIndex) => (
                <div key={q.id} className="p-4 bg-secondary/30 rounded-lg space-y-3">
                  <div className="flex items-center gap-2">
                    <label htmlFor={`q-text-${q.id}`} className="font-semibold text-foreground">Câu {qIndex + 1}</label>
                    <input id={`q-text-${q.id}`} type="text" value={q.questionText} onChange={e => updateQuestionText(q.id, e.target.value)} placeholder="Nhập câu hỏi..." className="flex-grow p-2 border border-border rounded-md bg-card" />
                    <button type="button" onClick={() => removeQuestion(q.id)} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full" aria-label="Xóa câu hỏi">
                      <TrashIcon />
                    </button>
                  </div>
                  <div className="pl-6 space-y-2">
                    {q.options.map((opt, oIndex) => (
                      <div key={opt.id} className="flex items-center gap-2">
                        <input type="radio" name={`correct-opt-${q.id}`} id={`radio-${opt.id}`} checked={q.correctOptionId === opt.id} onChange={() => setCorrectOption(q.id, opt.id)} className="form-radio h-4 w-4 text-primary focus:ring-primary"/>
                        <label htmlFor={`radio-${opt.id}`} className="text-sm font-medium text-muted-foreground">Đáp án đúng</label>
                        <input type="text" value={opt.text} onChange={e => updateOptionText(q.id, opt.id, e.target.value)} placeholder={`Lựa chọn ${oIndex + 1}`} className="flex-grow p-2 border border-border rounded-md bg-card" />
                        {q.options.length > 1 && <button type="button" onClick={() => removeOption(q.id, opt.id)} className="p-1 text-sm text-muted-foreground hover:text-destructive rounded-full">&times;</button>}
                      </div>
                    ))}
                    <button type="button" onClick={() => addOption(q.id)} className="px-3 py-1 text-xs text-primary font-semibold bg-primary/10 hover:bg-primary/20 rounded-md">+ Thêm lựa chọn</button>
                  </div>
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