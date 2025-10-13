import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from "@google/genai";
import type { Feedback, RubricItem, SimilarityCheckResult } from '@/types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set on the server");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
Nhiệm vụ của bạn là đọc kỹ đề bài, bài làm và hướng dẫn chấm được cung cấp.

- **ƯU TIÊN SỐ 1: Nếu có "HƯỚNG DẪN CHẤM CHI TIẾT"**: Bạn BẮT BUỘC phải tuân thủ nghiêm ngặt và tuyệt đối theo hướng dẫn này. Phân tích bài làm dựa trên từng luận điểm, yêu cầu, và thang điểm được nêu trong đó. Các tiêu chí và điểm số phải được trích xuất và áp dụng chính xác từ hướng dẫn.
- **ƯU TIÊN SỐ 2: Nếu có "biểu điểm" dạng danh sách tiêu chí**: Hãy cho điểm và viết nhận xét chi tiết cho TỪNG tiêu chí. Tổng điểm là tổng điểm của các tiêu chí. Đánh giá phải bám sát vào yêu cầu của từng tiêu chí.
- **Nếu không có cả hai**: Hãy đánh giá bài văn một cách tổng quát về các mặt: nội dung, cấu trúc, diễn đạt, ngữ pháp và cho điểm trên thang điểm được yêu cầu.

Phản hồi của bạn phải mang tính xây dựng, giúp học sinh hiểu rõ điểm mạnh, điểm yếu và cách cải thiện bài viết.
Hãy trả về kết quả dưới dạng JSON theo schema đã định sẵn.`;


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

const similarityCheckSchema = {
  type: Type.OBJECT,
  properties: {
    similarityPercentage: {
      type: Type.NUMBER,
      description: "Một con số từ 0 đến 100 thể hiện phần trăm tương đồng tổng thể giữa bài viết mới và các bài viết đã có.",
    },
    explanation: {
      type: Type.STRING,
      description: "Giải thích ngắn gọn, súc tích (1-2 câu) về lý do cho điểm tương đồng đó, nêu bật những điểm giống nhau chính nếu có.",
    },
  },
  required: ["similarityPercentage", "explanation"],
};

const similarityCheckSystemInstruction = `Bạn là một công cụ kiểm tra đạo văn chính xác và hiệu quả. Nhiệm vụ của bạn là so sánh một "Bài viết mới" với một danh sách các "Bài viết đã có".
- Đọc kỹ tất cả các bài viết.
- Phân tích sự tương đồng về ý tưởng, cấu trúc, cách diễn đạt, và các câu văn cụ thể.
- Cung cấp một TỶ LỆ PHẦN TRĂM TƯƠNG ĐỒNG tổng thể. Tỷ lệ này nên phản ánh mức độ giống nhau một cách toàn diện. 0% nghĩa là hoàn toàn khác biệt, 100% nghĩa là giống hệt.
- Cung cấp một lời giải thích ngắn gọn cho kết quả của bạn.
- Trả về kết quả dưới dạng JSON theo schema đã cho.`;

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

    const jsonText = response.text?.trim();
    if (!jsonText) {
      throw new Error("AI response was empty or invalid.");
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

    const jsonText = response.text?.trim();
    if (!jsonText) {
      throw new Error("AI rubric parsing response was empty or invalid.");
    }
    const parsedResponse: Omit<RubricItem, 'id'>[] = JSON.parse(jsonText);
    
    if (!Array.isArray(parsedResponse)) {
        throw new Error("Invalid response format from AI: expected an array.");
    }

    return parsedResponse;
}

async function checkSimilarityOnServer(newEssay: string, existingEssays: string[]): Promise<SimilarityCheckResult> {
    if (existingEssays.length === 0) {
        return { similarityPercentage: 0, explanation: "Đây là bài nộp đầu tiên cho bài tập này." };
    }

    const content = `
        **Bài viết mới cần kiểm tra:**
        """
        ${newEssay}
        """

        **Danh sách các bài viết đã có để so sánh:**
        ${existingEssays.map((essay, index) => `
        --- Bài viết ${index + 1} ---
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

    const jsonText = response.text?.trim();
    if (!jsonText) {
        throw new Error("AI similarity check response was empty.");
    }
    const parsedResponse: SimilarityCheckResult = JSON.parse(jsonText);

    if (typeof parsedResponse.similarityPercentage !== 'number' || typeof parsedResponse.explanation !== 'string') {
        throw new Error("Invalid response format from AI for similarity check.");
    }
    
    // Clamp the value just in case
    parsedResponse.similarityPercentage = Math.max(0, Math.min(100, parsedResponse.similarityPercentage));

    return parsedResponse;
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

    if (action === 'parseRubric') {
      const { rawRubricText } = payload;
      const parsedRubric = await parseRubricOnServer(rawRubricText);
      return NextResponse.json(parsedRubric);
    }

    if (action === 'checkSimilarity') {
      const { newEssay, existingEssays } = payload;
      const result = await checkSimilarityOnServer(newEssay, existingEssays);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error("Error in Gemini API route:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: "Failed to process AI request.", details: errorMessage }, { status: 500 });
  }
}