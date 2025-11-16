"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runPersonaExpirationJob = void 0;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const firebaseAdmin_js_1 = require("../lib/firebaseAdmin.js");
const notificationService_js_1 = require("../services/notificationService.js");
const logger_js_1 = require("../utils/logger.js");
const PERSONAS_COLLECTION = 'personas';
const runPersonaExpirationJob = async () => {
    const db = (0, firebaseAdmin_js_1.firestore)();
    const now = Date.now();
    const soonQuery = await db
        .collection(PERSONAS_COLLECTION)
        .where('status', '==', 'active')
        .where('expiresAt', '<=', firebase_admin_1.default.firestore.Timestamp.fromMillis(now + 3 * 24 * 60 * 60 * 1000))
        .get();
    for (const doc of soonQuery.docs) {
        const persona = doc.data();
        const expiresAt = persona.expiresAt?.toDate().getTime() ?? 0;
        const msRemaining = expiresAt - now;
        if (msRemaining <= 0) {
            await doc.ref.update({ status: 'expired' });
            await (0, notificationService_js_1.sendEmailNotification)(persona.ownerId, doc.id, 'expired', persona.name);
            logger_js_1.logger.info({ personaId: doc.id }, 'Persona expired');
        }
        else if (msRemaining <= 3 * 24 * 60 * 60 * 1000 && !persona.reminderSent) {
            await doc.ref.update({ reminderSent: true });
            await (0, notificationService_js_1.sendEmailNotification)(persona.ownerId, doc.id, '3day_reminder', persona.name);
            logger_js_1.logger.info({ personaId: doc.id }, 'Reminder email sent');
        }
    }
};
exports.runPersonaExpirationJob = runPersonaExpirationJob;
