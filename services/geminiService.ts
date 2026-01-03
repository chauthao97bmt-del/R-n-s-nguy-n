import { GoogleGenAI } from "@google/genai";
import { LevelConfig } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const TEXT_MODEL = 'gemini-3-flash-preview';
const TTS_MODEL = 'gemini-2.5-flash-preview-tts';

const SYSTEM_INSTRUCTION = "Bạn là một giáo viên Toán lớp 6 vui tính, tận tâm và ngắn gọn. Câu trả lời của bạn nên dưới 50 từ.";

// Audio Context Singleton for TTS
let audioCtx: AudioContext | null = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  }
  return audioCtx;
}

// Helper: Decode Base64
function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export const geminiService = {
  async getHint(level: LevelConfig, currentApples: number[]): Promise<string> {
    try {
      const prompt = `
        Vòng chơi: "${level.name}".
        Nhiệm vụ: Ăn số nguyên theo thứ tự ${level.order === 'asc' ? 'TĂNG DẦN (bé đến lớn)' : 'GIẢM DẦN (lớn đến bé)'}.
        Các số còn lại trên màn hình: ${currentApples.join(', ')}.
        Hãy chỉ ra số tiếp theo cần ăn là gì và cho một mẹo nhỏ để nhận biết (ví dụ: số âm càng lớn thì càng bé).
      `;
      
      const response = await ai.models.generateContent({
        model: TEXT_MODEL,
        contents: prompt,
        config: {
            systemInstruction: SYSTEM_INSTRUCTION,
        }
      });
      return response.text || "Hãy tìm số nhỏ nhất/lớn nhất hiện tại!";
    } catch (error) {
      console.error("Gemini Hint Error:", error);
      return "Hmm, thầy đang bận xíu, em tự tính nhé!";
    }
  },

  async explainMistake(level: LevelConfig, wrongVal: number, correctVal: number): Promise<string> {
    try {
      const prompt = `
        Học sinh đang chơi sắp xếp số nguyên ${level.order === 'asc' ? 'tăng dần' : 'giảm dần'}.
        Đáng lẽ phải ăn số ${correctVal}, nhưng học sinh lại ăn số ${wrongVal}.
        Giải thích cực ngắn gọn tại sao ${wrongVal} sai so với ${correctVal}.
      `;

      const response = await ai.models.generateContent({
        model: TEXT_MODEL,
        contents: prompt,
        config: {
            systemInstruction: SYSTEM_INSTRUCTION,
        }
      });
      return response.text || `Sai rồi! ${correctVal} mới là đáp án đúng.`;
    } catch (error) {
        console.error("Gemini Explain Error:", error);
        return `Tiếc quá! Số đúng phải là ${correctVal}.`;
    }
  },

  async getPraise(): Promise<string> {
    try {
      const prompt = "Viết một câu khen ngợi ngắn gọn, hài hước cho học sinh vừa thắng một vòng chơi toán học khó.";
      const response = await ai.models.generateContent({
        model: TEXT_MODEL,
        contents: prompt,
        config: {
            systemInstruction: SYSTEM_INSTRUCTION,
        }
      });
      return response.text || "Tuyệt vời! Em làm tốt lắm!";
    } catch (error) {
        return "Xuất sắc!";
    }
  },

  async speak(text: string) {
    try {
      const response = await ai.models.generateContent({
        model: TTS_MODEL,
        contents: { parts: [{ text }] },
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Aoede' }, // Aoede usually works well for general tones
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) return;

      const ctx = getAudioContext();
      if (ctx.state === 'suspended') await ctx.resume();

      const audioBytes = decodeBase64(base64Audio);
      
      // Manually decode PCM logic if raw, but Gemini often returns standard formats or needs decoding.
      // The instruction guide suggests specific decoding, but standard decodeAudioData often works if header exists.
      // However, per instructions: "The audio bytes returned by the API is raw PCM data... it contains no header".
      // We must map Int16 to Float32.
      
      const dataInt16 = new Int16Array(audioBytes.buffer);
      const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
      const channelData = buffer.getChannelData(0);
      for (let i = 0; i < dataInt16.length; i++) {
        channelData[i] = dataInt16[i] / 32768.0;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start();

    } catch (error) {
      console.error("Gemini TTS Error:", error);
    }
  }
};