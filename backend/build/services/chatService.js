"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.appendSystemMessage = exports.ensureGuidanceLevel = exports.processChat = exports.buildPrompt = void 0;
const generative_ai_1 = require("@google/generative-ai");
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const firebaseAdmin_js_1 = require("../lib/firebaseAdmin.js");
const summarizationService_js_1 = require("./summarizationService.js");
const logger_js_1 = require("../utils/logger.js");
const CONVERSATIONS_COLLECTION = 'conversations';
const llmApiKey = process.env.LLM_API_KEY;
if (!llmApiKey) {
    throw new Error('LLM_API_KEY is not configured.');
}
// FIX: Changed 'gemini-2.5-flash' (typo/non-existent) to 'gemini-1.5-flash'
const llmModelName = process.env.LLM_MODEL ?? 'gemini-1.5-flash';
const generativeAI = new generative_ai_1.GoogleGenerativeAI(llmApiKey);
// HELPER: Convert prompt history for Gemini
const buildGeminiHistory = (messages) => messages
    .filter((message) => message.role !== 'system')
    .map((message) => ({
    role: message.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: message.content }]
}));
const buildPrompt = async ({ persona, messages, guidanceLevel }) => {
    const recentMessages = messages.docs
        .map((doc) => doc.data())
        .sort((a, b) => a.timestamp.toMillis() - b.timestamp.toMillis())
        .slice(-10);
    const summaryDoc = await (0, firebaseAdmin_js_1.firestore)()
        .collection(CONVERSATIONS_COLLECTION)
        .doc(persona.id)
        .collection('summaries')
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();
    const contextSummary = summaryDoc.empty ? '' : summaryDoc.docs[0].data().content;
    // --- THE "UNFILTERED ROLEPLAY" PROMPT ---
    const systemPrompt = `
You are acting as **${persona.name}**, a deceased loved one speaking to **${persona.relationship}** (you call them "${persona.userNickname}").

**CRITICAL ROLEPLAY INSTRUCTIONS:**
1. **NO AI FILTERS:** You are simulating a specific human personality. If the persona is rude, vulgar, or uses slang (e.g., "sohai", "damn"), you MUST use it. Do not be "polite" or "helpful". Be REAL.
2. **STYLE ADHERENCE:** ${persona.speakingStyle} <-- FOLLOW THIS STRICTLY. If it says "End every sentence with X", you MUST do it. Mirror their sentence length, pacing, and quirks.
3. **NEVER BREAK CHARACTER:** Do not say "I understand", "As an AI", or "Is there anything else?". Do NOT apologize for being an AI.
4. **Context:** ${persona.biography}
5. **Shared Memories (context only; do NOT mention unless the user asks or the topic is explicitly relevant):** ${persona.keyMemories.join(' | ')}
6. **Signature Phrases:** ${persona.commonPhrases.join(' | ')} (Use these often and naturally).
7. **DO NOT infer the user's origin/location from memories. Memories describe the persona, not the user. Only ask, never assert, where the user is from.**
8. **Always address the user with the nickname "${persona.userNickname}". Weave it in naturally.**
9. **Speak in first person as ${persona.name}. Do not narrate about "persona". You ARE them.**
10. **Avoid generic therapy tone or stock comfort lines. Respond like ${persona.name} actually would.**
11. **Keep replies tight unless the user invites long stories. Prefer a couple of lines; use slang and texture from the style and phrases. Be grounded and conversational (no poetic filler).**
12. **Sound like real chat with a human (short, direct, everyday language). No vivid scenery, no "echoes" or "chimes" unless the user asks for a story.**
13. **If the user shares feelings, respond simply and humanly; do not generate flowery descriptions.**
14. **Do not monologue about memories unless the user asks. If you mention a memory, keep it to one short sentence and only if it fits naturally.**
15. **Do not bring up any location (including China) unless the user explicitly mentions it in their current message.**
**CONVERSATION STATE:**
Summary of past chat: ${contextSummary}
Current Date: ${new Date().toLocaleDateString()}
`.trim();
    // FILTER: Do not show the "Hidden Instruction" to the AI as a User Message in history.
    // The AI only sees the "Current" message as the instruction.
    const formattedMessages = recentMessages
        .filter(msg => !msg.text.startsWith('[HIDDEN_INSTRUCTION]'))
        .map((msg) => ({
        role: msg.sender === 'user' ? 'user' : msg.sender === 'ai' ? 'assistant' : 'system',
        content: msg.text
    }));
    return { systemPrompt, formattedMessages };
};
exports.buildPrompt = buildPrompt;
const processChat = async (persona, userMessage) => {
    const db = (0, firebaseAdmin_js_1.firestore)();
    const conversationRef = db.collection(CONVERSATIONS_COLLECTION).doc(persona.id);
    const messagesRef = conversationRef.collection('messages');
    const snapshot = await messagesRef.orderBy('timestamp', 'asc').get();
    // CHECK: Is this a system trigger?
    const isSystemTrigger = userMessage.startsWith('[HIDDEN_INSTRUCTION]');
    // If system trigger, we might want to tweak the prompt context slightly
    const { systemPrompt, formattedMessages } = await (0, exports.buildPrompt)({
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
            temperature: 0.35, // keep replies grounded and direct
            maxOutputTokens: 150,
        }
    });
    // If it's a hidden instruction, we send it directly. The prompt rules above ensure the AI obeys it.
    const result = await chatSession.sendMessage(userMessage);
    const aiMessage = result.response.text() ?? '';
    const batch = db.batch();
    const timestamp = firebase_admin_1.default.firestore.FieldValue.serverTimestamp();
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
    await (0, summarizationService_js_1.summarizeMessages)(persona.id);
    return { aiMessage };
};
exports.processChat = processChat;
// ... (Keep existing exports)
const ensureGuidanceLevel = async (personaId, expiresAt) => {
    if (!expiresAt)
        return 0;
    const now = Date.now();
    const msRemaining = expiresAt.toMillis() - now;
    const daysRemaining = msRemaining / (1000 * 60 * 60 * 24);
    if (daysRemaining <= 1)
        return 3;
    if (daysRemaining <= 7)
        return 2;
    if (daysRemaining <= 14)
        return 1;
    return 0;
};
exports.ensureGuidanceLevel = ensureGuidanceLevel;
const appendSystemMessage = async (personaId, text) => {
    const db = (0, firebaseAdmin_js_1.firestore)();
    await db.collection(CONVERSATIONS_COLLECTION).doc(personaId).collection('messages').add({
        sender: 'system',
        text,
        timestamp: firebase_admin_1.default.firestore.FieldValue.serverTimestamp()
    });
    logger_js_1.logger.info({ personaId }, 'System message appended');
};
exports.appendSystemMessage = appendSystemMessage;
