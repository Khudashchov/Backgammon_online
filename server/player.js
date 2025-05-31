class Player {
    constructor(name, color) {
        this.name = name;
        this.color = color; // 1 for white, 2 for black
        this.onBar = 0;
        this.borneOff = 0;
    }

    rollDice(dice) {
        return dice.roll();
    }

    selectMove(availableMoves) {
        // This method will be called with valid moves
        // The actual move selection will be handled by the client
        return null;
    }

    reset() {
        this.onBar = 0;
        this.borneOff = 0;
    }
}

module.exports = Player;