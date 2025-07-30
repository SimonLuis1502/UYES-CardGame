// Lobby waiting room logic and dynamic player list updates
import { io } from "/socket.io/socket.io.esm.min.js";
import { helpFunctionality } from './utils/helpMenu.js';
const socket = io();
let currentGameCode;

/** Entry point for the lobby page. */
export async function initLobbyHost() {
    const res = await fetch("/api/lobbyData");
    const gameData = await res.json();
    let nameMap = gameData.nameMap || {};

    currentGameCode = gameData.code;
    const playerName = gameData.name;
    const maxPlayers = gameData.players;
    const role = gameData.role;
    let hostId = gameData.hostId || (role === "host" ? gameData.id : null);

    socket.emit("join-lobby", currentGameCode, playerName, maxPlayers);

    const codeElement = document.getElementById("game-code");
    codeElement.textContent = `Game-Code: #${currentGameCode || "000000"}`;

    if (role === "joiner") {
        document.body.classList.add("Joiner");
    }

    renderLobby(gameData, gameData.playerList, hostId, nameMap);

    // Update player list and host when someone joins or leaves
    socket.on("update-lobby", (players, _maxPlayers, _avatars, newHostName, newHostId) => {
        hostId = newHostId;
        nameMap = Object.fromEntries(players.map(p => [p.id, p.name]));
        renderLobby(gameData, players, hostId, nameMap);
        // Disable start button until enough players joined
        checkIfLobbyFull(players, maxPlayers);
        if (gameData.id === hostId) {
            document.body.classList.remove("Joiner");
        } else {
            document.body.classList.add("Joiner");
        }
    });
    socket.on('host-assigned', () => {
        alert('You are now the host.');
        document.body.classList.remove('Joiner');
    });

    socket.on("lobby-not-found", () => {
        alert("❌ Lobby not found");
        window.location.href = "/start/game";
    });

    socket.on("lobby-full", () => {
        alert("❌ Lobby is full");
        window.location.href = "/start/game";
    });

    socket.on("name-taken", () => {
        alert("❌ Name already taken");
        window.location.href = "/start/game";
    });

    socket.on("game-in-progress", () => {
        alert("Game already in progress");
        window.location.href = "/start/game";
    });


    document.getElementById("refresh-code-button")?.addEventListener("click", async () => {
        const newCode = Math.floor(100000000 + Math.random() * 900000000).toString();
        const oldCode = currentGameCode;

        try {
            const res = await fetch("/api/gameCode", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: newCode })
            });
            if (!res.ok) throw new Error();
            socket.emit("change-code", oldCode, newCode);
            currentGameCode = newCode;
            codeElement.textContent = `Game-Code: #${newCode}`;
        } catch {
            console.error("❌ Error while updating the code");
        }
    });

    socket.on("kicked", () => {
        alert("You were removed from the lobby.");
        window.location.href = "/start/game";
    });

    // Refresh code display when host changes the lobby code
    socket.on("update-code", async (newCode) => {
        currentGameCode = newCode;
        codeElement.textContent = `Game-Code: #${newCode}`;
        await fetch("/api/gameCode", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: newCode })
        });
    });


    const startBtn = document.getElementById("startGameplay");
    if (startBtn) {
        startBtn.addEventListener("click", () => {
            socket.emit("start-game", currentGameCode);
        });
    }

    socket.on("start-game-error", (msg) => {
        alert(msg);
    });

    const redirectToGame = () => {
        if (window.location.pathname !== "/gameplay") {
            window.location.href = "/gameplay";
        }
    };

    socket.on("game-started", redirectToGame);
    socket.on("player-turn", redirectToGame);


    // Register generic help/exit menu handlers
    helpFunctionality(socket, () => currentGameCode, gameData.id);
}








function renderLobby(gameData, playerList, hostId, nameMap) {
    const container = document.getElementById("player-lobby-container");
    container.innerHTML = "";
    const lobbyTag = document.createElement("h2");
    lobbyTag.innerHTML = "Lobby";
    container.appendChild(lobbyTag);

    for (let i = 0; i < gameData.players; i++) {
        const playerDiv = document.createElement("div");
        playerDiv.className = "player-lobby-fields";

        const data = playerList[i];
        if (data) {
            const isCurrent = data.id === gameData.id;
            const label = data.id === hostId ? "host:" : "";
            playerDiv.innerHTML = `
                ${label ? `<p id="hostTag">${label}</p>` : ""}
                <p class="takenSlot">${data.name}${isCurrent ? " (you)" : ""}</p>
                ${isCurrent ? "" : `<button class="removePlayerButton" data-player-id="${data.id}">Kick</button>`}
            `;
        } else {
            playerDiv.innerHTML = `
                <p class="openSlot">Player${i + 1}...</p>`;
        }

        container.appendChild(playerDiv);
    }

    // Kick buttons for the host
    document.querySelectorAll(".removePlayerButton[data-player-id]").forEach(btn => {
        btn.addEventListener("click", () => {
            const playerToKick = btn.getAttribute("data-player-id");
            socket.emit("kick-player", currentGameCode, playerToKick);
        });
    });
}

function checkIfLobbyFull(currentPlayers, maxPlayers) {
    const startBtn = document.getElementById("startGameplay");
    if (startBtn) {
        // Start button is only active when lobby is full
        if (currentPlayers.length >= maxPlayers) {
            startBtn.classList.remove("notFull");
        } else {
            startBtn.classList.add("notFull");
        }
    }
}





