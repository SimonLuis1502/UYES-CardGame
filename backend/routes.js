import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createLobby, generatePlayerId } from './logic/lobbyHandling.js';
import { getLobbyMeta } from './logic/socketHandler.js';
import { setSession } from './jwtSession.js';




const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Redirect the base URL to the start page
router.get('/', (req, res) => {
    res.redirect('/start');
});

const htmlRoutes = {
    '/start': 'startSite.html',
    '/about': 'aboutPage.html',
    '/help': 'helpPage.html',
    '/rules': 'rulesPage.html',
    '/start/game': 'chooseLobby.html',
    '/start/game/create': 'createGame.html',
    '/change-settings': 'changeSettings.html',
    '/start/game/join': 'joinLobby.html',
    '/lobby': 'lobby.html',
    '/gameplay': 'gameplay.html'
};

for (const [route, file] of Object.entries(htmlRoutes)) {
    // Serve the matching HTML file for each path
    router.get(route, (req, res) => {
        res.sendFile(path.join(__dirname, '../public/html', file));
    });
}

// Return session and lobby information for the current player
router.get("/api/lobbyData", (req, res) => {
    if (!req.session) {
        return res.status(400).json({ error: "No active session" });
    }

    const lobbyMeta = getLobbyMeta(req.session.gameId);

    const players = lobbyMeta?.players?.map(id => ({ id, name: lobbyMeta.names[id] })) || [];
    res.json({
        code: req.session.gameId,
        name: req.session.playerName,
        id: req.session.playerId,
        players: lobbyMeta?.maxPlayers || req.session.settings?.players || 5,
        role: req.session.role,
        playerList: players,
        avatars: lobbyMeta?.avatars || {},
        host: lobbyMeta ? lobbyMeta.names[lobbyMeta.hostId] : null,
        hostId: lobbyMeta?.hostId || null,
        nameMap: lobbyMeta?.names || {},
        settings: lobbyMeta?.settings || req.session.settings || {}
    });
});

// Update lobby settings when the host changes them
router.post('/api/updateSettings', (req, res) => {
    if (!req.session) {
        return res.status(400).json({ error: 'No active session' });
    }

    const lobby = getLobbyMeta(req.session.gameId);
    if (!lobby) {
        return res.status(404).json({ error: 'Lobby not found' });
    }

    const incoming = req.body.settings || {};
    const { players, ...other } = incoming;
    lobby.settings = { ...lobby.settings, ...other };
    req.session.settings = lobby.settings;
    setSession(res, req.session);

    res.json({ success: true });
});

// Create a new lobby and store session data
router.post("/api/createGame", (req, res) => {
    const lobby = createLobby(req.body);

    req.session.gameId = lobby.gameId;
    req.session.playerName = lobby.playerName;
    req.session.playerId = lobby.playerId;
    req.session.role = "host";
    req.session.settings = lobby.settings;
    setSession(res, req.session);

    res.redirect("/lobby");
});

// Join an existing lobby by game code
router.post("/api/joinGame", (req, res) => {
    const code = String(req.body.code || "").trim();
    const name = (req.body.playerName || "").trim();

    if (!/^[0-9]{9}$/.test(code)) {
        return res.status(400).json({ error: "Invalid game code" });
    }

    const lobbyMeta = getLobbyMeta(code);
    if (!lobbyMeta) {
        return res.status(404).json({ error: "Lobby not found" });
    }

    const funnyNames = ["Cardy B", "Drawzilla", "Reverso", "Captain Uno", "Skipz"];
    const getRandomName = () => funnyNames[Math.floor(Math.random() * funnyNames.length)];

    req.session.gameId = code;
    setSession(res, req.session);
    req.session.playerName = name?.trim() !== "" ? name : getRandomName();
    req.session.playerId = generatePlayerId();
    req.session.role = "joiner";
    setSession(res, req.session);

    res.redirect("/lobby");
});

// Change the lobby code while keeping players connected
router.put("/api/gameCode", (req, res) => {
    if (!req.session) {
        return res.status(400).json({ error: "No active session" });
    }

    const code = String(req.body.code || "").trim();

    if (!/^[0-9]{9}$/.test(code)) {
        return res.status(400).json({ error: "Invalid game code" });
    }

    req.session.gameId = code;
    setSession(res, req.session);

    res.json({ success: true });
});

export default router;
