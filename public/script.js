const socket = io();
const caseWidth = 70; // Width of one case
const caseHeight = 125; // Height of one case
const stackOffset = 10; // Vertical offset between stacked pieces
let gameActive = false;
let currentRoom = null;
let mySocketId = null;
let myColor = null;
let isMyTurn = false;
let currentRoll = null;
let availableMoves = [];
let rollButton = null;
let lastMovedChipInfo = null;

// Get socket ID when connecting
socket.on('connect', () => {
    mySocketId = socket.id;
    console.log('Connected with ID:', mySocketId);
});

// Function to calculate stack position
function calculateStackPosition(stackIndex, isTopHalf) {
    return isTopHalf ? stackIndex * stackOffset : -stackIndex * stackOffset;
}

// Function to get pieces in a stack
function getPiecesInStack(x, y) {
    const pieces = [];
    document.querySelectorAll('.chip, .chip_b').forEach(piece => {
        const pieceX = parseInt(piece.style.left);
        const pieceY = parseInt(piece.style.top);
        if (pieceX === x && Math.abs(pieceY - y) < caseHeight) {
            pieces.push(piece);
        }
    });
    return pieces.sort((a, b) => parseInt(a.style.top) - parseInt(b.style.top));
}

// Function to update stack positions
function updateStackPositions(x, y) {
    const pieces = getPiecesInStack(x, y);
    const isTopHalf = y < 300;
    const baseY = isTopHalf ? 0 : 572;

    pieces.forEach((piece, index) => {
        const offset = calculateStackPosition(index, isTopHalf);
        piece.style.top = `${baseY + offset}px`;
        piece.style.zIndex = isTopHalf ? index + 3 : (100 - index);
    });
}

function initializeGame() {
    rollButton = document.querySelector('.button_1');
    rollButton.addEventListener('click', handleButtonClick);
}

function handleButtonClick() {
    if (!gameActive) {
        startGame();
    } else if (isMyTurn && !currentRoll) {
        rollDice();
    }
}

function startGame() {
    socket.emit('play');
    rollButton.textContent = 'Waiting for opponent...';
    rollButton.classList.add('active');
}

function rollDice() {
    if (!isMyTurn || !gameActive || !currentRoom) {
        console.log('Cannot roll dice:', {
            isMyTurn,
            gameActive,
            currentRoom
        });
        return;
    }
    console.log('Rolling dice for room:', currentRoom);
    socket.emit('rollDice', { roomId: currentRoom });
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    rollButton = document.querySelector('.button_1');
    rollButton.addEventListener('click', handleButtonClick);
});

// Handle waiting state
socket.on('waiting', () => {
    document.getElementById('status_display').textContent = 'Waiting for opponent to join...';
});

// Join room handler
socket.on('joinRoom', (data) => {
    console.log(`Joined room: ${data.roomId}`);
    currentRoom = data.roomId;
    myColor = data.players.white === mySocketId ? 'white' : 'black';
    console.log(`My color is: ${myColor}`);
    setupPieces(myColor);
});

function setupPieces(playerColor) {
    const chips = document.querySelectorAll('[id^="chip"]');
    chips.forEach(chip => {
        if (playerColor === 'white') {
            if (parseInt(chip.id.replace('chip', '')) <= 15) {
                chip.className = 'chip';
            } else {
                chip.className = 'chip_b';
            }
        } else {
            if (parseInt(chip.id.replace('chip', '')) <= 15) {
                chip.className = 'chip_b';
            } else {
                chip.className = 'chip';
            }
        }
    });
}

// Handle game start
socket.on('gameStart', (data) => {
    console.log('Game starting:', data);
    gameActive = true;
    myColor = data.yourColor;
    isMyTurn = data.yourTurn;
    
    if (isMyTurn) {
        rollButton.textContent = 'Roll Dice';
        document.getElementById('turn_display').textContent = 'Your Turn - Roll Dice';
    } else {
        rollButton.textContent = 'Waiting for Opponent';
        document.getElementById('turn_display').textContent = `${data.currentPlayerColor}'s Turn`;
    }
    
    document.getElementById('status_display').textContent = `Game Started! You are ${myColor}`;
    enablePieceMovement(isMyTurn);
});

// Handle dice roll
socket.on('diceRolled', (data) => {
    console.log('Dice rolled:', data);
    currentRoll = data.roll;
    availableMoves = data.availableMoves;
    
    document.getElementById('dice_display').textContent = `Dice: ${currentRoll.join(', ')}`;
    
    const isCurrentPlayer = data.currentPlayer === mySocketId;
    if (isCurrentPlayer) {
        document.getElementById('turn_display').textContent = 'Your Turn - Make a Move';
        rollButton.textContent = `Rolled: ${currentRoll.join(', ')}`;
        enablePieceMovement(true);
    } else {
        document.getElementById('turn_display').textContent = `${data.currentPlayerColor}'s Turn`;
        rollButton.textContent = 'Waiting for Opponent';
        enablePieceMovement(false);
    }
});

// Handle turn changes
socket.on('turnChange', (data) => {
    console.log('Turn change:', data);
    isMyTurn = data.currentPlayer === mySocketId;
    currentRoll = null;
    availableMoves = [];
    
    if (isMyTurn) {
        rollButton.textContent = 'Roll Dice';
        document.getElementById('turn_display').textContent = 'Your Turn - Roll Dice';
    } else {
        rollButton.textContent = 'Waiting for Opponent';
        document.getElementById('turn_display').textContent = `${data.currentPlayerColor}'s Turn`;
    }
    
    enablePieceMovement(false);
});

// Handle piece movement
function enablePieceMovement(enable) {
    const myPieces = document.querySelectorAll(myColor === 'white' ? '.chip' : '.chip_b');
    myPieces.forEach(chip => {
        if (enable && currentRoll) {
            chip.style.cursor = 'pointer';
            chip.draggable = true;
        } else {
            chip.style.cursor = 'not-allowed';
            chip.draggable = false;
        }
    });
}

// Handle game state updates
socket.on('gameStateUpdate', (state) => {
    console.log('Game state update:', state);
    if (!gameActive) return;
    
    // Clear the last moved chip info on successful move
    lastMovedChipInfo = null;
    
    isMyTurn = state.currentPlayer === mySocketId;
    currentRoll = state.currentRoll;
    availableMoves = state.availableMoves;
    
    document.getElementById('turn_display').textContent = isMyTurn ? 
        'Your Turn' : 
        `${state.currentPlayerColor}'s Turn`;
    
    if (currentRoll && currentRoll.length > 0) {
        document.getElementById('dice_display').textContent = `Dice: ${currentRoll.join(', ')}`;
    }
    
    enablePieceMovement(isMyTurn && state.gameState === 'moving');
});

// Handle game over
socket.on('gameOver', (data) => {
    gameActive = false;
    rollButton.textContent = data.winner === mySocketId ? 'You Won!' : 'You Lost!';
    
    const winnerText = data.winner === mySocketId ? 
        'Victory!' : 
        `${data.winnerColor === 'white' ? 'White' : 'Black'} Wins!`;
    document.getElementById('status_display').textContent = winnerText;
    enablePieceMovement(false);
});

// Handle player disconnection
socket.on('playerDisconnected', (data) => {
    if (gameActive) {
        document.getElementById('status_display').textContent = 
            `${data.playerColor === 'white' ? 'White' : 'Black'} player disconnected`;
        resetChips();
        gameActive = false;
        rollButton.textContent = 'Play';
        rollButton.classList.remove('active');
    }
});

// Handle piece dragging
document.addEventListener('mousedown', function(e) {
    const chip = e.target.closest('.chip, .chip_b');
    if (!chip) return;

    const isOurPiece = (myColor === 'white' && chip.classList.contains('chip')) ||
                      (myColor === 'black' && chip.classList.contains('chip_b'));

    console.log('Drag attempt:', {
        gameActive,
        isMyTurn,
        currentRoll,
        isOurPiece,
        myColor,
        chipClass: chip.className
    });

    if (!gameActive || !isMyTurn || !currentRoll || !isOurPiece) {
        return;
    }

    e.preventDefault();
    const initialX = parseInt(chip.style.left);
    const initialY = parseInt(chip.style.top);
    const initialZ = chip.style.zIndex;
    const chipRect = chip.getBoundingClientRect();
    const offsetX = e.clientX - chipRect.left;
    const offsetY = e.clientY - chipRect.top;

    chip.style.zIndex = '1000';

    // Store initial stack position
    const initialStackPieces = getPiecesInStack(initialX, initialY);
    const initialStackPositions = initialStackPieces.map(piece => ({
        piece: piece,
        x: parseInt(piece.style.left),
        y: parseInt(piece.style.top),
        z: piece.style.zIndex
    }));

    function restorePosition() {
        // Restore the dragged chip position
        chip.style.left = `${initialX}px`;
        chip.style.top = `${initialY}px`;
        chip.style.zIndex = initialZ;

        // Restore all pieces in the original stack
        initialStackPositions.forEach(pos => {
            pos.piece.style.left = `${pos.x}px`;
            pos.piece.style.top = `${pos.y}px`;
            pos.piece.style.zIndex = pos.z;
        });
    }

    function calculatePoint(x) {
        // Convert x position to point number
        // For white:
        // Upper row: 12,11,10,9,8,7,6,5,4,3,2,1 (right to left)
        // Lower row: 24,23,22,21,20,19,18,17,16,15,14,13 (left to right)
        const caseWidth = 70;
        const isTopHalf = parseInt(chip.style.top) < 300;
        
        // Calculate grid position (0-11, from left to right)
        let gridPosition;
        if (x <= 358) {
            // Left half of the board
            gridPosition = Math.floor((x - 8) / caseWidth);
        } else {
            // Right half of the board
            gridPosition = Math.floor((x - 376) / caseWidth) + 6;
        }

        console.log('Position calculation:', {
            x,
            isTopHalf,
            gridPosition,
            initialY: parseInt(chip.style.top)
        });
        
        if (myColor === 'white') {
            if (isTopHalf) {
                // Upper row (points 12-1, right to left)
                return 12 - gridPosition;
            } else {
                // Lower row (points 24-13, left to right)
                return 24 - gridPosition;
            }
        } else { // black
            if (isTopHalf) {
                // Upper row (points 13-24, right to left)
                return 13 + gridPosition;
            } else {
                // Lower row (points 1-12, left to right)
                return gridPosition + 1;
            }
        }
    }

    function onMouseMove(moveEvent) {
        moveEvent.preventDefault();
        const mouseX = moveEvent.clientX;
        const mouseY = moveEvent.clientY;

        let newPositionX = mouseX - offsetX;
        let newPositionY = mouseY - offsetY;

        // Constrain horizontal movement
        newPositionX = Math.max(8, Math.min(newPositionX, 778));

        // Snap to grid
        let snappedPositionX = Math.round(newPositionX / caseWidth) * caseWidth;
        snappedPositionX = snappedPositionX > 358 ? snappedPositionX + 18 : snappedPositionX + 8;

        // Determine vertical position based on board half
        const isTopHalf = newPositionY < 300;
        const baseY = isTopHalf ? 0 : 572;

        chip.style.left = `${snappedPositionX}px`;
        chip.style.top = `${baseY}px`;
        
        updateStackPositions(snappedPositionX, baseY);
    }

    function onMouseUp(upEvent) {
        const finalLeft = parseInt(chip.style.left);
        const finalTop = parseInt(chip.style.top);

        // Calculate source and destination points
        const fromPoint = calculatePoint(initialX);
        const toPoint = calculatePoint(finalLeft);

        console.log('Move calculation:', {
            from: fromPoint,
            to: toPoint,
            initialX,
            finalLeft,
            pieceId: chip.id,
            color: myColor,
            dice: currentRoll
        });

        // Store move info for error handling
        lastMovedChipInfo = {
            chip: chip,
            initialX: initialX,
            initialY: initialY,
            initialZ: initialZ,
            stackPositions: initialStackPositions
        };

        // Emit move to server
        socket.emit('movePiece', {
            roomId: currentRoom,
            pieceId: chip.id,
            from: fromPoint,
            to: toPoint
        });

        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
});

function resetChips() {
    document.querySelectorAll('.chip, .chip_b').forEach(chip => {
        const [left, top] = chip.getAttribute('data-initial-position').split(',');
        chip.style.left = `${left}px`;
        chip.style.top = `${top}px`;
        chip.style.zIndex = '3';
    });
}

socket.emit('createRoom');
socket.on('updatePlayerStatuses', (statuses) => {
    console.log('Player statuses updated:', statuses);

    const player = statuses.find(p => p.id === socket.id);
    if (player && player.status === 'InGame' && !currentRoom) {
        console.log("Waiting for room assignment...");
    }
});

// Handle errors
socket.on('error', (data) => {
    console.error('Game error:', data.message);
    document.getElementById('status_display').textContent = `Error: ${data.message}`;
    
    if (lastMovedChipInfo) {
        const { chip, initialX, initialY, initialZ, stackPositions } = lastMovedChipInfo;
        
        // Restore the dragged chip position
        chip.style.left = `${initialX}px`;
        chip.style.top = `${initialY}px`;
        chip.style.zIndex = initialZ;

        // Restore all pieces in the original stack
        stackPositions.forEach(pos => {
            pos.piece.style.left = `${pos.x}px`;
            pos.piece.style.top = `${pos.y}px`;
            pos.piece.style.zIndex = pos.z;
        });

        // Update stack positions
        updateStackPositions(initialX, initialY);

        // Clear the last moved chip info
        lastMovedChipInfo = null;
    }
});