const { saveGameState, removeRoom, removePlayer } = require('./Mongo');
const { saveRoom } = require('./Mongo');

const express = require('express');
const socketIo = require('socket.io');
const path = require('path');
const app = express();
const server = require('http').createServer(app);
const io = socketIo(server);

let rooms = [];
let gameState = [];
let playersReady = 0;

app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/Backgammon.html'));
});

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

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
        console.log(`Move received: roomId=${roomId}, pieceId=${pieceId}, left=${left}, top=${top}`);
        
        // Validate the room
        const room = rooms.find(r => r.id === roomId);
        if (!room) {
            console.error(`Room not found: ${roomId}`);
            return;
        }
        console.log(`Room found: ${roomId}, players=${room.players}`);
        
        // Validate the player
        const player = gameState.find(p => room.players.includes(p.id));
        if (!player) {
            console.error(`Player not found in room: playerId=${socket.id}`);
            return;
        }
        console.log(`Player found: playerId=${player.id}, status=${player.status}`);
        
        // Ensure player.pieces is initialized
        if (!Array.isArray(player.pieces)) {
            player.pieces = [];
            console.log(`Initialized player.pieces as an empty array`);
        }
    
        // Update or add the piece
        let piece = player.pieces.find(p => p.id === pieceId);
        if (piece) {
            piece.left = left;
            piece.top = top;
            console.log(`Piece updated: pieceId=${pieceId}, left=${left}, top=${top}`);
        } else {
            player.pieces.push({ id: pieceId, left, top });
            console.log(`Piece added: pieceId=${pieceId}, left=${left}, top=${top}`);
        }
    
        // Broadcast the move to all clients in the room
        console.log(`Broadcasting move to room: ${roomId}`);
        socket.to(roomId).emit('updatePiece', { pieceId, left, top });
    
        // Save the updated game state
        saveGameState(gameState);
        console.log(`Game state saved`);
    });

    function generateRoomId() {
        return Math.random().toString(36).substr(2, 6).toUpperCase();
    }
    
    socket.on('joinRoom', (roomId) => {
        if (!roomId) {
            roomId = generateRoomId(); // Generate a unique room ID
        }
    
        console.log(`Player ${socket.id} is joining room: ${roomId}`);
    
        // Add the player to the room
        socket.join(roomId);
    
        // Create or update the player object
        const player = { id: socket.id, status: 'InGame', roomId };
        gameState = gameState.filter(p => p.id !== socket.id); // Remove any existing player entry
        gameState.push(player); // Add the new player to the gameState
    
        players[socket.id] = player; // Store the player in the players object
    
        // Save the updated game state and rooms
        saveGameState(gameState);
        saveRoom(rooms);
    
        // Notify the player that they have joined the room
        socket.emit('joinRoom', roomId);
    
        // Notify other players in the room about the new player
        socket.to(roomId).emit('playerJoined', { playerId: socket.id, roomId });
    
        // Broadcast the updated player statuses to all clients in the room
        socket.to(roomId).emit('updatePlayerStatuses', gameState);
    
        console.log(`Player ${socket.id} has joined room: ${roomId}`);
    });
    
    
    socket.on('disconnect', () => {
        console.log('Client disconnected: ', socket.id);
        const player = gameState.find(p => p.id === socket.id);
        if (player) {
            player.status = 'Offline';
            saveGameState(gameState);
            removeRoom(player.roomId);
            removePlayer(player.id);
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

        saveRoom(rooms);
        saveGameState(gameState);
        io.emit('updatePlayerStatuses', gameState);
    }
}


const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
