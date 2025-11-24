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

const llmModelName = process.env.LLM_MODEL ?? 'gemini-2.5-flash';
const generativeAI = new GoogleGenerativeAI(llmApiKey);

type FormattedMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

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
    .slice(-10); // Tighter context

  const summaryDoc = await firestore()
    .collection(CONVERSATIONS_COLLECTION)
    .doc(persona.id)
    .collection('summaries')
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get();

  const contextSummary = summaryDoc.empty ? '' : summaryDoc.docs[0].data().content;

  // --- THE "HUMAN & RELEVANT" PROMPT ---
  const systemPrompt = `
You are acting as **${persona.name}**, a deceased loved one speaking to **${persona.relationship}** ("${persona.userNickname}").

**YOUR PROFILE:**
- **Tone:** ${persona.speakingStyle} (Follow this style exactly).
- **Context:** ${persona.biography}
- **Shared Memories:** ${persona.keyMemories.join(' | ')}

**CONVERSATION RULES:**
1. **STAY ON TOPIC:** Answer the user's latest message directly. Do not drift into random memories unless relevant to what they just said.
2. **USE THE NICKNAME:** Start or end your response with "${persona.userNickname}" naturally.
3. **BE WARM BUT REAL:** You are not an AI assistant. You are family. Do not say "How can I help?". Say "Tell me more" or "I remember that too."
4. **SHORT REPLIES:** Keep it under 3 sentences unless telling a story.
5. **NO ROBOT SPEAK:** BANNED PHRASES: "As an AI", "I understand", "I am here for you", "Is there anything else".

**SAFETY CHECK:**
If the user threatens self-harm, break character immediately and say: "Please, my dear, reach out to a professional. I want you safe."

Summary of past chat: ${contextSummary}
Current Date: ${new Date().toLocaleDateString()}
`.trim();

  const formattedMessages: FormattedMessage[] = recentMessages.map((msg) => ({
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

  const { systemPrompt, formattedMessages } = await buildPrompt({
    persona,
    userMessage,
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
      temperature: 0.9, // Lower temperature = Less "Dumb/Random" replies
      maxOutputTokens: 150, // Shorter = More conversational
    }
  });

  const result = await chatSession.sendMessage(userMessage);
  const aiMessage = result.response.text() ?? '';
  
  const batch = db.batch();
  const timestamp = admin.firestore.FieldValue.serverTimestamp();
  const userMessageRef = messagesRef.doc();
  const aiMessageRef = messagesRef.doc();

  batch.set(userMessageRef, {
    sender: 'user',
    text: userMessage,
    timestamp,
    meta: { clientCreated: new Date().toISOString() }
  });

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