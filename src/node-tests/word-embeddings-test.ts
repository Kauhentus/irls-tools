import WebSocket from 'ws';

export const word_embeddings_test = () => {
    const ws = new WebSocket('ws://127.0.0.1:8070/');

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
}