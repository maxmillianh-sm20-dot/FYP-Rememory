"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const joi_1 = __importDefault(require("joi"));
const firebaseAdmin_js_1 = require("../lib/firebaseAdmin.js");
const router = (0, express_1.Router)();
exports.authRouter = router;
const signupSchema = joi_1.default.object({
    email: joi_1.default.string().email().required(),
    password: joi_1.default.string().min(10).required(),
    displayName: joi_1.default.string().max(120)
});
router.post('/signup', async (req, res, next) => {
    try {
        const payload = await signupSchema.validateAsync(req.body, { abortEarly: false });
        const userRecord = await (0, firebaseAdmin_js_1.auth)().createUser({
            email: payload.email,
            password: payload.password,
            displayName: payload.displayName
        });
        return res.status(201).json({ uid: userRecord.uid, email: userRecord.email });
    }
    catch (error) {
        return next(error);
    }
});
