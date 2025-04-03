const ExcelJS = require('exceljs');
const path = require('path');

async function saveGameState(gameState) {
    const filePath = path.join(__dirname, 'game_state.xlsx');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('GameState');

    worksheet.addRow(['Player', 'Status']);

    if (gameState.length > 0) {
        gameState.forEach(player => {
            worksheet.addRow([player.name, player.status]);
        });
    } else {
        console.log("Game state is empty. No data to save.");
    }

    try {
        await workbook.xlsx.writeFile(filePath);
        console.log(`File saved: ${filePath}`);
    } catch (error) {
        console.error("Error saving file:", error);
    }
}

module.exports = { saveGameState };