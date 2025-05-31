const Rules = require('../server/rules');
const Board = require('../server/board');

describe('Rules', () => {
    let rules;
    let board;

    beforeEach(() => {
        rules = new Rules();
        board = new Board();
    });

    describe('available moves calculation', () => {
        test('should calculate correct single die moves', () => {
            const moves = rules.getAvailableMoves(board, 'white', [6]);
            expect(moves).toContainEqual(expect.objectContaining({
                from: 24,
                to: 18,
                die: 6
            }));
        });

        test('should calculate correct combined moves', () => {
            const moves = rules.getAvailableMoves(board, 'white', [6, 3]);
            expect(moves).toContainEqual(expect.objectContaining({
                from: 24,
                to: 15,
                via: 18,
                dice: [6, 3]
            }));
        });

        test('should handle bar moves first', () => {
            board.bar.white.push('white');
            const moves = rules.getAvailableMoves(board, 'white', [6, 3]);
            moves.forEach(move => {
                expect(move.from).toBe('bar');
            });
        });
    });

    describe('move validation', () => {
        test('should validate legal single moves', () => {
            const result = rules.validateMove(board, {
                from: 24,
                to: 23
            }, 'white', [1]);
            expect(result.valid).toBe(true);
        });

        test('should validate legal combined moves', () => {
            const result = rules.validateMove(board, {
                from: 24,
                to: 18
            }, 'white', [3, 3]);
            expect(result.valid).toBe(true);
        });

        test('should reject moves when pieces are on bar', () => {
            board.bar.white.push('white');
            const result = rules.validateMove(board, {
                from: 24,
                to: 23
            }, 'white', [1]);
            expect(result.valid).toBe(false);
            expect(result.message).toBe('Must move pieces from the bar first');
        });

        test('should reject moves to blocked points', () => {
            // Block point 23 with black pieces
            board.points[board.pointToBoardIndex(23)] = Array(2).fill('black');
            const result = rules.validateMove(board, {
                from: 24,
                to: 23
            }, 'white', [1]);
            expect(result.valid).toBe(false);
        });
    });

    describe('bearing off', () => {
        test('should allow bearing off when all pieces are in home board', () => {
            // Clear the board and set up a bearing off position
            board.points = Array(24).fill().map(() => []);
            board.points[board.pointToBoardIndex(6)] = ['white'];
            board.points[board.pointToBoardIndex(4)] = ['white'];
            
            expect(rules.canBearOff(board, 6, 'white')).toBe(true);
        });

        test('should not allow bearing off with pieces outside home board', () => {
            expect(rules.canBearOff(board, 24, 'white')).toBe(false);
        });

        test('should not allow bearing off with pieces on bar', () => {
            board.bar.white.push('white');
            expect(rules.canBearOff(board, 6, 'white')).toBe(false);
        });
    });
}); 