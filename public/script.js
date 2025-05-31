const socket = io();
const caseWidth = 70; // Ширина одного кейса
const caseHeight = 125; // Висота одного кейса
let gameActive = false;
let currentRoom = null;

// Кнопка старту гри
document.querySelector('.button_1').addEventListener('click', () => {
    gameActive = !gameActive; 

    if (gameActive) {
        socket.emit('startGame');
        socket.emit('play');
        const playButton = document.querySelector('.button_1');
        playButton.classList.add('active');
    } else {
        socket.emit('stopGame');
        socket.emit('setOnlineStatus');

        resetChips();
        const playButton = document.querySelector('.button_1');
        playButton.classList.remove('active');
    }
});

// Обробка натискання на фішки
document.querySelectorAll('.chip, .chip_b').forEach(chip => {
    chip.addEventListener('mousedown', (e) => {
        if (!gameActive) return;
        const chipId = chip.id;
        const initialX = e.clientX;
        const initialY = e.clientY;

        // Отримуємо позицію фішки
        const chipRect = chip.getBoundingClientRect();
        const offsetX = initialX - chipRect.left; // Відстань від курсора до лівого краю фішки
        const offsetY = initialY - chipRect.top; // Відстань від курсора до верхнього краю фішки

        function onMouseMove(moveEvent) {
            dragChip(moveEvent, chip, offsetX, offsetY);
        }

        function onMouseUp() {
            // Визначення остаточної позиції
            const finalLeft = parseInt(chip.style.left);
            const snappedPosition = Math.round(finalLeft / caseWidth) * caseWidth;
            if(finalLeft > 358)
            {
                chip.style.left = `${snappedPosition + 18}px`
            } else
            {
                chip.style.left = `${snappedPosition + 8}px`;
            }
            // Відправка нових координат на сервер
            socket.emit('movePiece', {
                roomId: currentRoom,
                pieceId: chipId,
                left: snappedPosition,
                top: parseInt(chip.style.top) || 0
            });

            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
});

// Функція для перетягування фішки
function dragChip(e, chip, offsetX, offsetY) {
    const mouseX = e.clientX;
    const mouseY = e.clientY;

    let newPositionX = mouseX - offsetX; // Нове положення по X з урахуванням зміщення
    let newPositionY = mouseY - offsetY; // Нове положення по Y з урахуванням зміщення

    let minPositionX = 8; // Мінімальна позиція по X
    let maxPositionX = 778; // Максимальна позиція по X

    // Встановлюємо обмеження для осі X
    if (newPositionX >= minPositionX && newPositionX <= maxPositionX) {
        let snappedPositionX = Math.round(newPositionX / caseWidth) * caseWidth;
        chip.style.left = `${snappedPositionX}px`;

        // Визначення позиції Y
        const chipTop = parseInt(chip.style.top) || 0;

        // Розміщення фішки в залежності від ряду
        if ((chip.classList.contains('chip') || chip.classList.contains('chip_b'))  && newPositionY < 300) {
            chip.style.top = '0px'; // Верхній ряд
        } else if((chip.classList.contains('chip') || chip.classList.contains('chip_b'))  && newPositionY > 300) {
            chip.style.top = '572px'; // Нижній ряд
        }
    }
}

function resetChips() {
    const chips = document.querySelectorAll('.chip, .chip_b'); 
    chips.forEach(chip => {
        const initialPosition = chip.getAttribute('data-initial-position').split(','); 
        const top = initialPosition[1].trim(); 
        const left = initialPosition[0].trim(); 

        chip.style.top = `${top}px`;
        chip.style.left = `${left}px`;
    });
}

// Оновлення гри
socket.on('updateGameState', (gameState) => {
    const roomData = gameState.find(player => player.roomId === currentRoom);
    if (!roomData) return;

    roomData.pieces.forEach(piece => {
        const chip = document.getElementById(piece.id);
        if (chip) {
            chip.style.left = `${piece.left}px`;
            chip.style.top = `${piece.top}px`;
        }
    });
});

socket.on('updatePiece', ({ pieceId, left, top }) => {
    console.log(`Received move update: ${pieceId}, left: ${left}, top: ${top}`);
    const chip = document.getElementById(pieceId);
    if (chip) {
        chip.style.left = `${left}px`;
        chip.style.top = `${top}px`;
    }
});

socket.emit('createRoom');
socket.on('joinRoom', (roomId) => {
    console.log(`Ви приєдналися до кімнати: ${roomId}`);
    sessionStorage.setItem('currentRoom', roomId);
    currentRoom = roomId;
});

socket.on('updatePlayerStatuses', (statuses) => {
    console.log('Player statuses updated:', statuses);

    const player = statuses.find(p => p.id === socket.id);
    if (player && player.status === 'InGame' && !currentRoom) {
        console.log("Waiting for room assignment...");
    }
});