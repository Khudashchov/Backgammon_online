const ExcelJS = require('exceljs');
const path = require('path');

async function saveGameState(gameState) {
    const filePath = path.join(__dirname, 'data', 'game_state.xlsx');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('GameState');

    worksheet.addRow(['Socket ID', 'Status', 'Room ID']);
    gameState.forEach(player => {
        worksheet.addRow([
            player.id,
            player.status,
            player.roomId
        ]);
    });
    

    try {
        await workbook.xlsx.writeFile(filePath);
        console.log(`File saved: ${filePath}`);
    } catch (error) {
        console.error("Error saving file:", error);
    }
}

async function saveRoomToExcel(rooms) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Rooms');

    worksheet.addRow(['Кімната', 'Гравець 1', 'Гравець 2']);
    rooms.forEach(room => {
        worksheet.addRow([room.id, room.players[0], room.players[1]]);
    });

    await workbook.xlsx.writeFile('rooms.xlsx');
    console.log('Дані кімнат збережено в rooms.xlsx');
}

module.exports = { saveRoomToExcel, saveGameState };