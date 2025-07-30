import {
  lobbies,
  broadcastHandCounts,
  notifyHost,
  logLobbyList,
} from './lobbyManagement.js';

const HAND_LIMIT = 40;

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function createDeck(settings = {}) {
  const colors = ['red', 'yellow', 'green', 'blue'];
  const deck = [];
  for (const color of colors) {
    deck.push({ color, value: 0 });
    for (let i = 1; i <= 9; i++) {
      deck.push({ color, value: i });
      deck.push({ color, value: i });
    }
    if (settings.draw2) {
      deck.push({ color, value: 'draw2' });
      deck.push({ color, value: 'draw2' });
    }
    if (settings.reverse) {
      deck.push({ color, value: 'reverse' });
      deck.push({ color, value: 'reverse' });
    }
    if (settings.skip) {
      deck.push({ color, value: 'skip' });
      deck.push({ color, value: 'skip' });
    }
  }
  if (settings.wild) {
    for (let i = 0; i < 4; i++) deck.push({ color: 'wild', value: 'wild' });
  }
  if (settings.wild4) {
    for (let i = 0; i < 4; i++) deck.push({ color: 'wild', value: 'wild4' });
  }
  return shuffle(deck);
}

function dealInitialCards(game, count = 5, deckSettings = {}) {
  const minDeck = HAND_LIMIT * game.turnOrder.length + 1;
  while (game.deck.length < minDeck) {
    game.deck = game.deck.concat(createDeck(deckSettings));
  }
  for (const player of game.turnOrder) {
    game.hands[player] = game.deck.splice(0, count);
  }
  game.discard.push(game.deck.pop());
}

function nextTurn(game) {
  game.current = (game.current + 1) % game.turnOrder.length;
  return game.turnOrder[game.current];
}

function drawCards(game, player, count) {
  const drawn = [];
  for (let i = 0; i < count; i++) {
    if (game.deck.length === 0) {
      const top = game.discard.pop();
      game.deck = shuffle(game.discard);
      game.discard = [top];
    }
    const card = game.deck.pop();
    game.hands[player].push(card);
    drawn.push(card);
  }
  return drawn;
}

function handleUyesEnd(io, gameCode, game, player) {
  const pressed = !!game.uyesPressed[player];
  delete game.uyesPressed[player];

  const hasOne = game.hands[player]?.length === 1;

  if (pressed && hasOne) {
    io.to(gameCode).emit('player-uyes', { player, active: true });
    return;
  }

  io.to(gameCode).emit('player-uyes', { player, active: false });
  if (pressed || hasOne) {
    drawCards(game, player, 1);
    for (const [_id, s] of io.sockets.sockets) {
      if (s.data.playerId === player && s.rooms.has(gameCode)) {
        s.emit('deal-cards', game.hands[player]);
      }
    }
    io.to(gameCode).emit('cards-drawn', { player, count: 1 });
    broadcastHandCounts(io, gameCode, game);
  }
}

export function registerGameHandlers(io, socket) {
  socket.on('start-game', (gameCode) => {
    const lobby = lobbies[gameCode];
    if (!lobby) return;
    if (lobby.hostId && socket.data.playerId !== lobby.hostId) return;
    if (lobby.game) return;

    const game = {
      deck: createDeck(lobby.settings),
      discard: [],
      hands: {},
      turnOrder: [...lobby.players],
      current: 0,
      uyesPressed: {},
      settings: lobby.settings,
      turnStartedAt: Date.now(),
      drawStack: 0,
    };

    io.to(gameCode).emit('game-started');

    const startingCards = parseInt(lobby.settings?.cards, 10) || 5;
    try {
      dealInitialCards(game, startingCards, lobby.settings);
    } catch (err) {
      socket.emit('start-game-error', err.message);
      return;
    }
    game.current = Math.floor(Math.random() * game.turnOrder.length);
    lobby.game = game;
    // Log lobby overview when a game starts
    logLobbyList();

    const topCard = game.discard[game.discard.length - 1];
    io.to(gameCode).emit('card-played', { player: null, card: topCard });

    for (const [id, s] of io.sockets.sockets) {
      if (s.rooms.has(gameCode)) {
        const hand = game.hands[s.data.playerId] || [];
        s.emit('deal-cards', hand);
      }
    }

    broadcastHandCounts(io, gameCode, game);

    game.turnStartedAt = Date.now();
    io.to(gameCode).emit('player-turn', {
      player: game.turnOrder[game.current],
      startedAt: game.turnStartedAt,
      drawStack: game.drawStack,
    });
  });

  socket.on('play-card', (gameCode, card) => {
    const lobby = lobbies[gameCode];
    const game = lobby?.game;
    if (!game) return;
    const player = socket.data.playerId;
    if (game.turnOrder[game.current] !== player) return;

    const hand = game.hands[player];
    const idx = hand.findIndex(
      (c) => c.color === card.color && c.value === card.value,
    );
    if (idx === -1) return;

    const candidate = hand[idx];
    const top = game.discard[game.discard.length - 1];
    let isValid = false;
    if (candidate.color === 'wild') {
      isValid = ['red', 'yellow', 'green', 'blue'].includes(card.chosenColor);
    } else if (top.color === 'wild') {
      const chosen = top.chosenColor || top.color;
      isValid = candidate.color === chosen;
    } else {
      isValid = candidate.color === top.color || candidate.value === top.value;
    }
    if (!isValid) return;
    if (game.drawStack > 0 && candidate.value !== 'draw2') return;

    const played = hand.splice(idx, 1)[0];
    if (played.color === 'wild') {
      played.chosenColor = card.chosenColor;
    }
    game.discard.push(played);

    socket.emit('deal-cards', hand);

    io.to(gameCode).emit('card-played', { player, card: played });
    broadcastHandCounts(io, gameCode, game);

    let next;
    if (played.value === 'reverse') {
      game.turnOrder.reverse();
      game.current = game.turnOrder.indexOf(player);
      io.to(gameCode).emit('order-reversed', game.turnOrder);
      if (game.turnOrder.length === 2) {
        const skipped =
          game.turnOrder[(game.current + 1) % game.turnOrder.length];
        io.to(gameCode).emit('player-skipped', skipped);
        next = player;
      } else {
        next = nextTurn(game);
      }
    } else {
      next = nextTurn(game);
    }

    if (played.value === 'skip') {
      const skipped = next;
      next = nextTurn(game);
      io.to(gameCode).emit('player-skipped', skipped);
    } else if (played.value === 'draw2') {
      game.drawStack = (game.drawStack || 0) + 2;
    } else if (played.value === 'wild4') {
      const affected = next;
      drawCards(game, affected, 4);
      for (const [_id, s] of io.sockets.sockets) {
        if (s.data.playerId === affected && s.rooms.has(gameCode)) {
          s.emit('deal-cards', game.hands[affected]);
        }
      }
      io.to(gameCode).emit('cards-drawn', { player: affected, count: 4 });
      broadcastHandCounts(io, gameCode, game);
      io.to(gameCode).emit('player-skipped', affected);
      next = nextTurn(game);
    }

    if (hand.length === 0) {
      io.to(gameCode).emit('game-end', player);
      console.log(
        `\u{1F3C1} Game in lobby ${gameCode} finished: ${player} won`,
      );
      delete lobby.game;
      // Log lobby overview when a game ends
      logLobbyList();
      return;
    }

    handleUyesEnd(io, gameCode, game, player);

    game.turnStartedAt = Date.now();
    io.to(gameCode).emit('player-turn', {
      player: next,
      startedAt: game.turnStartedAt,
      drawStack: game.drawStack,
    });
  });

  socket.on('draw-card', (gameCode) => {
    const lobby = lobbies[gameCode];
    const game = lobby?.game;
    if (!game) return;
    const player = socket.data.playerId;
    if (game.turnOrder[game.current] !== player) return;

    const limit = HAND_LIMIT;
    const count = game.drawStack > 0 ? game.drawStack : 1;
    if (game.hands[player].length + count > limit) {
      socket.emit('hand-limit-reached');
      if (game.drawStack > 0) {
        io.to(gameCode).emit('player-skipped', player);
        game.drawStack = 0;
      }
      const next = nextTurn(game);
      handleUyesEnd(io, gameCode, game, player);
      game.turnStartedAt = Date.now();
      io.to(gameCode).emit('player-turn', {
        player: next,
        startedAt: game.turnStartedAt,
        drawStack: game.drawStack,
      });
      return;
    }

    drawCards(game, player, count);
    socket.emit('deal-cards', game.hands[player]);
    io.to(gameCode).emit('cards-drawn', { player, count });
    if (game.drawStack > 0) {
      io.to(gameCode).emit('player-skipped', player);
      game.drawStack = 0;
    }
    broadcastHandCounts(io, gameCode, game);

    const next = nextTurn(game);
    handleUyesEnd(io, gameCode, game, player);
    game.turnStartedAt = Date.now();
    io.to(gameCode).emit('player-turn', {
      player: next,
      startedAt: game.turnStartedAt,
      drawStack: game.drawStack,
    });
  });

  socket.on('uyes', (gameCode) => {
    const lobby = lobbies[gameCode];
    const game = lobby?.game;
    if (!game) return;
    const player = socket.data.playerId;
    if (game.turnOrder[game.current] !== player) return;
    game.uyesPressed[player] = true;
    io.to(gameCode).emit('player-uyes', { player, active: true });
  });

  socket.on('leave-game', (gameCode, playerId) => {
    const lobby = lobbies[gameCode];
    const game = lobby?.game;
    const id = playerId || socket.data.playerId;
    if (!lobby) return;

    lobby.players = lobby.players.filter((p) => p !== id);
    delete lobby.avatars[id];
    const name = lobby.names[id];
    delete lobby.names[id];
    if (lobby.hostId === id) {
      lobby.hostId = lobby.players[0] || null;
      notifyHost(io, gameCode);
    }
    if (lobby.game) {
      lobby.maxPlayers = lobby.players.length;
    }
    const players = lobby.players.map((pid) => ({ id: pid, name: lobby.names[pid] }));
    io.to(gameCode).emit(
      'update-lobby',
      players,
      lobby.maxPlayers,
      lobby.avatars,
      lobby.names[lobby.hostId],
      lobby.hostId,
    );

    if (game) {
      const idx = game.turnOrder.indexOf(id);
      if (idx !== -1) {
        game.turnOrder.splice(idx, 1);
        delete game.hands[id];
        delete game.uyesPressed[id];
        if (idx < game.current) {
          game.current--;
        } else if (
          idx === game.current &&
          game.current >= game.turnOrder.length
        ) {
          game.current = 0;
        }
      }

      const counts = game.turnOrder.map((pid) => ({
        id: pid,
        name: lobby.names[pid],
        count: game.hands[pid]?.length || 0,
      }));
      io.to(gameCode).emit('player-left', {
        players,
        counts,
        player: id,
      });
      game.turnStartedAt = Date.now();
      io.to(gameCode).emit('player-turn', {
        player: game.turnOrder[game.current],
        startedAt: game.turnStartedAt,
        drawStack: game.drawStack,
      });
    }

    socket.leave(gameCode);

      if (lobby.players.length === 0) {
        delete lobbies[gameCode];
        console.log(`\u{1F6AB} Lobby ${gameCode} dissolved (no players)`);
        logLobbyList();
      } else if (lobby.players.length === 1) {
      const last = lobby.players[0];
      for (const [_id, s] of io.sockets.sockets) {
        if (s.data.playerId === last && s.rooms.has(gameCode)) {
          s.emit('kicked');
          s.leave(gameCode);
        }
      }
        delete lobbies[gameCode];
        console.log(`\u{1F6AB} Lobby ${gameCode} dissolved (too few players)`);
        logLobbyList();
    } else {
      // Show updated lobby state when a player leaves the game
      logLobbyList();
    }
  });
}
