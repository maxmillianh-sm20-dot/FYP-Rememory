"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const logger_js_1 = require("../utils/logger.js");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const errorHandler = (err, _req, res, _next) => {
    logger_js_1.logger.error({ err }, 'Unhandled error');
    const status = err.status ?? 500;
    return res.status(status).json({
        error: {
            code: err.code ?? 'internal_error',
            message: err.message ?? 'An unexpected error occurred'
        }
    });
};
exports.errorHandler = errorHandler;
