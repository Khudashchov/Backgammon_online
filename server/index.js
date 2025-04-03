const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let gameState = [];
let playersReady = 0;

app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/Backgammon.html'));
});

io.on('connection', (socket) => {
    console.log('New client connected: ', socket.id);

    socket.emit('updateGameState', gameState);

    socket.on('playerReady', () => {
        playersReady += 1;
        console.log(`Player ${socket.id} is ready`);

        if (playersReady === 2) {
            io.emit('startGame');
            playersReady = 0;
        }
    });

    socket.on('movePiece', ({ id, left, bottom }) => {
        console.log(`Move piece received: ${id}, left: ${left}, bottom: ${bottom}`);
        const pieceIndex = gameState.findIndex(piece => piece.id === id);
        if (pieceIndex !== -1) {
            gameState[pieceIndex].left = left;
            gameState[pieceIndex].bottom = bottom;
        } else {
            gameState.push({ id, left, bottom });
        }

        io.emit('updateGameState', gameState);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected: ', socket.id);
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
