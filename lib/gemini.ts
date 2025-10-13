import { GoogleGenAI, Type } from "@google/genai";
import type { SimilarityCheckResult } from '@/types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set on the server");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });


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


export async function checkSimilarityOnServer(newEssay: string, existingEssays: string[]): Promise<SimilarityCheckResult> {
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