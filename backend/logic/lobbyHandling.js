/**
 * Helpers for lobby creation. Random "funny" names are used when a
 * player joins without specifying one. Lobbies are identified by a
 * nine digit game code.
 */
const funnyNames = [
    "U-Norris", "Taylor Swift", "UNO DiCaprio", "Cardi Bitch",
    "Elon Shuffle", "Snoop Draw Two", "Oprah Skipfrey", "Keanu Draw-Reeves",
    "Barack Ob-Draw-ma", "Harry Skipper", "Justin Blieber", "Reverse Kardashian",
    "The Rock’n’Draw", "Skipney Spears", "UNOwen Wilson", "Kim Kardashian",
    "Lady Gaga", "Ed Sheeran", "Will Smith", "UNO Clarkson",
    "Shufflon Musk", "UNOzilla", "UNOferatu", "Beyoncé Drawoncé",
    "The Weeknd Reversed", "UNOkeem Phoenix", "Kardashian West", "UNOthanos",
    "UNOmar Khaled", "UNOna Lisa", "Lil Draw-X", "Vin Unocard",
    "UNO Maccaroni", "UNOndo der Vergelter", "UNO'Neill Shaq", "UNO McGregor",
    "UNO Bieber Fever", "UNO-Tokio Drift", "UNOlectro Deluxe", "UNOzilla vs Cardzilla",
    "UNO Reloaded", "UNOmander Reversal", "Draw-cula", "Skip Dogg",
    "UNO-Kenobi", "Card-i B", "UNO-Licious", "Skip Skywalker",
    "Card Solo", "Uno-Wan Kenobi", "Draw-nado", "Skip-a-licious",
    "UNO-Mite", "Cardzilla", "The Shuffle King", "Draw Master Flash",
    "UNO-Pocalypse", "Skip-N-Go", "Reverse Ripley"
]
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
    const playerName = name?.trim() || getRandomName();

    const playerId = Math.random().toString(36).slice(2, 10);


    return {
        gameId,
        playerId,
        playerName,
        role: "host",
        settings
    };
}

