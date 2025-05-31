const Rules = require('./rules.js');
const Board = require('./board.js');
const Dice = require('./dice.js');

class Game {
    constructor(roomId, player1, player2) {
        this.roomId = roomId;
        this.players = {
            white: player1,
            black: player2
        };
        this.currentPlayer = player1;
        this.currentPlayerColor = 'white';
        this.dice = new Dice();
        this.board = new Board();
        this.rules = new Rules();
        this.currentRoll = null;
        this.gameState = 'rolling'; // rolling, moving
        this.availableMoves = [];
    }

    start() {
        return {
            roomId: this.roomId,
            players: this.players,
            currentPlayer: this.currentPlayer,
            currentPlayerColor: this.currentPlayerColor,
            gameState: this.gameState
        };
    }

    rollDice(playerId) {
        console.log('Roll attempt by player:', playerId);
        if (playerId !== this.currentPlayer || this.gameState !== 'rolling') {
            console.log('Invalid roll attempt:', {
                correctPlayer: playerId === this.currentPlayer,
                correctState: this.gameState === 'rolling'
            });
            return null;
        }

        this.currentRoll = this.dice.roll();
        this.gameState = 'moving';
        this.availableMoves = this.rules.getAvailableMoves(this.board, this.currentPlayerColor, this.currentRoll);

        console.log('Dice rolled:', {
            roll: this.currentRoll,
            player: playerId,
            color: this.currentPlayerColor,
            availableMoves: this.availableMoves
        });

        return {
            roll: this.currentRoll,
            currentPlayer: this.currentPlayer,
            currentPlayerColor: this.currentPlayerColor,
            availableMoves: this.availableMoves
        };
    }

    movePiece(playerId, move) {
        console.log('Move attempt:', {
            playerId,
            currentPlayer: this.currentPlayer,
            move,
            gameState: this.gameState
        });

        if (playerId !== this.currentPlayer || this.gameState !== 'moving') {
            console.log('Invalid move: wrong player or state');
            return { valid: false, message: 'Not your turn or wrong game state' };
        }

        // Validate the move
        const moveResult = this.rules.validateMove(this.board, move, this.currentPlayerColor, this.currentRoll);
        console.log('Move validation result:', moveResult);

        if (!moveResult.valid) {
            return moveResult;
        }

        // Execute the move
        if (move.from === 'bar') {
            this.board.moveFromBar(move.to, this.currentPlayerColor);
        } else if (move.to === 'off') {
            this.board.bearOff(move.from, this.currentPlayerColor);
        } else {
            this.board.makeMove(move);
        }

        // Update dice and available moves
        this.currentRoll = moveResult.remainingDice;
        this.availableMoves = this.rules.getAvailableMoves(this.board, this.currentPlayerColor, this.currentRoll);

        // Check if turn should end
        const shouldEndTurn = this.currentRoll.length === 0 || this.availableMoves.length === 0;
        if (shouldEndTurn) {
            this.switchTurn();
        }

        // Check for win condition
        if (this.board.hasWon(this.currentPlayerColor)) {
            return {
                valid: true,
                gameOver: true,
                winner: this.currentPlayer,
                winnerColor: this.currentPlayerColor,
                board: this.board.getState()
            };
        }

        return {
            valid: true,
            board: this.board.getState(),
            currentPlayer: this.currentPlayer,
            currentPlayerColor: this.currentPlayerColor,
            currentRoll: this.currentRoll,
            gameState: this.gameState,
            availableMoves: this.availableMoves,
            turnEnded: shouldEndTurn
        };
    }

    switchTurn() {
        this.currentPlayer = this.currentPlayer === this.players.white ? this.players.black : this.players.white;
        this.currentPlayerColor = this.currentPlayerColor === 'white' ? 'black' : 'white';
        this.currentRoll = null;
        this.gameState = 'rolling';
        this.availableMoves = [];
        
        console.log('Turn switched to:', {
            player: this.currentPlayer,
            color: this.currentPlayerColor
        });
    }

    getGameState() {
        return {
            board: this.board.getState(),
            currentPlayer: this.currentPlayer,
            currentPlayerColor: this.currentPlayerColor,
            currentRoll: this.currentRoll,
            gameState: this.gameState,
            availableMoves: this.availableMoves
        };
    }
}

module.exports = Game;