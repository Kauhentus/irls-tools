import vectors from 'wink-embeddings-sg-100d';
import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8070 });
console.log('starting websocket server...');

wss.on('connection', (ws) => {
    console.log('client connected');

    ws.on('error', console.error);

    ws.on('message', (data) => {
        const requested_words = JSON.parse(data.toString()) as string[];
        const requested_vectors = requested_words.map(word => vectors.vectors[word]);
        // const requested_vectors = requested_words;

        const encoded_data = JSON.stringify(requested_vectors);
        ws.send(encoded_data);
    });
});