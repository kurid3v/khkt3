

import { GoogleGenAI, Type } from "@google/genai";
import type { Feedback, RubricItem, Problem, Answer, Question, DetailedFeedbackItem, SimilarityCheckResult } from '@/types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set on the server");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });


/**
 * Extracts the first valid JSON object or array from a string.
 * It handles markdown code fences and gracefully ignores any trailing text
 * that might cause parsing errors.
 * @param text The string potentially containing JSON.
 * @returns The extracted JSON string, or null if not found.
 */
function extractJson(text: string | undefined): string | null {
    if (!text) return null;

    // First, try to find JSON within markdown code fences as it's the most reliable format.
    const markdownMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (markdownMatch && markdownMatch[1]) {
        return markdownMatch[1].trim();
    }

    // If no markdown fence is found, locate the first opening brace or bracket.
    let firstOpenIndex = -1;
    let openChar = '';
    let closeChar = '';

    const firstBrace = text.indexOf('{');
    const firstBracket = text.indexOf('[');

    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
        firstOpenIndex = firstBrace;
        openChar = '{';
        closeChar = '}';
    } else if (firstBracket !== -1) {
        firstOpenIndex = firstBracket;
        openChar = '[';
        closeChar = ']';
    } else {
        return null; // No JSON structure found
    }

    // Traverse the string to find the matching closing character.
    let depth = 0;
    let inString = false;
    for (let i = firstOpenIndex; i < text.length; i++) {
        const char = text[i];

        if (char === '"' && text[i - 1] !== '\\') {
            inString = !inString;
        }

        if (inString) continue;

        if (char === openChar) {
            depth++;
        } else if (char === closeChar) {
            depth--;
        }

        if (depth === 0) {
            // Once the depth returns to 0, we've found the end of the first JSON object/array.
            const potentialJson = text.substring(firstOpenIndex, i + 1);
            try {
                // Final validation to ensure the extracted string is valid JSON.
                JSON.parse(potentialJson);
                return potentialJson;
            } catch {
                // If parsing fails, the structure is invalid, so we continue searching.
            }
        }
    }

    return null; // No matching closing bracket was found.
}

// --- ESSAY GRADING ---
const gradingResponseSchema = {
  type: Type.OBJECT,
  properties: {
    detailedFeedback: {
      type: Type.ARRAY,
      description: "Một mảng các nhận xét chi tiết cho từng tiêu chí trong biểu điểm. Nếu không có biểu điểm, mảng này có thể chứa các nhận xét chung.",
      items: {
        type: Type.OBJECT,
        properties: {
          criterion: { type: Type.STRING, description: "Tên của tiêu chí được đánh giá." },
          score: { type: Type.NUMBER, description: "Điểm số cho tiêu chí này." },
          feedback: { type: Type.STRING, description: "Nhận xét chi tiết về hiệu suất của bài văn đối với tiêu chí này." },
        },
        required: ["criterion", "score", "feedback"],
      },
    },
    totalScore: {
      type: Type.NUMBER,
      description: "Tổng điểm của bài văn. Nếu có biểu điểm, đây là tổng điểm của các tiêu chí.",
    },
    maxScore: {
      type: Type.NUMBER,
      description: "Tổng điểm tối đa có thể đạt được. Nếu có biểu điểm, đây là tổng điểm các tiêu chí. Nếu không, đây là thang điểm được yêu cầu.",
    },
    generalSuggestions: {
      type: Type.ARRAY,
      description: "Các gợi ý chung, mang tính bao quát để cải thiện toàn bộ bài văn.",
      items: { type: Type.STRING },
    },
  },
  required: ["detailedFeedback", "totalScore", "maxScore", "generalSuggestions"],
};

const gradingSystemInstruction = `Bạn là một giáo viên dạy văn có kinh nghiệm và công tâm ở Việt Nam.
Nhiệm vụ của bạn là đọc kỹ đề bài, bài làm và hướng dẫn chấm được cung cấp, sau đó đưa ra nhận xét chi tiết và cho điểm.

- **Tuân thủ Hướng dẫn chấm**: Luôn tuân thủ nghiêm ngặt hướng dẫn chấm và biểu điểm được cung cấp. Phân tích bài làm dựa trên từng luận điểm, yêu cầu và thang điểm đã cho.
- **Quy đổi điểm**: Sau khi chấm, hãy đảm bảo tổng điểm cuối cùng được quy đổi chính xác về thang điểm yêu cầu trong phần "QUAN TRỌNG" của đề bài.
- **Phản hồi xây dựng**: Phản hồi của bạn phải mang tính xây dựng, giúp học sinh hiểu rõ điểm mạnh, điểm yếu và cách cải thiện bài viết.
- **Định dạng JSON**: Luôn trả về kết quả dưới dạng JSON theo schema đã định sẵn. Không thêm bất kỳ văn bản giải thích nào bên ngoài đối tượng JSON.`;


export async function gradeEssayOnServer(prompt: string, essay: string, rubric: RubricItem[], rawRubric: string, customMaxScore: string): Promise<Feedback> {
  const maxScoreNum = Number(customMaxScore) || 10;
  let rubricContent = '';

  if (rawRubric && rawRubric.trim().length > 0) {
    rubricContent = 'Dưới đây là HƯỚNG DẪN CHẤM CHI TIẾT mà bạn BẮT BUỘC phải tuân theo một cách tuyệt đối:\n' +
      `"""${rawRubric.trim()}"""\n\n` +
      `QUAN TRỌNG: Sau khi chấm theo hướng dẫn trên, hãy đảm bảo TỔNG ĐIỂM CUỐI CÙNG được quy đổi về thang điểm ${maxScoreNum} và trường maxScore trong JSON phải là ${maxScoreNum}.`;
  } else if (rubric && rubric.length > 0) {
     const rubricTotal = rubric.reduce((sum, item) => sum + item.maxScore, 0);
     rubricContent = 'Dưới đây là biểu điểm bạn BẮT BUỘC phải tuân theo để chấm bài:\n' +
       rubric.map(item => `- Tiêu chí: "${item.criterion}", Điểm tối đa: ${item.maxScore}`).join('\n') +
       `\n(Tổng điểm biểu điểm: ${rubricTotal})\n\n` +
       `QUAN TRỌNG: Sau khi chấm theo từng tiêu chí, hãy đảm bảo TỔNG ĐIỂM CUỐI CÙNG được quy đổi về thang điểm ${maxScoreNum} và trường maxScore trong JSON phải là ${maxScoreNum}.`;
  } else {
    rubricContent = `Vui lòng chấm bài trên thang điểm ${maxScoreNum}.`;
  }

  const content = `
    ${prompt ? `Đề bài: """${prompt}"""` : ''}
    
    ${rubricContent}

    Bài làm: """${essay}"""
  `.trim();

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: content,
      config: {
        systemInstruction: gradingSystemInstruction,
        responseMimeType: "application/json",
        responseSchema: gradingResponseSchema,
        temperature: 0,
      },
    });

    const jsonText = extractJson(response.text);
    if (!jsonText) {
      throw new Error("AI response was empty or did not contain valid JSON.");
    }
    const parsedResponse: Feedback = JSON.parse(jsonText);
    
    if (
      !parsedResponse || 
      !Array.isArray(parsedResponse.detailedFeedback) ||
      typeof parsedResponse.totalScore !== 'number' ||
      typeof parsedResponse.maxScore !== 'number'
    ) {
        throw new Error("Invalid response format from AI.");
    }

    return parsedResponse;
}

// --- RUBRIC PARSING ---
const rubricParsingSchema = {
    type: Type.ARRAY,
    description: "Một mảng các tiêu chí chấm điểm được trích xuất từ văn bản.",
    items: {
        type: Type.OBJECT,
        properties: {
            criterion: {
                type: Type.STRING,
                description: "Nội dung/tên của tiêu chí. Phải rõ ràng, cụ thể. Nếu một ý lớn có nhiều ý nhỏ, hãy tách thành các tiêu chí riêng biệt.",
            },
            maxScore: {
                type: Type.NUMBER,
                description: "Điểm tối đa cho tiêu chí này.",
            },
        },
        required: ["criterion", "maxScore"],
    },
};

const rubricParsingSystemInstruction = `Bạn là một chuyên gia khảo thí giáo dục. Nhiệm vụ của bạn là đọc kỹ Hướng dẫn chấm bài dưới đây, sau đó phân tích và trích xuất TOÀN BỘ các tiêu chí chấm điểm và điểm số tương ứng một cách chi tiết và có cấu trúc.
QUAN TRỌC:
- Tách các ý lớn thành các tiêu chí nhỏ, riêng biệt nếu có thể. Ví dụ: "Mở bài (0.5đ): Giới thiệu tác giả (0.25đ), tác phẩm (0.25đ)" phải được tách thành hai tiêu chí riêng.
- Chỉ trích xuất các tiêu chí có điểm số rõ ràng. Bỏ qua các yêu cầu chung không có điểm.
- Đảm bảo lấy được tất cả các tiêu chí.
- Trả về kết quả dưới dạng một mảng JSON theo schema đã cho.`;

export async function parseRubricOnServer(rawRubricText: string): Promise<Omit<RubricItem, 'id'>[]> {
  const content = `Vui lòng phân tích và trích xuất biểu điểm từ Hướng dẫn chấm sau:\n\n"""${rawRubricText}"""`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: content,
      config: {
        systemInstruction: rubricParsingSystemInstruction,
        responseMimeType: "application/json",
        responseSchema: rubricParsingSchema,
        temperature: 0,
      },
    });

    const jsonText = extractJson(response.text);
    if (!jsonText) {
      throw new Error("AI rubric parsing response was empty or invalid.");
    }
    const parsedResponse: Omit<RubricItem, 'id'>[] = JSON.parse(jsonText);
    
    if (!Array.isArray(parsedResponse)) {
        throw new Error("Invalid response format from AI: expected an array.");
    }

    return parsedResponse;
}

// --- READING COMPREHENSION GRADING ---
const readingCompGradingSchema = {
    type: Type.ARRAY,
    description: "Một mảng kết quả chấm điểm cho từng câu hỏi tự luận.",
    items: {
        type: Type.OBJECT,
        properties: {
            questionId: { type: Type.STRING, description: "ID của câu hỏi được chấm." },
            score: { type: Type.NUMBER, description: "Điểm cho câu trả lời, không được vượt quá điểm tối đa của câu hỏi." },
            feedback: { type: Type.STRING, description: "Giải thích ngắn gọn tại sao cho điểm số đó và nhận xét về câu trả lời." }
        },
        required: ["questionId", "score", "feedback"]
    }
};

const readingCompSystemInstruction = `Bạn là một giáo viên dạy văn có kinh nghiệm, công tâm và chấm bài rất chi tiết. Nhiệm vụ của bạn là đọc kỹ đoạn văn, sau đó chấm điểm và đưa ra nhận xét cho một loạt câu trả lời của học sinh.
- Đọc kỹ đoạn văn chung.
- Với mỗi câu hỏi trong danh sách, hãy:
  1. Đọc kỹ câu hỏi, tiêu chí chấm điểm và điểm tối đa.
  2. Đọc câu trả lời của học sinh.
  3. So sánh câu trả lời với tiêu chí và nội dung trong đoạn văn.
  4. Cho điểm một cách chính xác, không được cho điểm cao hơn điểm tối đa của câu hỏi.
  5. Viết một nhận xét ngắn gọn, mang tính xây dựng, chỉ ra điểm đúng, điểm sai và cách cải thiện.
- Trả về kết quả dưới dạng một mảng JSON theo schema đã cho, không chứa bất kỳ văn bản nào khác.`;

export async function gradeReadingComprehensionOnServer(problem: Problem, answers: Answer[]): Promise<Feedback> {
    const questions = problem.questions || [];
    const passage = problem.passage || "";
    const detailedFeedback: DetailedFeedbackItem[] = [];
    let totalScore = 0;

    const shortAnswerQuestions = questions.filter(q => q.questionType === 'short_answer');
    const multipleChoiceQuestions = questions.filter(q => q.questionType === 'multiple_choice');

    // 1. Grade multiple choice questions deterministically
    const mcResults: { [key: string]: DetailedFeedbackItem } = {};
    for (const question of multipleChoiceQuestions) {
        const studentAnswer = answers.find(a => a.questionId === question.id);
        const isCorrect = studentAnswer?.selectedOptionId === question.correctOptionId;
        const score = isCorrect ? (question.maxScore ?? 1) : 0;
        const correctOptionText = question.options?.find(o => o.id === question.correctOptionId)?.text;
        const feedback = isCorrect 
            ? "Bạn đã trả lời đúng." 
            : `Bạn đã trả lời sai. Đáp án đúng là: "${correctOptionText}"`;
        mcResults[question.id] = { criterion: question.questionText, score, feedback, questionId: question.id };
    }

    // 2. Grade short answer questions in a single batch API call
    const saResults: { [key: string]: DetailedFeedbackItem } = {};
    if (shortAnswerQuestions.length > 0) {
        const questionsToGrade = shortAnswerQuestions.map(q => {
            const studentAnswer = answers.find(a => a.questionId === q.id);
            return {
                questionId: q.id,
                questionText: q.questionText,
                maxScore: q.maxScore || 1,
                gradingCriteria: q.gradingCriteria || "Dựa vào đoạn văn để đánh giá.",
                studentAnswer: studentAnswer?.writtenAnswer || "Học sinh không trả lời."
            };
        });

        const prompt = `
            **Đoạn văn:**
            """${passage}"""

            **Hướng dẫn:** Vui lòng chấm điểm các câu trả lời sau đây dựa trên đoạn văn và tiêu chí cho từng câu.
            
            **Danh sách câu trả lời cần chấm:**
            ${JSON.stringify(questionsToGrade, null, 2)}
        `.trim();

        try {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    systemInstruction: readingCompSystemInstruction,
                    responseMimeType: "application/json",
                    responseSchema: readingCompGradingSchema,
                    temperature: 0.1,
                }
            });

            const jsonText = extractJson(response.text);
            if (jsonText) {
                const results = JSON.parse(jsonText) as { questionId: string, score: number, feedback: string }[];
                const resultsMap = new Map(results.map(r => [r.questionId, r]));
                
                for (const question of shortAnswerQuestions) {
                    const result = resultsMap.get(question.id);
                    const maxScore = question.maxScore || 1;
                    if (result) {
                        const clampedScore = Math.max(0, Math.min(result.score, maxScore));
                        saResults[question.id] = { criterion: question.questionText, score: clampedScore, feedback: result.feedback, questionId: question.id };
                    } else {
                         saResults[question.id] = { criterion: question.questionText, score: 0, feedback: "AI không thể chấm câu trả lời này.", questionId: question.id };
                    }
                }
            } else {
                 throw new Error("AI response for short answers was empty or invalid.");
            }
        } catch (err) {
            console.error(`Failed to batch grade short answers`, err);
            // If batch fails, provide a default error feedback for all short answers
            for (const question of shortAnswerQuestions) {
                saResults[question.id] = { criterion: question.questionText, score: 0, feedback: "Đã xảy ra lỗi trong quá trình chấm bài tự động.", questionId: question.id };
            }
        }
    }

    // 3. Combine results in the original order
    for (const question of questions) {
        const result = mcResults[question.id] || saResults[question.id];
        if (result) {
            detailedFeedback.push(result);
            totalScore += result.score;
        }
    }
    
    const totalMaxScore = questions.reduce((acc, q) => acc + (q.maxScore ?? 1), 0);

    return {
        detailedFeedback,
        totalScore,
        maxScore: totalMaxScore,
        generalSuggestions: [], // No general suggestions for reading comprehension for now
    };
}


// --- IMAGE TO TEXT (OCR) ---
export async function imageToTextOnServer(base64Image: string): Promise<string> {
    const imagePart = {
        inlineData: {
            mimeType: 'image/jpeg',
            data: base64Image,
        },
    };
    const textPart = {
        text: "Sử dụng công nghệ OCR tiên tiến nhất, tương tự Google Lens, để đọc và trích xuất TOÀN BỘ văn bản viết tay từ hình ảnh này với độ chính xác tuyệt đối. Văn bản này là một bài văn, vì vậy hãy cố gắng giữ nguyên cấu trúc đoạn văn, ngắt dòng và định dạng gốc. Không bỏ sót bất kỳ từ nào."
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, textPart] },
    });
    
    return response.text;
}


// --- SIMILARITY CHECK (PLAGIARISM) ---
const similarityCheckSchema = {
  type: Type.OBJECT,
  properties: {
    similarityPercentage: {
      type: Type.NUMBER,
      description: "Một con số từ 0 đến 100 thể hiện phần trăm tương đồng CAO NHẤT giữa bài viết mới và MỘT trong các bài viết đã có.",
    },
    explanation: {
      type: Type.STRING,
      description: "Giải thích ngắn gọn (1-2 câu) về lý do cho điểm tương đồng cao nhất đó, nêu bật những điểm giống nhau chính nếu có.",
    },
    mostSimilarEssayIndex: {
        type: Type.NUMBER,
        description: "Chỉ số (index, bắt đầu từ 0) của bài viết TƯƠNG ĐỒNG NHẤT trong danh sách 'Bài viết đã có để so sánh' được cung cấp."
    }
  },
  required: ["similarityPercentage", "explanation", "mostSimilarEssayIndex"],
};

const similarityCheckSystemInstruction = `Bạn là một công cụ kiểm tra đạo văn chính xác và hiệu quả. Nhiệm vụ của bạn là so sánh một "Bài viết mới" với một danh sách các "Bài viết đã có".
- Đọc kỹ tất cả các bài viết.
- Phân tích và tìm ra MỘT bài viết trong danh sách 'Bài viết đã có' có độ tương đồng CAO NHẤT so với 'Bài viết mới'.
- Cung cấp TỶ LỆ PHẦN TRĂM TƯƠNG ĐỒNG của cặp bài viết giống nhau nhất đó.
- Cung cấp một lời giải thích ngắn gọn cho kết quả.
- Cung cấp CHỈ SỐ (index) của bài viết giống nhất trong danh sách 'Bài viết đã có'.
- Trả về kết quả dưới dạng JSON theo schema đã cho.`;

export async function checkSimilarityOnServer(newEssay: string, existingEssays: string[]): Promise<SimilarityCheckResult> {
    if (existingEssays.length === 0) {
        return { similarityPercentage: 0, explanation: "Đây là bài viết đầu tiên được nộp cho bài tập này.", mostSimilarEssayIndex: -1 };
    }

    const content = `
        **Bài viết mới cần kiểm tra:**
        """
        ${newEssay}
        """

        **Danh sách các bài viết đã có để so sánh:**
        ${existingEssays.map((essay, index) => `
        --- Bài viết ${index} ---
        """
        ${essay}
        """
        `).join('\n')}
    `.trim();
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: content,
      config: {
        systemInstruction: similarityCheckSystemInstruction,
        responseMimeType: "application/json",
        responseSchema: similarityCheckSchema,
        temperature: 0,
      },
    });

    const jsonText = extractJson(response.text);
    if (!jsonText) {
        throw new Error("AI similarity check response was empty.");
    }
    const parsedResponse = JSON.parse(jsonText);

    if (
        typeof parsedResponse.similarityPercentage !== 'number' || 
        typeof parsedResponse.explanation !== 'string' ||
        typeof parsedResponse.mostSimilarEssayIndex !== 'number'
    ) {
        throw new Error("Invalid response format from AI for similarity check.");
    }
    
    // Clamp the value just in case
    parsedResponse.similarityPercentage = Math.max(0, Math.min(100, parsedResponse.similarityPercentage));

    return parsedResponse;
}