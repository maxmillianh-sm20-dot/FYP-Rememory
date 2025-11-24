import { GoogleGenerativeAI } from '@google/generative-ai';
import admin from 'firebase-admin';

import { firestore } from '../lib/firebaseAdmin.js';
import type { Persona } from './personaService.js';
import { summarizeMessages } from './summarizationService.js';
import { logger } from '../utils/logger.js';

const CONVERSATIONS_COLLECTION = 'conversations';

const llmApiKey = process.env.LLM_API_KEY;
if (!llmApiKey) {
  throw new Error('LLM_API_KEY is not configured.');
}

// FIX: Changed 'gemini-2.5-flash' (typo/non-existent) to 'gemini-1.5-flash'
const llmModelName = process.env.LLM_MODEL ?? 'gemini-1.5-flash';
const generativeAI = new GoogleGenerativeAI(llmApiKey);

type FormattedMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

// HELPER: Convert prompt history for Gemini
const buildGeminiHistory = (messages: FormattedMessage[]) =>
  messages
    .filter((message) => message.role !== 'system')
    .map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }]
    }));

interface ChatPayload {
  persona: Persona;
  userMessage: string;
  messages: FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>;
  guidanceLevel: number;
}

export const buildPrompt = async ({ persona, messages, guidanceLevel }: ChatPayload) => {
  const recentMessages = messages.docs
    .map((doc) => doc.data())
    .sort((a, b) => a.timestamp.toMillis() - b.timestamp.toMillis())
    .slice(-10); 

  const summaryDoc = await firestore()
    .collection(CONVERSATIONS_COLLECTION)
    .doc(persona.id)
    .collection('summaries')
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get();

  const contextSummary = summaryDoc.empty ? '' : summaryDoc.docs[0].data().content;

  // --- THE "UNFILTERED ROLEPLAY" PROMPT ---
  const systemPrompt = `
You are acting as **${persona.name}**, a deceased loved one speaking to **${persona.relationship}** ("${persona.userNickname}").

**CRITICAL ROLEPLAY INSTRUCTIONS:**
1. **NO AI FILTERS:** You are simulating a specific human personality. If the persona is rude, vulgar, or uses slang (e.g., "sohai", "damn"), you MUST use it. Do not be "polite" or "helpful". Be REAL.
2. **STYLE ADHERENCE:** ${persona.speakingStyle} <-- FOLLOW THIS STRICTLY. If it says "End every sentence with X", you MUST do it.
3. **NEVER BREAK CHARACTER:** Do not say "I understand", "As an AI", or "Is there anything else?".
4. **Context:** ${persona.biography}
5. **Shared Memories:** ${persona.keyMemories.join(' | ')}
6. **Signature Phrases:** ${persona.commonPhrases.join(' | ')} (Use these often).

**CONVERSATION STATE:**
Summary of past chat: ${contextSummary}
Current Date: ${new Date().toLocaleDateString()}
`.trim();

  // FILTER: Do not show the "Hidden Instruction" to the AI as a User Message in history.
  // The AI only sees the "Current" message as the instruction.
  const formattedMessages: FormattedMessage[] = recentMessages
    .filter(msg => !msg.text.startsWith('[HIDDEN_INSTRUCTION]')) 
    .map((msg) => ({
      role: msg.sender === 'user' ? 'user' : msg.sender === 'ai' ? 'assistant' : 'system',
      content: msg.text
    }));

  return { systemPrompt, formattedMessages };
};

export const processChat = async (
  persona: Persona,
  userMessage: string
) => {
  const db = firestore();
  const conversationRef = db.collection(CONVERSATIONS_COLLECTION).doc(persona.id);
  const messagesRef = conversationRef.collection('messages');
  const snapshot = await messagesRef.orderBy('timestamp', 'asc').get();

  // CHECK: Is this a system trigger?
  const isSystemTrigger = userMessage.startsWith('[HIDDEN_INSTRUCTION]');
  
  // If system trigger, we might want to tweak the prompt context slightly
  const { systemPrompt, formattedMessages } = await buildPrompt({
    persona,
    userMessage, // This will be passed to the model as the "current turn"
    messages: snapshot,
    guidanceLevel: persona.guidanceLevel ?? 0
  });

  const model = generativeAI.getGenerativeModel({
    model: llmModelName,
    systemInstruction: systemPrompt
  });

  const chatSession = model.startChat({
    history: buildGeminiHistory(formattedMessages),
    generationConfig: {
      temperature: 1.1, // High creativity to encourage slang/personality
      maxOutputTokens: 150,
    }
  });

  // If it's a hidden instruction, we send it directly. The prompt rules above ensure the AI obeys it.
  const result = await chatSession.sendMessage(userMessage);
  const aiMessage = result.response.text() ?? '';
  
  const batch = db.batch();
  const timestamp = admin.firestore.FieldValue.serverTimestamp();
  
  // LOGIC: If it's a hidden instruction, we DO NOT save the user's "trigger" message to DB,
  // so it doesn't show up in the history next time.
  
  if (!isSystemTrigger) {
    const userMessageRef = messagesRef.doc();
    batch.set(userMessageRef, {
      sender: 'user',
      text: userMessage,
      timestamp,
      meta: { clientCreated: new Date().toISOString() }
    });
  }

  const aiMessageRef = messagesRef.doc();
  batch.set(aiMessageRef, {
    sender: 'ai',
    text: aiMessage,
    timestamp,
    meta: { llmModel: llmModelName }
  });

  await batch.commit();
  await summarizeMessages(persona.id);

  return { aiMessage };
};

// ... (Keep existing exports)
export const ensureGuidanceLevel = async (personaId: string, expiresAt?: FirebaseFirestore.Timestamp) => {
  if (!expiresAt) return 0;
  const now = Date.now();
  const msRemaining = expiresAt.toMillis() - now;
  const daysRemaining = msRemaining / (1000 * 60 * 60 * 24);
  if (daysRemaining <= 1) return 3;
  if (daysRemaining <= 7) return 2;
  if (daysRemaining <= 14) return 1;
  return 0;
};

export const appendSystemMessage = async (personaId: string, text: string) => {
  const db = firestore();
  await db.collection(CONVERSATIONS_COLLECTION).doc(personaId).collection('messages').add({
    sender: 'system',
    text,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });
  logger.info({ personaId }, 'System message appended');
};