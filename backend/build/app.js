"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const pino_http_1 = __importDefault(require("pino-http"));
const authRoutes_js_1 = require("./routes/authRoutes.js");
const personaRoutes_js_1 = require("./routes/personaRoutes.js");
const chatRoutes_js_1 = require("./routes/chatRoutes.js");
const errorHandler_js_1 = require("./middleware/errorHandler.js");
const authMiddleware_js_1 = require("./middleware/authMiddleware.js");
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL?.split(',') ?? ['http://localhost:5173'],
    credentials: true
}));
app.use(express_1.default.json({ limit: '1mb' }));
app.use((0, pino_http_1.default)());
app.use('/api/auth', authRoutes_js_1.authRouter);
app.use('/api/persona', authMiddleware_js_1.authenticate, personaRoutes_js_1.personaRouter);
app.use('/api/persona', authMiddleware_js_1.authenticate, chatRoutes_js_1.chatRouter);
app.use(errorHandler_js_1.errorHandler);
exports.default = app;
