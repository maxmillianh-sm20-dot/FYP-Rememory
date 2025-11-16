"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimit = void 0;
const rate_limiter_flexible_1 = require("rate-limiter-flexible");
const rateLimiter = new rate_limiter_flexible_1.RateLimiterMemory({
    keyPrefix: 'rl',
    points: Number(process.env.RATE_LIMIT_MAX_REQUESTS ?? 12),
    duration: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60000) / 1000
});
const rateLimit = async (req, res, next) => {
    try {
        const key = req.ip ?? 'global';
        await rateLimiter.consume(key);
        return next();
    }
    catch (error) {
        return res.status(429).json({
            error: {
                code: 'rate_limited',
                message: 'Too many requests. Please slow down.'
            }
        });
    }
};
exports.rateLimit = rateLimit;
