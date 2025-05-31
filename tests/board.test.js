const Board = require('../server/board');

describe('Board', () => {
    let board;

    beforeEach(() => {
        board = new Board();
    });

    describe('initialization', () => {
        test('should create an empty board with correct initial positions', () => {
            const state = board.getState();
            
            // Check initial white pieces
            expect(state.points[board.pointToBoardIndex(24)]).toHaveLength(2); // 2 pieces on point 24
            expect(state.points[board.pointToBoardIndex(19)]).toHaveLength(5); // 5 pieces on point 19
            expect(state.points[board.pointToBoardIndex(7)]).toHaveLength(3);  // 3 pieces on point 7
            expect(state.points[board.pointToBoardIndex(5)]).toHaveLength(5);  // 5 pieces on point 5

            // Check initial black pieces
            expect(state.points[board.pointToBoardIndex(1)]).toHaveLength(2);  // 2 pieces on point 1
            expect(state.points[board.pointToBoardIndex(3)]).toHaveLength(5);  // 5 pieces on point 3
            expect(state.points[board.pointToBoardIndex(20)]).toHaveLength(3); // 3 pieces on point 20
            expect(state.points[board.pointToBoardIndex(22)]).toHaveLength(5); // 5 pieces on point 22
        });

        test('should have empty bars initially', () => {
            const state = board.getState();
            expect(state.bar.white).toHaveLength(0);
            expect(state.bar.black).toHaveLength(0);
        });
    });

    describe('point conversion', () => {
        test('should correctly convert point numbers to board indices', () => {
            // Test left side (24-19)
            expect(board.pointToBoardIndex(24)).toBe(0);
            expect(board.pointToBoardIndex(23)).toBe(1);
            expect(board.pointToBoardIndex(19)).toBe(5);

            // Test right side (7-1)
            expect(board.pointToBoardIndex(7)).toBe(17);
            expect(board.pointToBoardIndex(1)).toBe(23);
        });

        test('should correctly convert board indices to point numbers', () => {
            // Test left side (0-5 -> 24-19)
            expect(board.boardIndexToPoint(0)).toBe(24);
            expect(board.boardIndexToPoint(5)).toBe(19);

            // Test right side (17-23 -> 7-1)
            expect(board.boardIndexToPoint(17)).toBe(7);
            expect(board.boardIndexToPoint(23)).toBe(1);
        });
    });

    describe('move validation', () => {
        test('should validate legal moves', () => {
            expect(board.isValidMove(24, 23, 'white')).toBe(true);
            expect(board.isValidMove(1, 2, 'black')).toBe(true);
        });

        test('should reject moves from empty points', () => {
            expect(board.isValidMove(18, 17, 'white')).toBe(false);
            expect(board.isValidMove(8, 9, 'black')).toBe(false);
        });

        test('should reject moves to blocked points', () => {
            // Move 5 black pieces to block point 21
            board.points[board.pointToBoardIndex(21)] = Array(5).fill('black');
            expect(board.isValidMove(24, 21, 'white')).toBe(false);
        });
    });

    describe('making moves', () => {
        test('should successfully make valid moves', () => {
            const result = board.makeMove({
                from: 24,
                to: 23,
                pieceId: 'test'
            });
            expect(result).toBe(true);
            
            const state = board.getState();
            expect(state.points[board.pointToBoardIndex(24)]).toHaveLength(1);
            expect(state.points[board.pointToBoardIndex(23)]).toHaveLength(1);
        });

        test('should handle hitting opponent pieces', () => {
            // Place a single black piece on point 23
            board.points[board.pointToBoardIndex(23)] = ['black'];

            board.makeMove({
                from: 24,
                to: 23,
                pieceId: 'test'
            });

            const state = board.getState();
            expect(state.bar.black).toHaveLength(1);
            expect(state.points[board.pointToBoardIndex(23)]).toEqual(['white']);
        });
    });

    describe('bearing off', () => {
        test('should allow bearing off when all pieces are in home board', () => {
            // Clear the board
            board.points = Array(24).fill().map(() => []);
            // Place pieces in white's home board
            board.points[board.pointToBoardIndex(6)] = ['white'];
            board.points[board.pointToBoardIndex(3)] = ['white'];

            expect(board.canBearOff('white')).toBe(true);
        });

        test('should not allow bearing off with pieces outside home board', () => {
            expect(board.canBearOff('white')).toBe(false);
            expect(board.canBearOff('black')).toBe(false);
        });
    });
}); 