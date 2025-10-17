
import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from "@google/genai";
import type { Feedback, RubricItem, Problem, Answer, Question, DetailedFeedbackItem } from '@/types';

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


const responseSchema = {
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

const systemInstruction = `Bạn là một giáo viên dạy văn có kinh nghiệm và công tâm ở Việt Nam.
Nhiệm vụ của bạn là đọc kỹ đề bài, bài làm và hướng dẫn chấm được cung cấp, sau đó đưa ra nhận xét chi tiết và cho điểm.

- **Tuân thủ Hướng dẫn chấm**: Luôn tuân thủ nghiêm ngặt hướng dẫn chấm và biểu điểm được cung cấp. Phân tích bài làm dựa trên từng luận điểm, yêu cầu và thang điểm đã cho.
- **Quy đổi điểm**: Sau khi chấm, hãy đảm bảo tổng điểm cuối cùng được quy đổi chính xác về thang điểm yêu cầu trong phần "QUAN TRỌNG" của đề bài.
- **Phản hồi xây dựng**: Phản hồi của bạn phải mang tính xây dựng, giúp học sinh hiểu rõ điểm mạnh, điểm yếu và cách cải thiện bài viết.
- **Định dạng JSON**: Luôn trả về kết quả dưới dạng JSON theo schema đã định sẵn. Không thêm bất kỳ văn bản giải thích nào bên ngoài đối tượng JSON.`;


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

async function gradeEssayOnServer(prompt: string, essay: string, rubric: RubricItem[], rawRubric: string, customMaxScore: string): Promise<Feedback> {
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
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema,
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

async function parseRubricOnServer(rawRubricText: string): Promise<Omit<RubricItem, 'id'>[]> {
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

// New schema for grading short answers
const shortAnswerGradingSchema = {
    type: Type.OBJECT,
    properties: {
        score: { type: Type.NUMBER, description: "Điểm cho câu trả lời này, thang điểm 1. Cho 1 điểm nếu đúng/đủ ý, 0.5 nếu có ý đúng nhưng chưa đủ, 0 nếu sai hoàn toàn." },
        feedback: { type: Type.STRING, description: "Giải thích ngắn gọn tại sao cho điểm số đó. Nếu sai, hãy chỉ ra điểm sai." }
    },
    required: ["score", "feedback"]
};

async function gradeReadingComprehensionOnServer(problem: Problem, answers: Answer[]): Promise<Feedback> {
    const questions = problem.questions || [];
    const passage = problem.passage || "";
    let totalScore = 0;
    const feedbackItems: DetailedFeedbackItem[] = [];

    const gradingPromises = questions.map(async (question) => {
        const studentAnswer = answers.find(a => a.questionId === question.id);

        if (question.questionType === 'multiple_choice') {
            const isCorrect = studentAnswer?.selectedOptionId === question.correctOptionId;
            const score = isCorrect ? 1 : 0;
            const correctOptionText = question.options?.find(o => o.id === question.correctOptionId)?.text;
            const feedback = isCorrect 
                ? "Bạn đã trả lời đúng." 
                : `Bạn đã trả lời sai. Đáp án đúng là: "${correctOptionText}"`;
            return { criterion: question.questionText, score, feedback };
        }

        if (question.questionType === 'short_answer') {
            if (studentAnswer?.writtenAnswer && studentAnswer.writtenAnswer.trim()) {
                const prompt = `
                    Dựa vào đoạn trích sau:
                    """${passage}"""

                    Câu hỏi: "${question.questionText}"
                    ${question.gradingCriteria ? `Tiêu chí chấm/Đáp án mẫu: "${question.gradingCriteria}"` : ''}

                    Câu trả lời của học sinh:
                    """${studentAnswer.writtenAnswer}"""

                    Hãy chấm điểm câu trả lời này trên thang điểm 1 và đưa ra nhận xét ngắn gọn.
                `.trim();

                try {
                    const response = await ai.models.generateContent({
                        model: "gemini-2.5-flash",
                        contents: prompt,
                        config: {
                            systemInstruction: "Bạn là một giáo viên văn chấm bài tự luận ngắn. Hãy chấm điểm công tâm dựa trên tiêu chí và đưa ra nhận xét súc tích.",
                            responseMimeType: "application/json",
                            responseSchema: shortAnswerGradingSchema,
                            temperature: 0.1,
                        }
                    });
                    const jsonText = extractJson(response.text);
                    if (jsonText) {
                        const result = JSON.parse(jsonText) as { score: number, feedback: string };
                        return { criterion: question.questionText, score: result.score, feedback: result.feedback };
                    }
                } catch (err) {
                    console.error(`Failed to grade short answer for question ${question.id}`, err);
                }
            }
             // Handle no answer or AI error
            return { criterion: question.questionText, score: 0, feedback: "Không có câu trả lời hoặc đã xảy ra lỗi khi chấm." };
        }
        
        // Fallback for unknown question types
        return { criterion: question.questionText, score: 0, feedback: "Loại câu hỏi không xác định." };
    });

    const results = await Promise.all(gradingPromises);
    
    // Use a map to preserve order
    const feedbackMap = new Map<string, DetailedFeedbackItem>();
    results.forEach(item => {
        totalScore += item.score;
        feedbackMap.set(item.criterion, item);
    });

    const orderedFeedback = questions.map(q => feedbackMap.get(q.questionText)!);

    return {
        detailedFeedback: orderedFeedback,
        totalScore,
        maxScore: questions.length, // Each question is worth 1 point for simplicity
        generalSuggestions: [],
    };
}


async function imageToTextOnServer(base64Image: string): Promise<string> {
    const imagePart = {
        inlineData: {
            mimeType: 'image/jpeg',
            data: base64Image,
        },
    };
    const textPart = {
        text: "Trích xuất tất cả chữ viết tay từ hình ảnh này dưới dạng văn bản thuần túy. Giữ nguyên định dạng và ngắt dòng nhiều nhất có thể."
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, textPart] },
    });
    
    return response.text;
}


export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, payload } = body;

    if (action === 'grade') {
      const { prompt, essay, rubric, rawRubric, customMaxScore } = payload;
      const feedback = await gradeEssayOnServer(prompt, essay, rubric, rawRubric, customMaxScore);
      return NextResponse.json(feedback);
    }
    
    if (action === 'grade_reading_comprehension') {
        const { problem, answers } = payload;
        const feedback = await gradeReadingComprehensionOnServer(problem, answers);
        return NextResponse.json(feedback);
    }

    if (action === 'parseRubric') {
      const { rawRubricText } = payload;
      const parsedRubric = await parseRubricOnServer(rawRubricText);
      return NextResponse.json(parsedRubric);
    }

    if (action === 'image_to_text') {
        const { base64Image } = payload;
        const text = await imageToTextOnServer(base64Image);
        return NextResponse.json(text);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error("Error in Gemini API route:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: "Failed to process AI request.", details: errorMessage }, { status: 500 });
  }
}
