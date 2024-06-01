"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.word_embeddings_test = void 0;
const ws_1 = __importDefault(require("ws"));
const word_embeddings_test = () => {
    const ws = new ws_1.default('ws://127.0.0.1:8070/');
    ws.on('error', console.error);
    ws.on('open', () => {
        ws.send(JSON.stringify([
            'apple',
            'banana',
            'orange'
        ]));
    });
    ws.on('message', (data) => {
        console.log('received: %s', data);
    });
};
exports.word_embeddings_test = word_embeddings_test;
