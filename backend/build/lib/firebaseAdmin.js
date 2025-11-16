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
    const serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    };
    app = firebase_admin_1.default.initializeApp({
        credential: firebase_admin_1.default.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL
    });
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
