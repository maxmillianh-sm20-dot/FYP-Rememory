"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.summarizeMessages = void 0;
const generative_ai_1 = require("@google/generative-ai");
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const firebaseAdmin_js_1 = require("../lib/firebaseAdmin.js");
const CONVERSATIONS_COLLECTION = 'conversations';
const llmApiKey = process.env.LLM_API_KEY;
if (!llmApiKey) {
    throw new Error('LLM_API_KEY is not configured. Add your Google AI Studio key to the environment.');
}
const llmModelName = process.env.LLM_MODEL ?? 'gemini-2.5-flash';
const generativeAI = new generative_ai_1.GoogleGenerativeAI(llmApiKey);
const summarizeMessages = async (personaId) => {
    const db = (0, firebaseAdmin_js_1.firestore)();
    const messagesRef = db.collection(CONVERSATIONS_COLLECTION).doc(personaId).collection('messages');
    const messagesSnapshot = await messagesRef.orderBy('timestamp', 'asc').get();
    if (messagesSnapshot.size <= 300)
        return false;
    const messages = messagesSnapshot.docs.slice(0, 200).map((doc) => doc.data());
    const transcript = messages.map((msg) => `${msg.sender.toUpperCase()}: ${msg.text}`).join('\n');
    const prompt = `
You are assisting a grief-support simulation platform. Summarize the following conversation in fewer than 200 words.
Capture the emotional themes, coping progress, and any commitments made by the user. Do not invent details.

Conversation transcript:
${transcript}
`.trim();
    const model = generativeAI.getGenerativeModel({ model: llmModelName });
    const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 400
        }
    });
    const content = result.response.text() ?? '';
    await db
        .collection(CONVERSATIONS_COLLECTION)
        .doc(personaId)
        .collection('summaries')
        .add({
        content,
        createdAt: firebase_admin_1.default.firestore.FieldValue.serverTimestamp()
    });
    const batch = db.batch();
    messagesSnapshot.docs.slice(0, 150).forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    return true;
};
exports.summarizeMessages = summarizeMessages;
