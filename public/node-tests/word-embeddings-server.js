"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const wink_embeddings_sg_100d_1 = __importDefault(require("wink-embeddings-sg-100d"));
const ws_1 = require("ws");
const wss = new ws_1.WebSocketServer({ port: 8070 });
console.log('starting websocket server...');
wss.on('connection', (ws) => {
    console.log('client connected');
    ws.on('error', console.error);
    ws.on('message', (data) => {
        const requested_words = JSON.parse(data.toString());
        const requested_vectors = requested_words.map(word => wink_embeddings_sg_100d_1.default.vectors[word]);
        // const requested_vectors = requested_words;
        const encoded_data = JSON.stringify(requested_vectors);
        ws.send(encoded_data);
    });
});
