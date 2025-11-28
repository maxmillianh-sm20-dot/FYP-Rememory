"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.personaRouter = void 0;
const express_1 = require("express");
const joi_1 = __importDefault(require("joi"));
const personaService_js_1 = require("../services/personaService.js");
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const timerService_js_1 = require("../services/timerService.js");
const firebaseAdmin_js_1 = require("../lib/firebaseAdmin.js");
const router = (0, express_1.Router)();
exports.personaRouter = router;
const editableFieldsCreate = {
    userNickname: joi_1.default.string().max(120).allow('').required(),
    biography: joi_1.default.string().max(4000).allow('').required(),
    speakingStyle: joi_1.default.string().max(4000).allow('').required(),
    traits: joi_1.default.array().items(joi_1.default.string()).max(8).required(),
    keyMemories: joi_1.default.array().items(joi_1.default.string()).max(10).required(),
    commonPhrases: joi_1.default.array().items(joi_1.default.string()).max(10).required(),
    voiceSampleUrl: joi_1.default.string().uri().allow('', null).optional()
};
const editableFieldsUpdate = {
    userNickname: joi_1.default.string().max(120).allow(''),
    biography: joi_1.default.string().max(4000).allow(''),
    speakingStyle: joi_1.default.string().max(4000).allow(''),
    traits: joi_1.default.array().items(joi_1.default.string()).max(8),
    keyMemories: joi_1.default.array().items(joi_1.default.string()).max(10),
    commonPhrases: joi_1.default.array().items(joi_1.default.string()).max(10),
    voiceSampleUrl: joi_1.default.string().uri().allow('', null)
};
const createPersonaSchema = joi_1.default.object({
    name: joi_1.default.string().max(120).required(),
    relationship: joi_1.default.string().max(120).required(),
    ...editableFieldsCreate
});
const updatePersonaSchema = joi_1.default.object({
    name: joi_1.default.forbidden(),
    relationship: joi_1.default.forbidden(),
    ...editableFieldsUpdate
}).min(1);
router.get('/', async (req, res, next) => {
    try {
        const persona = await (0, personaService_js_1.getPersonaByOwner)(req.user.uid);
        if (!persona) {
            return res.status(200).json(null);
        }
        const remainingMs = (0, timerService_js_1.computeRemainingMs)(persona.expiresAt ?? null);
        return res.json({
            id: persona.id,
            name: persona.name,
            relationship: persona.relationship,
            userNickname: persona.userNickname ?? '',
            biography: persona.biography ?? '',
            speakingStyle: persona.speakingStyle ?? '',
            status: persona.status,
            expiresAt: persona.expiresAt?.toDate().toISOString() ?? null,
            remainingMs,
            traits: persona.traits ?? [],
            keyMemories: persona.keyMemories ?? [],
            commonPhrases: persona.commonPhrases ?? [],
            voiceSampleUrl: persona.voiceSampleUrl ?? null,
            guidanceLevel: persona.guidanceLevel ?? 0
        });
    }
    catch (error) {
        return next(error);
    }
});
router.post('/', async (req, res, next) => {
    try {
        const payload = await createPersonaSchema.validateAsync(req.body, { abortEarly: false });
        const personaId = await (0, personaService_js_1.createPersona)(req.user.uid, payload);
        return res.status(201).json({ id: personaId });
    }
    catch (error) {
        return next(error);
    }
});
router.put('/:personaId', async (req, res, next) => {
    try {
        const payload = await updatePersonaSchema.validateAsync(req.body, { abortEarly: false });
        await (0, personaService_js_1.updatePersona)(req.params.personaId, req.user.uid, payload);
        return res.status(204).send();
    }
    catch (error) {
        return next(error);
    }
});
router.post('/:personaId/start', async (req, res, next) => {
    try {
        await (0, timerService_js_1.setTimerIfNeeded)(req.params.personaId);
        return res.status(204).send();
    }
    catch (error) {
        return next(error);
    }
});
const deleteSchema = joi_1.default.object({
    confirmation: joi_1.default.string().required()
});
const CONFIRMATION_SENTENCE = 'I understand this will permanently delete my persona and messages.';
router.delete('/:personaId', async (req, res, next) => {
    try {
        const { confirmation } = await deleteSchema.validateAsync(req.body);
        if (confirmation !== CONFIRMATION_SENTENCE) {
            return res.status(400).json({
                error: {
                    code: 'confirmation_mismatch',
                    message: 'Confirmation sentence mismatch.'
                }
            });
        }
        await (0, firebaseAdmin_js_1.firestore)()
            .collection('audit/deletionRequests')
            .add({
            userId: req.user.uid,
            personaId: req.params.personaId,
            confirmationText: confirmation,
            type: 'persona',
            createdAt: firebase_admin_1.default.firestore.FieldValue.serverTimestamp()
        });
        await (0, personaService_js_1.deletePersonaCascade)(req.params.personaId, req.user.uid);
        return res.status(204).send();
    }
    catch (error) {
        return next(error);
    }
});
