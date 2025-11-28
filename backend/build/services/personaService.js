"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletePersonaCascade = exports.markPersonaStarted = exports.updatePersona = exports.createPersona = exports.getPersonaByOwner = void 0;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const firebaseAdmin_js_1 = require("../lib/firebaseAdmin.js");
const PERSONAS_COLLECTION = 'personas';
const CONVERSATIONS_COLLECTION = 'conversations';
const getPersonaByOwner = async (ownerId) => {
    const snapshot = await (0, firebaseAdmin_js_1.firestore)()
        .collection(PERSONAS_COLLECTION)
        .where('ownerId', '==', ownerId)
        .where('status', '!=', 'deleted')
        .limit(1)
        .get();
    if (snapshot.empty)
        return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
};
exports.getPersonaByOwner = getPersonaByOwner;
const createPersona = async (ownerId, data) => {
    const existing = await (0, exports.getPersonaByOwner)(ownerId);
    if (existing) {
        throw Object.assign(new Error('Persona already exists'), { status: 400, code: 'persona_exists' });
    }
    const docRef = await (0, firebaseAdmin_js_1.firestore)().collection(PERSONAS_COLLECTION).add({
        ...data,
        ownerId,
        status: 'active',
        createdAt: firebase_admin_1.default.firestore.FieldValue.serverTimestamp()
    });
    return docRef.id;
};
exports.createPersona = createPersona;
const updatePersona = async (personaId, ownerId, updates) => {
    const docRef = (0, firebaseAdmin_js_1.firestore)().collection(PERSONAS_COLLECTION).doc(personaId);
    const doc = await docRef.get();
    if (!doc.exists || doc.data()?.ownerId !== ownerId) {
        throw Object.assign(new Error('Persona not found'), { status: 404, code: 'persona_not_found' });
    }
    // SECURITY: Prevent changing identity fields during an update
    if (updates.name || updates.relationship) {
        throw Object.assign(new Error('Cannot edit identity fields (Name/Relationship) to preserve immersion.'), { status: 400, code: 'identity_locked' });
    }
    await docRef.update(updates);
};
exports.updatePersona = updatePersona;
const markPersonaStarted = async (personaId) => {
    const docRef = (0, firebaseAdmin_js_1.firestore)().collection(PERSONAS_COLLECTION).doc(personaId);
    await (0, firebaseAdmin_js_1.firestore)().runTransaction(async (transaction) => {
        const doc = await transaction.get(docRef);
        if (!doc.exists) {
            throw Object.assign(new Error('Persona not found'), { status: 404, code: 'persona_not_found' });
        }
        const data = doc.data();
        if (data.startedAt)
            return;
        const startedAt = firebase_admin_1.default.firestore.FieldValue.serverTimestamp();
        const expiresAt = firebase_admin_1.default.firestore.Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000);
        transaction.update(docRef, { startedAt, expiresAt, guidanceLevel: 0 });
    });
};
exports.markPersonaStarted = markPersonaStarted;
const deletePersonaCascade = async (personaId, ownerId) => {
    const db = (0, firebaseAdmin_js_1.firestore)();
    const personaRef = db.collection(PERSONAS_COLLECTION).doc(personaId);
    const personaDoc = await personaRef.get();
    if (!personaDoc.exists || personaDoc.data()?.ownerId !== ownerId) {
        throw Object.assign(new Error('Persona not found'), { status: 404, code: 'persona_not_found' });
    }
    await db.runTransaction(async (transaction) => {
        transaction.delete(personaRef);
    });
    const messagesQuery = await db.collection(CONVERSATIONS_COLLECTION).doc(personaId).collection('messages').get();
    const batch = db.batch();
    messagesQuery.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    await db.collection(CONVERSATIONS_COLLECTION).doc(personaId).delete();
};
exports.deletePersonaCascade = deletePersonaCascade;
