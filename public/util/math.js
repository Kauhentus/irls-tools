"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clamp = void 0;
const clamp = (value, min, max) => {
    return Math.max(Math.min(value, max), min);
};
exports.clamp = clamp;
