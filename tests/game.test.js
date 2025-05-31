const Game = require('../server/game');

describe('Game', () => {
    let game;
    const mockPlayer1 = { id: 'player1', color: 'white' };
    const mockPlayer2 = { id: 'player2', color: 'black' };

    beforeEach(() => {
        game = new Game('test-room');
        game.addPlayer(mockPlayer1);
        game.addPlayer(mockPlayer2);
    });

    describe('game initialization', () => {
        test('should initialize with correct players', () => {
            expect(game.players.white).toBe(mockPlayer1.id);
            expect(game.players.black).toBe(mockPlayer2.id);
        });

        test('should start with white player', () => {
            expect(game.currentPlayer).toBe(mockPlayer1.id);
            expect(game.currentColor).toBe('white');
        });

        test('should initialize with empty dice', () => {
            expect(game.currentRoll).toBeNull();
        });
    });

    describe('dice rolling', () => {
        test('should generate valid dice rolls', () => {
            game.rollDice();
            expect(game.currentRoll).toHaveLength(2);
            game.currentRoll.forEach(die => {
                expect(die).toBeGreaterThanOrEqual(1);
                expect(die).toBeLessThanOrEqual(6);
            });
        });

        test('should generate doubles correctly', () => {
            // Mock Math.random to force doubles
            const mockMath = Object.create(global.Math);
            mockMath.random = () => 0.1; // Will generate same number
            global.Math = mockMath;

            game.rollDice();
            expect(game.currentRoll).toHaveLength(4);
            expect(new Set(game.currentRoll).size).toBe(1);

            // Restore original Math
            global.Math = Object.create(mockMath);
        });
    });

    describe('move validation', () => {
        test('should validate legal moves', () => {
            game.currentRoll = [1];
            const result = game.validateMove({
                from: 24,
                to: 23,
                pieceId: 'test'
            });
            expect(result.valid).toBe(true);
        });

        test('should reject moves without dice roll', () => {
            game.currentRoll = null;
            const result = game.validateMove({
                from: 24,
                to: 23,
                pieceId: 'test'
            });
            expect(result.valid).toBe(false);
        });

        test('should reject moves by wrong player', () => {
            game.currentPlayer = mockPlayer2.id;
            game.currentColor = 'black';
            game.currentRoll = [1];
            
            const result = game.validateMove({
                from: 24,
                to: 23,
                pieceId: 'test'
            });
            expect(result.valid).toBe(false);
        });
    });

    describe('game state', () => {
        test('should track remaining moves', () => {
            game.currentRoll = [6, 3];
            game.makeMove({
                from: 24,
                to: 18,
                pieceId: 'test'
            });
            expect(game.currentRoll).toHaveLength(1);
            expect(game.currentRoll).toContain(3);
        });

        test('should switch turns when no moves remain', () => {
            game.currentRoll = [1];
            game.makeMove({
                from: 24,
                to: 23,
                pieceId: 'test'
            });
            expect(game.currentPlayer).toBe(mockPlayer2.id);
            expect(game.currentColor).toBe('black');
        });

        test('should detect win condition', () => {
            // Move all white pieces to off
            game.board.points = Array(24).fill().map(() => []);
            game.board.off.white = Array(15).fill('white');
            
            expect(game.checkWinCondition()).toBe(true);
            expect(game.winner).toBe(mockPlayer1.id);
        });
    });
}); 