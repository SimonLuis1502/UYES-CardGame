// Settings page where the host can adjust card rules before starting
import { io } from "/socket.io/socket.io.esm.min.js";
import { setupAmountControls, setupSelectAllCheckbox } from './utils/uiHelpers.js';

/** Initialize lobby settings controls and emit changes to players. */
export function initChangeSettings() {
    const socket = io();
    let gameCode;
    let playerName;

    document.getElementById("createBackBtn")?.addEventListener("click", () => {
        window.history.back();
    });
    setupAmountControls('cardSlider', 'cardCount', '.subtract', '.add');
    setupSelectAllCheckbox('#special-cards input[type="checkbox"]', 'check-all');

    fetch('/api/lobbyData').then(r => r.json()).then(data => {
        gameCode = data.code;
        playerName = data.name;
        socket.emit('join-lobby', gameCode, playerName);
        document.getElementById('playerSlider').value = data.players;
        document.getElementById('playerCount').textContent = data.players;
        const s = data.settings || {};
        document.getElementById('cardSlider').value = s.cards || 7;
        document.getElementById('cardCount').textContent = s.cards || 7;
        document.getElementById('draw2').checked = !!s.draw2;
        document.getElementById('reverse').checked = !!s.reverse;
        document.getElementById('skip').checked = !!s.skip;
        document.getElementById('wild').checked = !!s.wild;
        document.getElementById('wild+4').checked = !!s.wild4;
        const all = Array.from(document.querySelectorAll('#special-cards input[type="checkbox"]'))
            .filter(cb => cb.id !== 'check-all')
            .every(cb => cb.checked);
        document.getElementById('check-all').checked = all;
    });

    document.getElementById('start-new-game')?.addEventListener('click', async (e) => {
        e.preventDefault();
        const settings = {
            cards: document.getElementById('cardSlider').value,
            draw2: document.getElementById('draw2').checked,
            reverse: document.getElementById('reverse').checked,
            skip: document.getElementById('skip').checked,
            wild: document.getElementById('wild').checked,
            wild4: document.getElementById('wild+4').checked
        };
        await fetch('/api/updateSettings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ settings })
        });
        socket.emit('start-game', gameCode);
        window.location.href = '/gameplay';
    });
}
