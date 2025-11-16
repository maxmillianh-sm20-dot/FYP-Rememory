"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeRemainingMs = exports.setTimerIfNeeded = void 0;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const firebaseAdmin_js_1 = require("../lib/firebaseAdmin.js");
const PERSONAS_COLLECTION = 'personas';
const setTimerIfNeeded = async (personaId) => {
    const db = (0, firebaseAdmin_js_1.firestore)();
    const personaRef = db.collection(PERSONAS_COLLECTION).doc(personaId);
    await db.runTransaction(async (transaction) => {
        const doc = await transaction.get(personaRef);
        if (!doc.exists) {
            throw Object.assign(new Error('Persona not found'), { status: 404, code: 'persona_not_found' });
        }
        const data = doc.data();
        if (data.startedAt)
            return;
        const now = Date.now();
        const startedAt = firebase_admin_1.default.firestore.FieldValue.serverTimestamp();
        const expiresAt = firebase_admin_1.default.firestore.Timestamp.fromMillis(now + 30 * 24 * 60 * 60 * 1000);
        transaction.update(personaRef, { startedAt, expiresAt, status: 'active' });
    });
};
exports.setTimerIfNeeded = setTimerIfNeeded;
const computeRemainingMs = (expiresAt) => {
    if (!expiresAt)
        return null;
    return Math.max(0, expiresAt.toMillis() - Date.now());
};
exports.computeRemainingMs = computeRemainingMs;
