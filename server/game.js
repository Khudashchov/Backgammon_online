import Rules from './Rules.js';
import Board from './Board.js';
import Dice from './Dice.js';

class Game {
    constructor(player1, player2) {
        this.players = [player1, player2];
        this.currentPlayer = player1;
        this.board = new Board();
        this.dice = new Dice();
        this.rules = new Rules();
    }

    rollDice() {
        const rollResult = this.dice.roll();
        const isValid = this.rules.validateRoll(rollResult);
        if (isValid) {
            return rollResult;
        }
        throw new Error('Invalid roll');
    }

    validateMove(move) {
        return this.rules.validateMove(move, this.board);
    }

    updateBoard(move) {
        this.board.updateState(move);
    }

    checkWinCondition() {
        return this.board.checkWinCondition(this.currentPlayer);
    }
}