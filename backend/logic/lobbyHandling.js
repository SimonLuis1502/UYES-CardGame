/**
 * Helpers for lobby creation. Random "funny" names are used when a
 * player joins without specifying one. Lobbies are identified by a
 * nine digit game code.
 */
export const MAX_NAME_LENGTH = 20;
const funnyNames = [
    "U-Norris", "Taylor Swift", "UNO DiCaprio", "Cardi Bitch",
    "Elon Shuffle", "Snoop Draw Two", "Oprah Skipfrey", "Keanu Draw-Reeves",
    "Barack Ob-Draw-ma", "Harry Skipper", "Justin Blieber", "Reverse Ninja",
    "The Rock’n’Draw", "Skipney Spears", "UNOwen Wilson", "Kim Kardashian",
    "Lady Gaga", "Ed Sheeran", "Will Smith", "UNO Clarkson",
    "Shufflon Musk", "UNOzilla", "UNOferatu", "Beyoncé Drawoncé",
    "Weekend Skip", "UNOkeem Phoenix", "Kardashian West", "UNOthanos",
    "UNOmar Khaled", "UNOna Lisa", "Lil Draw-X", "Vin Unocard",
    "UNO Maccaroni", "Uno Avenger", "UNO'Neill Shaq", "UNO McGregor",
    "UNO Bieber Fever", "UNO-Tokio Drift", "UNOlectro Deluxe", "Cardzilla Jr.",
    "UNO Reloaded", "Uno Commander", "Draw-cula", "Skip Dogg",
    "UNO-Kenobi", "Card-i B", "UNO-Licious", "Skip Skywalker",
    "Card Solo", "Uno-Wan Kenobi", "Draw-nado", "Skip-a-licious",
    "UNO-Mite", "Cardzilla", "The Shuffle King", "Draw Master Flash",
    "UNO-Pocalypse", "Skip-N-Go", "Reverse Ripley"
].filter((name) => name.length <= MAX_NAME_LENGTH);
function getRandomName() {
    return funnyNames[Math.floor(Math.random() * funnyNames.length)];
}


/**
 * Generate a random nine digit lobby code.
 * @returns {string} numeric string used to join a lobby
 */
export function generateGameCode() {
    return Math.floor(100000000 + Math.random() * 900000000).toString();
}

export function generatePlayerId() {
    return Math.random().toString(36).slice(2, 10);
}

/**
 * Create meta information for a new lobby.
 * @param {{name?:string, settings:object}} param0 player name and lobby settings
 * @returns {{gameId:string, playerName:string, role:string, settings:object}}
 */
export function createLobby({ name, settings }) {
    const gameId = generateGameCode();
    const trimmedName = name?.trim();
    if (trimmedName && trimmedName.length > MAX_NAME_LENGTH) {
        throw new Error("Name too long");
    }
    const playerName = trimmedName || getRandomName();

    const playerId = Math.random().toString(36).slice(2, 10);


    return {
        gameId,
        playerId,
        playerName,
        role: "host",
        settings
    };
}

