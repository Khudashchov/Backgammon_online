class Rules {
    constructor() {
        this.POINTS_PER_QUADRANT = 6;
        this.TOTAL_POINTS = 24;
    }

    getAvailableMoves(board, color, dice) {
        console.log('Calculating available moves for:', { color, dice });
        const moves = [];
        const boardState = board.getState();

        // If pieces are on the bar, must move them first
        if (boardState.bar[color].length > 0) {
            console.log('Player has pieces on the bar');
            for (const die of dice) {
                const entryPoint = color === 'white' ? 24 : 1;
                if (this.canMoveToPoint(board, entryPoint, color)) {
                    moves.push({
                        from: 'bar',
                        to: entryPoint,
                        die: die
                    });
                }
            }
            console.log('Bar moves:', moves);
            return moves;
        }

        // Get all points where player has pieces
        const playerPoints = [];
        for (let i = 0; i < 24; i++) {
            const point = boardState.points[i];
            if (point.length > 0 && point[point.length - 1] === color) {
                const pointNumber = board.boardIndexToPoint(i);
                if (pointNumber !== null) {
                    playerPoints.push(pointNumber);
                }
            }
        }

        // Add single die moves
        for (const point of playerPoints) {
            for (const die of dice) {
                // White moves from 24 towards 1 (decreasing), Black moves from 1 towards 24 (increasing)
                const to = color === 'white' ? point - die : point + die;
                
                // Check if move is within bounds (1-24)
                if (to >= 1 && to <= 24 && this.canMoveToPoint(board, to, color)) {
                    moves.push({
                        from: point,
                        to: to,
                        die: die
                    });
                }
            }
        }

        // Add combined moves if we have two different dice
        if (dice.length === 2) {
            for (const point of playerPoints) {
                const distance = dice[0] + dice[1];
                // White moves from 24 towards 1 (decreasing), Black moves from 1 towards 24 (increasing)
                const to = color === 'white' ? point - distance : point + distance;
                
                // Check if combined move is possible
                if (to >= 1 && to <= 24) {
                    // Try both combinations of dice
                    const mid1 = color === 'white' ? point - dice[0] : point + dice[0];
                    const mid2 = color === 'white' ? point - dice[1] : point + dice[1];

                    // Try first die then second
                    if (this.canMoveToPoint(board, mid1, color)) {
                        const tempBoard = board.clone();
                        tempBoard.makeMove({ from: point, to: mid1, pieceId: 'temp' });
                        if (this.canMoveToPoint(tempBoard, to, color)) {
                            moves.push({
                                from: point,
                                to: to,
                                via: mid1,
                                dice: [dice[0], dice[1]]
                            });
                        }
                    }

                    // Try second die then first
                    if (this.canMoveToPoint(board, mid2, color)) {
                        const tempBoard = board.clone();
                        tempBoard.makeMove({ from: point, to: mid2, pieceId: 'temp' });
                        if (this.canMoveToPoint(tempBoard, to, color)) {
                            moves.push({
                                from: point,
                                to: to,
                                via: mid2,
                                dice: [dice[1], dice[0]]
                            });
                        }
                    }
                }
            }
        }

        console.log('Final available moves:', JSON.stringify(moves, null, 2));
        return moves;
    }

    validateMove(board, move, color, dice) {
        console.log('Validating move:', { move, color, dice });
        
        if (!move.from || !move.to) {
            return { valid: false, message: 'Invalid move coordinates' };
        }

        const boardState = board.getState();

        // Check if player has pieces on the bar
        if (boardState.bar[color].length > 0) {
            if (move.from !== 'bar') {
                return { valid: false, message: 'Must move pieces from the bar first' };
            }
        }

        // Get available moves
        const availableMoves = this.getAvailableMoves(board, color, dice);
        console.log('Available moves:', JSON.stringify(availableMoves, null, 2));
        console.log('Attempting to validate move:', JSON.stringify(move, null, 2));

        // For long moves, check if it can be made using both dice
        if (dice.length === 2) {
            const distance = Math.abs(move.from - move.to);
            const sum = dice[0] + dice[1];
            
            // If the move distance equals sum of dice
            if (distance === sum) {
                // Check intermediate points for both possible combinations
                const mid1 = color === 'white' ? move.from - dice[0] : move.from + dice[0];
                const mid2 = color === 'white' ? move.from - dice[1] : move.from + dice[1];

                // Try first die then second
                if (this.canMoveToPoint(board, mid1, color)) {
                    const tempBoard = board.clone();
                    tempBoard.makeMove({ from: move.from, to: mid1, pieceId: 'temp' });
                    if (this.canMoveToPoint(tempBoard, move.to, color)) {
                        return { valid: true, remainingDice: [] };
                    }
                }

                // Try second die then first
                if (this.canMoveToPoint(board, mid2, color)) {
                    const tempBoard = board.clone();
                    tempBoard.makeMove({ from: move.from, to: mid2, pieceId: 'temp' });
                    if (this.canMoveToPoint(tempBoard, move.to, color)) {
                        return { valid: true, remainingDice: [] };
                    }
                }
            }
        }

        // Check if the move is in the available moves list
        const validMove = availableMoves.find(m => {
            const match = m.from === parseInt(move.from) && m.to === parseInt(move.to);
            console.log('Checking move:', JSON.stringify(m), 'against:', JSON.stringify(move), 'Match:', match);
            return match;
        });

        if (!validMove) {
            return { valid: false, message: 'Invalid move - not in available moves' };
        }

        // For single moves
        if (!validMove.dice) {
            const remainingDice = [...dice];
            remainingDice.splice(remainingDice.indexOf(validMove.die), 1);
            return { valid: true, remainingDice };
        }

        // For combined moves
        return { valid: true, remainingDice: [] }; // Used both dice
    }

    canMoveToPoint(board, pointNumber, color) {
        if (pointNumber < 1 || pointNumber > 24) {
            return false;
        }

        // Convert point number to board index based on color
        const boardIndex = color === 'white' ? 24 - pointNumber : pointNumber - 1;
        const boardState = board.getState();
        const point = boardState.points[boardIndex];
        
        // Point is empty
        if (!point || point.length === 0) {
            return true;
        }
        
        // Point has one piece (can be captured)
        if (point.length === 1) {
            return true;
        }
        
        // Point has multiple pieces of the same color
        return point[0] === color;
    }

    canBearOff(board, from, color) {
        const boardState = board.getState();
        
        // Can't bear off if pieces are on the bar
        if (boardState.bar[color].length > 0) {
            return false;
        }

        // Define home board boundaries
        // White bears off from points 1-6
        // Black bears off from points 19-24
        const homeStart = color === 'white' ? 1 : 19;
        const homeEnd = color === 'white' ? 6 : 24;

        // Check if the piece being moved is in the home board
        if (from < homeStart || from > homeEnd) {
            return false;
        }

        // Check if all other pieces are in the home board
        for (let i = 0; i < 24; i++) {
            const point = boardState.points[i];
            if (point.some(piece => piece === color)) {
                const pointNumber = board.boardIndexToPoint(i);
                if (pointNumber < homeStart || pointNumber > homeEnd) {
                    return false;
                }
            }
        }

        return true;
    }

    // Helper function to convert point number to board index
    pointToBoardIndex(point) {
        if (point >= 19 && point <= 24) {
            return 24 - point; // 24,23,22,21,20,19 -> 0,1,2,3,4,5
        } else if (point >= 1 && point <= 7) {
            return 23 - (point - 1); // 7,6,5,4,3,2,1 -> 17,18,19,20,21,22,23
        }
        return null; // Invalid point number
    }
}

module.exports = Rules;