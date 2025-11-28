"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatRouter = void 0;
const node_crypto_1 = require("node:crypto");
const express_1 = require("express");
const joi_1 = __importDefault(require("joi"));
const rateLimit_js_1 = require("../middleware/rateLimit.js");
const firebaseAdmin_js_1 = require("../lib/firebaseAdmin.js");
const personaService_js_1 = require("../services/personaService.js");
const chatService_js_1 = require("../services/chatService.js");
const timerService_js_1 = require("../services/timerService.js");
const router = (0, express_1.Router)();
exports.chatRouter = router;
const messagesSchema = joi_1.default.object({
    text: joi_1.default.string().max(1000).required(),
    clientMessageId: joi_1.default.string().uuid().required()
});
router.get('/:personaId/chat', async (req, res, next) => {
    try {
        const persona = await (0, personaService_js_1.getPersonaByOwner)(req.user.uid);
        if (!persona || persona.id !== req.params.personaId) {
            return res.status(404).json({ error: { code: 'persona_not_found', message: 'Persona not found' } });
        }
        const snapshot = await (0, firebaseAdmin_js_1.firestore)()
            .collection('conversations')
            .doc(persona.id)
            .collection('messages')
            .orderBy('timestamp', 'asc')
            .limit(Number(req.query.limit ?? 25))
            .get();
        const messages = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate().toISOString() ?? new Date().toISOString()
        }));
        return res.json({ messages });
    }
    catch (error) {
        return next(error);
    }
});
router.post('/:personaId/chat', rateLimit_js_1.rateLimit, async (req, res, next) => {
    try {
        const payload = await messagesSchema.validateAsync(req.body, { abortEarly: false });
        let persona = await (0, personaService_js_1.getPersonaByOwner)(req.user.uid);
        if (!persona || persona.id !== req.params.personaId) {
            return res.status(404).json({ error: { code: 'persona_not_found', message: 'Persona not found' } });
        }
        if (persona.status === 'expired') {
            return res.status(410).json({ error: { code: 'persona_expired', message: 'This persona has reached the end of its session.' } });
        }
        await (0, timerService_js_1.setTimerIfNeeded)(persona.id);
        // Refresh persona after potential timer update
        persona = await (0, personaService_js_1.getPersonaByOwner)(req.user.uid) ?? persona;
        if (persona.status === 'expired') {
            return res.status(410).json({ error: { code: 'persona_expired', message: 'This persona has reached the end of its session.' } });
        }
        const aiResponse = await (0, chatService_js_1.processChat)(persona, payload.text);
        const refreshedGuidance = await (0, chatService_js_1.ensureGuidanceLevel)(persona.id, persona.expiresAt);
        if (refreshedGuidance !== persona.guidanceLevel) {
            await (0, firebaseAdmin_js_1.firestore)().collection('personas').doc(persona.id).update({ guidanceLevel: refreshedGuidance });
            if (refreshedGuidance >= 2) {
                await (0, chatService_js_1.appendSystemMessage)(persona.id, 'Guided closure reminder: take a moment to reflect on a cherished memory together.');
            }
        }
        const messages = [
            {
                id: payload.clientMessageId,
                sender: 'user',
                text: payload.text,
                timestamp: new Date().toISOString()
            },
            {
                id: (0, node_crypto_1.randomUUID)(),
                sender: 'ai',
                text: aiResponse.aiMessage,
                timestamp: new Date().toISOString(),
                meta: { llmTokens: undefined }
            }
        ];
        const remainingMs = (0, timerService_js_1.computeRemainingMs)(persona.expiresAt ?? null);
        return res.json({
            personaStatus: persona.status,
            remainingMs,
            messages,
            summaryAppended: false
        });
    }
    catch (error) {
        return next(error);
    }
});
