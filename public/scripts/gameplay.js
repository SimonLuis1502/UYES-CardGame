// Core gameplay logic: manages drag & drop and real-time game events
import { io } from "/socket.io/socket.io.esm.min.js";
import { helpFunctionality } from './utils/helpMenu.js';
const socket = io();
let gameCode;
let playerName;

let playerAvatars = {};
let playerList = [];
let playerId;
let nameMap = {};

let maxPlayers;
let avatarSlots = [];

let topDiscard = null;
let myHand = [];

let myTurn = false;
let isClockwise = true;
let turnInterval = null;
let drawStack = 0;

let pendingWildCard = null;
let gameStarted = false;
let playerOrientation = {};
const slotOrientations = ['leftTop', 'rightTop', 'leftDown', 'rightDown'];


export async function initGameplay() {
    let data;
    try {
        const res = await fetch('/api/lobbyData');
        if (!res.ok) throw new Error('Request failed');
        data = await res.json();
    } catch (err) {
        alert('❌ Error loading lobby data');
        console.error(err);
        window.location.href = '/start/game';
        return;
    }

    gameCode = data.code;
    playerName = data.name;
    playerId = data.id;
    nameMap = data.nameMap || {};
    playerAvatars = data.avatars || {};
    playerList = (data.playerList || []).map(p => p.id);

    const role = data.role;
    if (role !== 'host') {
        document.body.classList.add('Joiner');
    } else {
        document.body.classList.remove('Joiner');
    }

    const buttons = document.getElementById('ending-buttons');
    if (buttons) {
        buttons.style.display = 'none';
    }

    maxPlayers = data.players;

    setupAvatarSlots();
    setAvatarImages();

    socket.on('deal-cards', renderHand);
    socket.on('player-turn', highlightTurn);
    socket.on('card-played', onCardPlayed);
    socket.on('cards-drawn', handleCardsDrawn);
    socket.on('game-end', showWinner);
    socket.on('update-hand-counts', updateHandCounts);
    socket.on('player-uyes', toggleUyesBubble);
    socket.on('order-reversed', handleOrderReversed);
    socket.on('game-started', resetGameUI);
    socket.on('avatar-changed', ({ player, file }) => {
        playerAvatars[player] = file;
        setAvatarImages();
    });
    socket.on('hand-limit-reached', () => {
        alert('Reached maximum amount of cards in hand.');
    });
    socket.on('player-left', ({ players, counts, player }) => {
        if (player && player !== playerId) {
            alert(`${nameMap[player]} left the game.`);
        }
        playerList = players.map(p => p.id);
        counts.forEach(c => nameMap[c.id] = c.name);
        updateHandCounts(counts);
    });
    socket.on('kicked', () => {
        alert('You were removed from the lobby.');
        window.location.href = '/start/game';
    });
    socket.on('host-assigned', () => {
        alert('You are now the host.');
        document.body.classList.remove('Joiner');
    });

    socket.emit('join-lobby', gameCode, playerName);

    if (role === 'host') {
        socket.emit('start-game', gameCode);
    }

    const drawPile = document.getElementById('draw-pile');
    drawPile?.addEventListener('click', () => {
        if (myTurn) {
            socket.emit('draw-card', gameCode);
        }
    });
    // Allow dragging from the draw pile to pick up a card
    drawPile?.addEventListener('dragstart', (e) => {
        if (!myTurn) {
            e.preventDefault();
            return;
        }
        e.dataTransfer.setData('text/plain', 'draw');
    });

    const handContainer = document.getElementById('player-hand-container');
    // Dropping the draw pile on the hand triggers a draw
    handContainer?.addEventListener('dragover', (e) => {
        
        if (myTurn) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        }
    }, true);
    handContainer?.addEventListener('drop', (e) => {
        if (myTurn && e.dataTransfer.getData('text/plain') === 'draw') {
            e.preventDefault();
            socket.emit('draw-card', gameCode);
        }
    }, true);

    const discard = document.getElementById('discard-pile');
    // Target area for playing a card
    discard?.addEventListener('dragover', (e) => {
        e.preventDefault();
    });
    discard?.addEventListener('drop', (e) => {
        e.preventDefault();
        const data = e.dataTransfer.getData('application/json');
        if (data) {
            try {
                const card = JSON.parse(data);
                playCard(card);
            } catch { }
        }
    });

    const uyesBtn = document.getElementById('UYES');
    uyesBtn?.addEventListener('click', () => {
        if (myTurn) {
            socket.emit('uyes', gameCode);
        }
    });

    const changeAvatarBtn = document.getElementById('changeAvatar');
    changeAvatarBtn?.addEventListener('click', () => {
        changeAvatarBtn.classList.add('grow');
        socket.emit('change-avatar', gameCode);
    });
    changeAvatarBtn?.addEventListener('animationend', () => {
        changeAvatarBtn.classList.remove('grow');
    });

    const changeSettingsBtn = document.querySelector('#ending-buttons .ending:first-child');
    changeSettingsBtn?.addEventListener('click', () => {
        if (!document.body.classList.contains('Joiner')) {
            window.location.href = '/change-settings';
        }
    });

    const playAgainBtn = document.querySelector('#ending-buttons .ending:nth-child(2)');
    playAgainBtn?.addEventListener('click', () => {
        if (!document.body.classList.contains('Joiner')) {
            socket.emit('start-game', gameCode);
        }
    });

    const backHomeBtn = document.getElementById('backHome');
    backHomeBtn?.addEventListener('click', () => {
        if (!document.body.classList.contains('Joiner')) {
            socket.emit('close-lobby', gameCode);
        }
        window.location.href = '/start/game';
    });

    const exitBtn = document.getElementById('ExitGameBtn');
    const exitDiv = document.getElementById('submitLeaving');
    const stopLeaving = document.getElementById('stopLeaving');
    const leave = document.getElementById('leave');

    exitBtn?.addEventListener('click', () => exitDiv?.classList.add('exitOpen'));
    stopLeaving?.addEventListener('click', () => exitDiv?.classList.remove('exitOpen'));
    leave?.addEventListener('click', () => {
        socket.emit('leave-game', gameCode, playerId);
        window.location.href = '/start/game';
    });

    helpFunctionality(socket, () => gameCode, playerId);

    const overlay = document.getElementById('color-overlay');
    overlay?.querySelectorAll('[data-color]').forEach(el => {
        el.addEventListener('click', () => {
            const color = el.getAttribute('data-color');
            if (pendingWildCard) {
                socket.emit('play-card', gameCode, { ...pendingWildCard, chosenColor: color });
                pendingWildCard = null;
                overlay.classList.remove('active');
            }
        });
    });

}

function displayValue(value) {
    switch (value) {
        case 'draw2':
            return '2+';
        case 'wild4':
            return '4+';
        case 'reverse':
            return '<i class="fas fa-retweet specialCard"></i>';
        case 'skip':
            return '<i class="fas fa-ban specialCard"></i>';
        case 'wild':
            return 'W';
        default:
            return value;
    }
}

function renderHand(cards) {
    myHand = cards.slice();
    const container = document.getElementById('player-hand-container');
    container.innerHTML = '';
    for (const card of cards) {
        const span = document.createElement('span');
        span.className = `card normal ${card.color}`;
        span.dataset.color = card.color;
        span.dataset.value = card.value;
        span.innerHTML = `<span><span>${displayValue(card.value)}</span></span>`;
        const playable = myTurn && isCardPlayable(card);
        span.draggable = playable;
        if (playable) {
            // Allow dragging playable cards to the discard pile
            span.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('application/json', JSON.stringify(card));
            });
            span.addEventListener('click', () => {
                playCard({ color: card.color, value: card.value });
            });
        } else {
            span.classList.add('unplayable');
        }

        span.addEventListener('mouseenter', () => {
            span.classList.add('hovered');
            const prev = span.previousElementSibling;
            if (prev && prev.classList.contains('card')) {
                prev.classList.add('prev-hovered');
            }
        });

        span.addEventListener('mouseleave', () => {
            span.classList.remove('hovered');
            const prev = span.previousElementSibling;
            if (prev && prev.classList.contains('card')) {
                prev.classList.remove('prev-hovered');
            }
        });
        container.appendChild(span);
    }
}

// Update UI when a new player turn begins
function highlightTurn(data) {
    const name = typeof data === 'string' ? data : data.player;
    const startedAt = typeof data === 'string' ? Date.now() : data.startedAt;
    drawStack = typeof data === 'object' && data.drawStack ? data.drawStack : 0;
    myTurn = name === playerId;

    startTurnTimer(startedAt);

    while (playerList.length && playerList[0] !== name) {
        playerList.push(playerList.shift());
    }

    const turnsUntil = Math.max(0, playerList.indexOf(playerId));
    const counter = document.getElementById('roundCountTurn');
    if (counter) counter.textContent = String(turnsUntil);

    const avatars = document.querySelectorAll('.avatar, #own-avatar');
    avatars.forEach(a => {
        const match = a.dataset.player === name || a.dataset.playerId === name;
        a.classList.toggle('active', !!match);
    });
    document.body.classList.toggle('my-turn', name === playerId);
    renderHand(myHand);
}

function startTurnTimer(startedAt = Date.now()) {
    clearInterval(turnInterval);
    const timerEl = document.getElementById('timer');
    const end = startedAt + 30000;

    function update() {
        const remaining = Math.max(0, Math.ceil((end - Date.now()) / 1000));
        if (timerEl) timerEl.textContent = `${remaining}s`;
        if (remaining <= 0) {
            clearInterval(turnInterval);
            if (myTurn) {
                socket.emit('draw-card', gameCode);
            }
        }
    }

    update();
    turnInterval = setInterval(update, 1000);
}

function setAvatarImages() {
    const order = [2,0,1,3];
    let idx = 0;
    for (const n of playerList) {
        if (n === playerId) continue;
        const slotIndex = order[idx] ?? idx;
        const el = document.getElementById(`player${slotIndex + 1}`);
        if (el) {
            el.dataset.playerId = n;
            const file = playerAvatars[n];
            if (file) {
                el.style.backgroundImage = `url('/images/avatars/${file}')`;
            }
        }
        idx++;
    }
    const own = document.getElementById('own-avatar');
    if (own) {
        own.dataset.player = playerId;
        own.dataset.orientation = 'self';
        const file = playerAvatars[playerId];
        if (file) {
            own.style.backgroundImage = `url('/images/avatars/${file}')`;
        }
        if (!own.querySelector('.uyes-bubble')) {
            const bubble = document.createElement('div');
            bubble.className = 'uyes-bubble';
            bubble.textContent = 'UYES!';
            own.appendChild(bubble);
        }
    }
}

function updateDiscard({ player, card }) {
    const pile = document.querySelector('#discard-pile span.card');
    if (pile) {
        const color = card.color === 'wild' ? (card.chosenColor || card.color) : card.color;
        pile.className = `card big ${color}`;
        pile.innerHTML = `<span><span>${displayValue(card.value)}</span></span>`;
    }
    topDiscard = card;
}

function runAnimation(type, orientation, delay = 0) {
    if (!gameStarted || !orientation) return;
    const template = document.querySelector(`.${type}.${orientation}`);
    if (!template) return;
    setTimeout(() => {
        const el = template.cloneNode(true);
        el.classList.remove('notVisible');
        template.parentNode?.appendChild(el);
        const handler = () => {
            el.removeEventListener('animationend', handler);
            el.remove();
        };
        el.addEventListener('animationend', handler);
    }, delay);
}

function animateDraw(player, count = 1) {
    const orientation = playerOrientation[player];
    for (let i = 0; i < count; i++) {
        runAnimation('draw', orientation, i * 300);
    }
}

function animateDiscard(player) {
    const orientation = playerOrientation[player];
    runAnimation('discard', orientation);
}

function handleCardsDrawn({ player, count }) {
    animateDraw(player, count);
}

function onCardPlayed(data) {
    updateDiscard(data);
    if (data.player) {
        animateDiscard(data.player);
    }
}

function isCardPlayable(card) {
    if (drawStack > 0 && card.value !== 'draw2') return false;
    if (!topDiscard) return true;
    if (card.color === 'wild') return true;
    if (topDiscard.color === 'wild') {
        return card.color === topDiscard.chosenColor;
    }
    return card.color === topDiscard.color || card.value === topDiscard.value;
}

function playCard(card) {
    if (card.color === 'wild') {
        pendingWildCard = { color: card.color, value: card.value };
        document.getElementById('color-overlay')?.classList.add('active');
    } else {
        socket.emit('play-card', gameCode, { color: card.color, value: card.value });
    }
}

function showWinner(winner) {
    gameStarted = false;
    const win = document.getElementById('winner');
    if (win) {
        const nameEl = win.querySelector('.player-name');
        if (nameEl) {
            nameEl.textContent = nameMap[winner] || winner;
        } else {
            win.textContent = nameMap[winner] || winner;
        }
        const file = playerAvatars[winner];
        if (file) {
            win.style.backgroundImage = `url('/images/avatars/${file}')`;
        }
        win.classList.remove('hidden');
    }
    document.getElementById('milchglas2')?.classList.remove('hidden');
    const endButtons = document.getElementById('ending-buttons');
    const waitText = document.getElementById('wait-for-host');
    const isHost = !document.body.classList.contains('Joiner');
    if (endButtons) {
        endButtons.classList.remove('hidden');
        endButtons.style.display = isHost ? '' : 'none';
    }
    if (waitText) {
        waitText.classList.toggle('hidden', isHost);
        waitText.style.display = isHost ? 'none' : 'flex';
    }
}

function setupAvatarSlots() {
    const container = document.getElementById('player-avatars2');
    if (!container) return;
    container.innerHTML = '';
    avatarSlots = [];
    const rows = [document.createElement('div'), document.createElement('div')];
    rows.forEach(r => r.classList.add('row'));
    const count = 4;
    for (let i = 0; i < count; i++) {
        const avatar = document.createElement('div');
        avatar.className = 'avatar inactive';
        avatar.id = `player${i + 1}`;
        avatar.dataset.playerId = '';
        avatar.dataset.orientation = slotOrientations[i];
        avatar.innerHTML = `
            <div class="player-name"></div>
            <div class="cardHands">
                <div class="avatar-row">
                    <h2 class="cardsleft"></h2>
                </div>
                <div class="avatar-row">
                    <span class="card small back"><span><span></span></span></span>
                    <span class="card small back"><span><span></span></span></span>
                </div>
            </div>`;
        const bubble = document.createElement('div');
        bubble.className = 'uyes-bubble';
        bubble.textContent = 'UYES!';
        avatar.appendChild(bubble);
        avatarSlots.push(avatar);
        const isFirstInRow = i % 2 === 0;
        if (i < 2) {
            rows[0].appendChild(avatar);
        } else {
            rows[1].appendChild(avatar);
        }
        avatar.classList.add(isFirstInRow ? 'left-hand' : 'right-hand');
    }
    rows.forEach(r => container.appendChild(r));
}

function updateHandCounts(list) {
    if (!avatarSlots.length) setupAvatarSlots();

    const myData = list.find(p => p.id === playerId);
    const ownCountEl = document.querySelector('#own-avatar .cardsleft');
    if (ownCountEl && myData) {
        ownCountEl.textContent = `${myData.count}x`;
    }

    const ids = list.map(p => p.id);
    const myIndex = ids.indexOf(playerId);
    const rotated = list
        .slice(myIndex + 1)
        .concat(list.slice(0, myIndex + 1));

    playerList = rotated.map(p => p.id);

    const others = rotated.filter(p => p.id !== playerId);

    const known = Object.keys(playerOrientation).filter(n => n !== playerId);
    const samePlayers = known.length === others.length && others.every(p => known.includes(p.id));

    if (!samePlayers) {
        const order = [2,0,1,3];
        playerOrientation = { [playerId]: 'self' };
        for (let i = 0; i < avatarSlots.length; i++) {
            const idx = order[i] ?? i;
            const slot = avatarSlots[idx];
            const data = others[i];
            if (data) {
                slot.dataset.playerId = data.id;
                slot.querySelector('.player-name').textContent = data.name;
                slot.classList.remove('inactive');
                playerOrientation[data.id] = slot.dataset.orientation;
                slot.querySelector('.cardsleft').textContent = `${data.count}x`;
            } else {
                slot.dataset.playerId = '';
                slot.querySelector('.player-name').textContent = '';
                slot.classList.add('inactive');
                slot.querySelector('.cardsleft').textContent = '';
            }
        }
        setAvatarImages();
    } else {
        for (const data of others) {
            const slot = avatarSlots.find(s => s.dataset.playerId === data.id);
            if (slot) {
                slot.querySelector('.cardsleft').textContent = `${data.count}x`;
            }

        }
    }
}

function getAvatarElement(id) {
    return document.querySelector(`#own-avatar[data-player="${id}"]`) ||
        document.querySelector(`.avatar[data-player-id="${id}"]`);
}

function toggleUyesBubble({ player, active }) {
    const avatar = getAvatarElement(player);
    if (!avatar) return;
    const bubble = avatar.querySelector('.uyes-bubble');
    if (bubble) {
        bubble.classList.toggle('active', active);
    }
}

function resetGameUI() {
    gameStarted = true;
    topDiscard = null;
    myHand = [];
    myTurn = false;
    isClockwise = true;
    drawStack = 0;
    updateDirectionIcon();

    document.querySelectorAll('.uyes-bubble.active')
        .forEach(el => el.classList.remove('active'));

    renderHand([]);

    const winnerEl = document.getElementById('winner');
    if (winnerEl) {
        winnerEl.classList.add('hidden');
        const nameEl = winnerEl.querySelector('.player-name');
        if (nameEl) nameEl.textContent = '';
        else winnerEl.textContent = '';
    }
    document.getElementById('milchglas2')?.classList.add('hidden');
    const endButtons = document.getElementById('ending-buttons');
    if (endButtons) {
        endButtons.classList.add('hidden');
        endButtons.style.display = 'none';
    }
    const waitText = document.getElementById('wait-for-host');
    if (waitText) {
        waitText.classList.add('hidden');
        waitText.style.display = 'none';
    }
    clearInterval(turnInterval);
    const timerEl = document.getElementById('timer');
    if (timerEl) timerEl.textContent = '30s';
    document.getElementById('color-overlay')?.classList.remove('active');
    pendingWildCard = null;
}

// Rotate the direction icon based on play order
function updateDirectionIcon() {
    const icon = document.querySelector('#gameDirection i');
    if (!icon) return;
    icon.classList.toggle('fa-rotate-right', isClockwise);
    icon.classList.toggle('fa-rotate-left', !isClockwise);
}

function handleOrderReversed(order) {
    isClockwise = !isClockwise;
    updateDirectionIcon();

    if (Array.isArray(order)) {
        const myIndex = order.indexOf(playerId);
        const rotated = order.slice(myIndex + 1).concat(order.slice(0, myIndex + 1));
        playerList = rotated;
    }
}
