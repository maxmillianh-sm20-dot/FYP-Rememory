"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmailNotification = void 0;
const axios_1 = __importDefault(require("axios"));
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const firebaseAdmin_js_1 = require("../lib/firebaseAdmin.js");
const logger_js_1 = require("../utils/logger.js");
const NOTIFICATIONS_COLLECTION = 'notifications';
const EMAIL_TEMPLATES = {
    reminder: {
        subject: 'Rememory — 3 days left with your persona',
        body: `You have 3 days remaining with your persona on Rememory. Remember this is a temporary, supportive tool. If you'd like a copy of your conversation transcript, please download it from your dashboard before the session ends.`
    },
    expiry: (personaName) => ({
        subject: 'Rememory — Your persona session has ended',
        body: `Your Rememory session for ${personaName} has ended. The chat is now closed. If you need additional support, please contact a grief counselor. Thank you for using Rememory.`
    })
};
const sendEmailNotification = async (userId, personaId, type, personaName) => {
    const db = (0, firebaseAdmin_js_1.firestore)();
    const notificationRef = db.collection(NOTIFICATIONS_COLLECTION).doc();
    const payload = type === '3day_reminder'
        ? EMAIL_TEMPLATES.reminder
        : EMAIL_TEMPLATES.expiry(personaName);
    await axios_1.default.post(process.env.EMAIL_WEBHOOK_URL ?? 'https://api.sendgrid.com/v3/mail/send', {
        personalizations: [{ to: [{ email: 'placeholder@example.com' }] }],
        from: { email: process.env.EMAIL_FROM ?? 'no-reply@rememory.app' },
        subject: payload.subject,
        content: [{ type: 'text/plain', value: payload.body }]
    }, {
        headers: {
            Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
            'Content-Type': 'application/json'
        }
    });
    await notificationRef.set({
        userId,
        personaId,
        type,
        sentAt: firebase_admin_1.default.firestore.FieldValue.serverTimestamp(),
        delivered: true
    });
    logger_js_1.logger.info({ userId, personaId, type }, 'Notification dispatched');
};
exports.sendEmailNotification = sendEmailNotification;
