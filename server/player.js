class Player {
    constructor(name) {
        this.name = name;
        this.checkers = [];
    }

    rollDice(dice) {
        return dice.roll();
    }

    selectMove(move) {

        return move;
    }
}