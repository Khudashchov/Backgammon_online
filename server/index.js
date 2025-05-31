const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const Game = require('./game');
const Player = require('./player');
const path = require('path');

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/Backgammon.html'));
});

const games = new Map();
const waitingPlayers = [];

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('play', () => {
        console.log('Play request from:', socket.id);
        
        if (waitingPlayers.length > 0) {
            const opponent = waitingPlayers.shift();
            const roomId = `room_${Date.now()}`;
            
            // Create new game
            const game = new Game(roomId, socket.id, opponent);
            games.set(roomId, game);
            
            // Join both players to room
            socket.join(roomId);
            io.sockets.sockets.get(opponent).join(roomId);
            
            // Start game
            const gameState = game.start();
            
            // Send room info to both players
            io.to(roomId).emit('joinRoom', {
                roomId: roomId,
                players: {
                    white: socket.id,
                    black: opponent
                }
            });
            
            // Notify players of game start
            socket.emit('gameStart', {
                yourColor: 'white',
                yourTurn: true,
                currentPlayerColor: 'white'
            });
            
            io.to(opponent).emit('gameStart', {
                yourColor: 'black',
                yourTurn: false,
                currentPlayerColor: 'white'
            });
            
            // Store room ID for both players
            socket.data.roomId = roomId;
            io.sockets.sockets.get(opponent).data.roomId = roomId;
            
            console.log('Game started:', {
                roomId,
                white: socket.id,
                black: opponent
            });
        } else {
            waitingPlayers.push(socket.id);
            socket.emit('waiting');
            console.log('Player waiting:', socket.id);
        }
    });
    
    socket.on('rollDice', (data) => {
        console.log('Roll dice request:', { 
            playerId: socket.id, 
            roomId: data.roomId,
            storedRoomId: socket.data.roomId 
        });
        
        // Use stored room ID if not provided in request
        const roomId = data.roomId || socket.data.roomId;
        const game = games.get(roomId);
        
        if (!game) {
            console.log('Game not found:', roomId);
            socket.emit('error', { message: 'Game not found' });
            return;
        }
        
        const rollResult = game.rollDice(socket.id);
        if (rollResult) {
            io.to(roomId).emit('diceRolled', {
                roll: rollResult.roll,
                currentPlayer: rollResult.currentPlayer,
                currentPlayerColor: rollResult.currentPlayerColor,
                availableMoves: rollResult.availableMoves
            });
            console.log('Dice rolled:', rollResult);
        } else {
            socket.emit('error', { message: 'Invalid roll attempt' });
        }
    });
    
    socket.on('movePiece', (data) => {
        const roomId = data.roomId || socket.data.roomId;
        const game = games.get(roomId);
        
        if (!game) {
            socket.emit('error', { message: 'Game not found' });
            return;
        }

        console.log('Move request:', {
            playerId: socket.id,
            move: data,
            roomId
        });

        const moveResult = game.movePiece(socket.id, {
            from: data.from,
            to: data.to,
            pieceId: data.pieceId
        });

        if (!moveResult.valid) {
            socket.emit('error', { message: moveResult.message });
            return;
        }

        // Send game state update to all players
        io.to(roomId).emit('gameStateUpdate', {
            board: moveResult.board,
            currentPlayer: moveResult.currentPlayer,
            currentPlayerColor: moveResult.currentPlayerColor,
            currentRoll: moveResult.currentRoll,
            availableMoves: moveResult.availableMoves
        });
    
        // If the turn ended, notify players
        if (moveResult.turnEnded) {
            io.to(roomId).emit('turnChange', {
                currentPlayer: moveResult.currentPlayer,
                currentPlayerColor: moveResult.currentPlayerColor
            });
        }

        // If game is over, notify players
        if (moveResult.gameOver) {
            io.to(roomId).emit('gameOver', {
                winner: moveResult.winner,
                winnerColor: moveResult.winnerColor
            });
            games.delete(roomId);
        }
    });
    
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        
        // Remove from waiting players if present
        const waitingIndex = waitingPlayers.indexOf(socket.id);
        if (waitingIndex !== -1) {
            waitingPlayers.splice(waitingIndex, 1);
        }
        
        // Handle disconnection from active game
        if (socket.data.roomId) {
            const game = games.get(socket.data.roomId);
            if (game) {
                io.to(socket.data.roomId).emit('playerDisconnected', {
                    playerId: socket.id,
                    playerColor: game.players.white === socket.id ? 'white' : 'black'
                });
                games.delete(socket.data.roomId);
            }
        }
    });
});

function calculatePointFromPosition(position) {
    // Convert pixel position to board point (1-24)
    const caseWidth = 70;
    const point = Math.floor(position / caseWidth);
    return point + 1;
    }

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
