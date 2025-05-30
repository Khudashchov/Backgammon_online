// const ExcelJS = require('exceljs');
// const path = require('path');

// async function saveGameState(gameState) {
//     const filePath = path.join(__dirname, 'data', 'game_state.xlsx');
//     const workbook = new ExcelJS.Workbook();
//     const worksheet = workbook.addWorksheet('GameState');

//     worksheet.addRow(['Socket ID', 'Status', 'Room ID']);
//     gameState.forEach(player => {
//         worksheet.addRow([
//             player.id,
//             player.status,
//             player.roomId
//         ]);
//     });
    

//     try {
//         await workbook.xlsx.writeFile(filePath);
//         console.log(`Файл збережено: ${filePath}`);
//     } catch (error) {
//         console.error("Error saving file:", error);
//     }
// }

// async function saveRoom(rooms) {
//     const workbook = new ExcelJS.Workbook();
//     const worksheet = workbook.addWorksheet('Rooms');

//     worksheet.addRow(['Кімната', 'Гравець 1', 'Гравець 2']);
//     rooms.forEach(room => {
//         worksheet.addRow([room.id, room.players[0], room.players[1]]);
//     });

//     const filePath = path.join(__dirname, 'data', 'rooms.xlsx');
//     await workbook.xlsx.writeFile(filePath);
//     console.log('Дані кімнат збережено в rooms.xlsx');
// }


const { MongoClient } = require('mongodb');

const url = 'mongodb://localhost:27017';
const dbName = 'backgammon';

async function saveGameState(gameState) {
    const client = new MongoClient(url);
    await client.connect();
    const db = client.db(dbName);
    const usersCollection = db.collection('game_state'); // Зберігаємо в колекції game_state

    try {
        // Додавання нових даних (можна використовувати upsert для оновлення)
        const players = gameState.map(player => ({
            socketId: player.id,
            status: player.status,
            roomId: player.roomId
        }));

        // Використання upsert для оновлення або вставки
        for (const player of players) {
            await usersCollection.updateOne(
                { socketId: player.socketId },
                { $set: player },
                { upsert: true }
            );
        }

        console.log('Стан гри збережено в MongoDB');
    } catch (error) {
        console.error("Error saving game state:", error);
    } finally {
        await client.close();
    }
}

async function saveRoom(rooms) {
    const client = new MongoClient(url);
    await client.connect();
    const db = client.db(dbName);
    const roomsCollection = db.collection('rooms');

    try {
        // Додавання нових даних
        const roomDocs = rooms.map(room => ({
            roomId: room.id,
            players: room.players,
            gameStatus: 'waiting' // або інший статус за потреби
        }));

        // Використання upsert для оновлення або вставки
        for (const room of roomDocs) {
            await roomsCollection.updateOne(
                { roomId: room.roomId },
                { $set: room },
                { upsert: true }
            );
        }

        console.log('Дані кімнат збережено в MongoDB');
    } catch (error) {
        console.error("Error saving room data:", error);
    } finally {
        await client.close();
    }
}

module.exports = { saveRoom, saveGameState };

