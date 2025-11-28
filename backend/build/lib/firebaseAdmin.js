"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auth = exports.firestore = exports.initializeFirebaseApp = void 0;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
let app = null;
const initializeFirebaseApp = () => {
    if (app)
        return app;
    const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, GOOGLE_APPLICATION_CREDENTIALS, FIREBASE_DATABASE_URL } = process.env;
    // Prefer explicit service-account fields when present; otherwise fall back to ADC via GOOGLE_APPLICATION_CREDENTIALS.
    if (FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY) {
        const serviceAccount = {
            projectId: FIREBASE_PROJECT_ID,
            clientEmail: FIREBASE_CLIENT_EMAIL,
            privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        };
        app = firebase_admin_1.default.initializeApp({
            credential: firebase_admin_1.default.credential.cert(serviceAccount),
            databaseURL: FIREBASE_DATABASE_URL
        });
    }
    else if (GOOGLE_APPLICATION_CREDENTIALS) {
        app = firebase_admin_1.default.initializeApp({
            credential: firebase_admin_1.default.credential.applicationDefault(),
            databaseURL: FIREBASE_DATABASE_URL
        });
    }
    else {
        throw new Error('Missing Firebase environment variables (set FIREBASE_* or GOOGLE_APPLICATION_CREDENTIALS).');
    }
    return app;
};
exports.initializeFirebaseApp = initializeFirebaseApp;
const firestore = () => {
    if (!app) {
        (0, exports.initializeFirebaseApp)();
    }
    return firebase_admin_1.default.firestore();
};
exports.firestore = firestore;
const auth = () => {
    if (!app) {
        (0, exports.initializeFirebaseApp)();
    }
    return firebase_admin_1.default.auth();
};
exports.auth = auth;
