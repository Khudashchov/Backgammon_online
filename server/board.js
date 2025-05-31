class Board {
    constructor() {
        this.points = Array(24).fill().map(() => []);
        this.bar = {
            white: [],
            black: []
        };
        this.off = {
            white: [],
            black: []
        };
        this.setupInitialPosition();
    }

    // Convert point number to board index
    pointToBoardIndex(point) {
        if (!point) return null;
        
        // Upper row (left to right): 1,2,3,4,5,6,7,8,9,10,11,12
        // Lower row (left to right): 24,23,22,21,20,19,18,17,16,15,14,13
        
        // Points 1-12 (upper row)
        if (point >= 1 && point <= 12) {
            return point - 1;  // 1->0, 2->1, ..., 12->11
        }
        // Points 13-24 (lower row)
        else if (point >= 13 && point <= 24) {
            return 36 - point;  // 24->12, 23->13, ..., 13->23
        }
        return null;
    }

    // Convert board index to point number
    boardIndexToPoint(index) {
        if (index === null || index === undefined || index < 0 || index >= 24) {
            return null;
        }
        
        // Indices 0-11 -> Points 1-12 (upper row)
        if (index <= 11) {
            return index + 1;
        }
        // Indices 12-23 -> Points 24-13 (lower row)
        else {
            return 36 - index;
        }
    }

    clone() {
        const newBoard = new Board();
        // Deep copy points
        newBoard.points = this.points.map(point => [...point]);
        // Deep copy bar
        newBoard.bar = {
            white: [...this.bar.white],
            black: [...this.bar.black]
        };
        // Deep copy off
        newBoard.off = {
            white: [...this.off.white],
            black: [...this.off.black]
        };
        return newBoard;
    }

    setupInitialPosition() {
        // Clear the board first
        this.points = Array(24).fill().map(() => []);
        
        // White pieces initial position (all 15 pieces on point 24)
        this.points[12] = Array(15).fill('white');  // Index 12 corresponds to point 24
        
        // Black pieces initial position (all 15 pieces on point 1)
        this.points[0] = Array(15).fill('black');   // Index 0 corresponds to point 1
    }

    getState() {
        return {
            points: this.points,
            bar: this.bar,
            off: this.off
        };
    }

    makeMove(move) {
        const { from, to, pieceId } = move;
        
        // Convert point numbers to board indices
        const fromIndex = this.pointToBoardIndex(from);
        const toIndex = this.pointToBoardIndex(to);
        
        // Validate indices
        if (fromIndex === null || toIndex === null) {
            console.error('Invalid move: Invalid point numbers', { from, to, fromIndex, toIndex });
            return false;
        }

        const fromPoint = this.points[fromIndex];
        const toPoint = this.points[toIndex];

        if (!fromPoint || !toPoint) {
            console.error('Invalid move: Points not found', { fromIndex, toIndex });
            return false;
        }

        const color = fromPoint[fromPoint.length - 1];

        // Validate direction (white moves towards 1, black moves towards 24)
        if (color === 'white' && from < to) {
            console.error('Invalid move: White must move towards point 1');
            return false;
        }
        if (color === 'black' && from > to) {
            console.error('Invalid move: Black must move towards point 24');
            return false;
        }

        // Remove piece from source
        fromPoint.pop();

        // If hitting opponent's piece
        if (toPoint.length === 1 && toPoint[0] !== color) {
            const hitColor = toPoint[0];
            this.bar[hitColor].push(hitColor);
            toPoint.pop();
        }

        // Add piece to destination
        toPoint.push(color);
        return true;
    }

    isValidMove(from, to, color) {
        // Convert point numbers to board indices
        const fromIndex = this.pointToBoardIndex(from);
        const toIndex = this.pointToBoardIndex(to);

        // Validate indices
        if (fromIndex === null || toIndex === null) {
            console.error('Invalid move: Invalid point numbers', { from, to, fromIndex, toIndex });
            return false;
        }

        // Check if moving from a valid point
        if (from < 1 || from > 24 || to < 1 || to > 24) {
            return false;
        }

        const fromPoint = this.points[fromIndex];
        const toPoint = this.points[toIndex];

        if (!fromPoint || !toPoint) {
            console.error('Invalid move: Points not found', { fromIndex, toIndex });
            return false;
        }

        // Check if there's a piece to move
        if (!fromPoint.length || fromPoint[fromPoint.length - 1] !== color) {
            return false;
        }

        // Check if destination is blocked (2 or more opponent pieces)
        if (toPoint.length >= 2 && toPoint[0] !== color) {
            return false;
        }

        return true;
    }

    getPieceCount(color) {
        let count = 0;
        // Count pieces on points
        for (const point of this.points) {
            count += point.filter(piece => piece === color).length;
        }
        // Count pieces on bar
        count += this.bar[color].length;
        // Count borne off pieces
        count += this.off[color].length;
        return count;
    }

    bearOff(from, color) {
        const fromIndex = this.pointToBoardIndex(from);
        const fromPoint = this.points[fromIndex];
        if (fromPoint.length > 0 && fromPoint[fromPoint.length - 1] === color) {
            const piece = fromPoint.pop();
            this.off[color].push(piece);
            return true;
        }
        return false;
    }

    canBearOff(color) {
        const boardState = this.getState();
        
        // Can't bear off if pieces are on the bar
        if (boardState.bar[color].length > 0) {
            return false;
        }

        // For Long Nardgammon, all pieces must be in the home board
        // White's home board is points 1-6
        // Black's home board is points 19-24
        const homeStart = color === 'white' ? 1 : 19;
        const homeEnd = color === 'white' ? 6 : 24;

        // Check if any pieces are outside home board
        for (let i = 0; i < 24; i++) {
            const point = boardState.points[i];
            if (point.some(piece => piece === color)) {
                const pointNumber = this.boardIndexToPoint(i);
                if (pointNumber < homeStart || pointNumber > homeEnd) {
                    return false;
                }
            }
        }

        return true;
    }

    moveFromBar(to, color) {
        const toIndex = this.pointToBoardIndex(to);
        if (this.bar[color].length > 0) {
            const toPoint = this.points[toIndex];
            
            // Check if move is valid
            if (toPoint.length >= 2 && toPoint[0] !== color) {
                return false;
            }

            // If hitting opponent's piece
            if (toPoint.length === 1 && toPoint[0] !== color) {
                const hitColor = toPoint[0];
                this.bar[hitColor].push(hitColor);
                toPoint.pop();
            }

            // Move piece from bar
            this.bar[color].pop();
            toPoint.push(color);
            return true;
        }
        return false;
    }

    hasWon(color) {
        return this.off[color].length === 15;
    }

    // Get detailed information about a point's stack
    getStackInfo(pointIndex) {
        const pieces = this.points[pointIndex];
        const count = pieces.length;
        const lastPiece = count > 0 ? pieces[count - 1] : 0;

        return {
            pieces: [...pieces],
            count: count,
            topPlayer: lastPiece,
            isBlot: count === 1,
            isStack: count > 1,
            positions: pieces.map((_, idx) => ({
                offset: idx * 5,
                player: pieces[idx]
            }))
        };
    }

    // Get all stacks information for UI display
    getAllStacks() {
        return this.points.map((_, index) => ({
            position: this.boardIndexToPoint(index),
            ...this.getStackInfo(index)
        }));
    }

    // Get bar information
    getBarInfo() {
        return {
            white: {
                pieces: this.bar.white,
                count: this.bar.white.length,
                positions: this.bar.white.map((_, idx) => ({
                    offset: idx * 5,
                    player: 'white'
                }))
            },
            black: {
                pieces: this.bar.black,
                count: this.bar.black.length,
                positions: this.bar.black.map((_, idx) => ({
                    offset: idx * 5,
                    player: 'black'
                }))
            }
        };
    }

    // Get borne off information
    getBorneOffInfo() {
        return {
            white: {
                pieces: this.off.white,
                count: this.off.white.length,
                positions: this.off.white.map((_, idx) => ({
                    offset: idx * 5,
                    player: 'white'
                }))
            },
            black: {
                pieces: this.off.black,
                count: this.off.black.length,
                positions: this.off.black.map((_, idx) => ({
                    offset: idx * 5,
                    player: 'black'
                }))
            }
        };
    }
}

module.exports = Board;