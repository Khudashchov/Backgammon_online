const { saveGameState } = require('./excel');
const { saveRoomToExcel } = require('./excel');

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let rooms = [];
let gameState = [];
let playersReady = 0;

app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/Backgammon.html'));
});

io.on('connection', (socket) => {
    console.log('Користувач підключився:', socket.id);

    const newPlayer = { id: socket.id, status: 'Online' };
    gameState.push(newPlayer);

    saveGameState(gameState);

    io.emit('playerJoined', newPlayer);

    socket.on('play', () => {
        const player = gameState.find(p => p.id === socket.id);
        if (player) {
            player.status = 'Waiting';
            saveGameState(gameState);
            io.emit('updatePlayerStatuses', gameState);
            checkForRoom();
        }
    });
    

    socket.on('setOnlineStatus', () => {
        const player = gameState.find(p => p.id === socket.id);
        if (player) {
            player.status = 'Online';
            saveGameState(gameState);
            io.emit('updatePlayerStatuses', gameState);
        }
    });

    socket.on('movePiece', ({ roomId, pieceId, left, top }) => {
        console.log(`Move received in room ${roomId}: ${pieceId}, left: ${left}, top: ${top}`);
        
        const room = rooms.find(r => r.id === roomId);
        if (!room) return;
    
        const player = gameState.find(p => room.players.includes(p.id));
        if (player) {
            let piece = player.pieces.find(p => p.id === pieceId);
            if (piece) {
                piece.left = left;
                piece.top = top;
            } else {
                player.pieces.push({ id: pieceId, left, top });
            }
        }
    
        io.to(roomId).emit('updateGameState', gameState);
        saveGameState(gameState);
    });
    
    function generateRoomId() {
        return Math.random().toString(36).substr(2, 6).toUpperCase();
    }
    
    socket.on('joinRoom', (roomId) => {
        if (!roomId) {
            roomId = generateRoomId();
        }
    
        socket.join(roomId);
        
        let player = gameState.find(p => p.id === socket.id);
        if (player) {
            player.status = 'InGame';
            player.roomId = roomId;
        } else {
            player = { id: socket.id, status: 'InGame', roomId };
            gameState.push(player);
        }
    
        players[socket.id] = player;
    
        saveGameState(gameState);
        io.emit('updatePlayerStatuses', gameState);
    });
    
    
    socket.on('disconnect', () => {
        console.log('Client disconnected: ', socket.id);
        const player = gameState.find(p => p.id === socket.id);
        if (player) {
            player.status = 'Disconnected';
            saveGameState(gameState);
            io.emit('updatePlayerStatuses', gameState);
        }
    });
});

function checkForRoom() {
    const waitingPlayers = gameState.filter(p => p.status === 'Waiting');

    if (waitingPlayers.length >= 2) {
        const player1 = waitingPlayers.shift();
        const player2 = waitingPlayers.shift();
        const roomId = `room_${player1.id}_${player2.id}`;

        rooms.push({ id: roomId, players: [player1.id, player2.id] });

        player1.status = 'InGame';
        player2.status = 'InGame';
        player1.roomId = roomId;
        player2.roomId = roomId;

        io.to(player1.id).emit('joinRoom', roomId);
        io.to(player2.id).emit('joinRoom', roomId);

        saveRoomToExcel(rooms);
        saveGameState(gameState);
        io.emit('updatePlayerStatuses', gameState);
    }
}


const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
