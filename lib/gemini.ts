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


export async function checkSimilarityOnServer(newEssay: string, existingEssays: string[]): Promise<{ similarityPercentage: number; explanation: string; mostSimilarEssayIndex: number; }> {
    if (existingEssays.length === 0) {
        return { similarityPercentage: 0, explanation: "Không có bài viết nào khác để so sánh.", mostSimilarEssayIndex: -1 };
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