"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const firebaseAdmin_js_1 = require("../lib/firebaseAdmin.js");
const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: { code: 'unauthorized', message: 'Missing authentication token' } });
    }
    const token = authHeader.replace('Bearer ', '');
    const devToken = process.env.DEV_STATIC_BEARER?.trim();
    if (devToken && token === devToken) {
        req.user = {
            uid: 'dev-static-user',
            email: 'dev@rememory.local',
        };
        return next();
    }
    try {
        const decoded = await (0, firebaseAdmin_js_1.auth)().verifyIdToken(token);
        req.user = { uid: decoded.uid, email: decoded.email };
        return next();
    }
    catch (error) {
        return res.status(401).json({ error: { code: 'invalid_token', message: 'Could not verify credentials' } });
    }
};
exports.authenticate = authenticate;
