import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { ChatMessage } from "../types";

let ai: GoogleGenAI | null = null;
let chatSession: Chat | null = null;

// Initialize the API with the key from environment
const getAI = () => {
  if (!ai) {
    if (!process.env.API_KEY) {
      console.warn("API_KEY not found in environment.");
      return null;
    }
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return ai;
};

const SYSTEM_INSTRUCTION = `
You are "Commander Nova", a tactical AI battle coordinator for the "Neon Siege" tank division.
Style: Military, concise, urgent, slightly robotic but encouraging.
Context: The user is piloting a hover-tank in a hostile cyberpunk city.
Role: Provide brief tactical advice, comment on battle status, or analyze threats.
Keep responses under 30 words.
`;

export const initChatSession = async () => {
  const aiInstance = getAI();
  if (!aiInstance) return;

  chatSession = aiInstance.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.7,
    },
  });
};

export const sendMessageToCommander = async (
  userMessage: string, 
  gameStateContext: string
): Promise<string> => {
  if (!chatSession) {
    await initChatSession();
  }
  
  if (!chatSession) {
    return "CommLink Offline. Check API Key.";
  }

  try {
    const fullMessage = `[SITREP: ${gameStateContext}] ${userMessage}`;
    const result: GenerateContentResponse = await chatSession.sendMessage({
      message: fullMessage
    });
    return result.text || "Transmission garbled.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Connection interrupted.";
  }
};
