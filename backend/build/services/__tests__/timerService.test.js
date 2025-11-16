"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const timerService_js_1 = require("../timerService.js");
describe('computeRemainingMs', () => {
    it('returns null when expiresAt missing', () => {
        expect((0, timerService_js_1.computeRemainingMs)(null)).toBeNull();
    });
    it('returns non-negative milliseconds remaining', () => {
        const expiresAt = {
            toMillis: () => Date.now() + 1000
        };
        expect((0, timerService_js_1.computeRemainingMs)(expiresAt)).toBeGreaterThanOrEqual(0);
    });
});
