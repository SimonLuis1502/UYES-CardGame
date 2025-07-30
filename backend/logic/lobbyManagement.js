export const lobbies = {};

export function logLobbyList() {
  const entries = Object.entries(lobbies);
  if (entries.length === 0) {
    console.log('No open lobbies.');
    return;
  }
  console.log(`\u{1F4CB} Open lobbies (${entries.length}):`);
  for (const [code, lobby] of entries) {
    const host = lobby.names[lobby.hostId] || 'unknown';
    const count = lobby.players.length;
    const state = lobby.game ? 'in game' : 'in lobby';
    console.log(
      `  ${code} | Host: ${host} | Players: ${count}/${lobby.maxPlayers} | ${state}`,
    );
  }
}

export function getLobbyMeta(code) {
  return lobbies[code] || null;
}

export function notifyHost(io, gameCode) {
  const lobby = lobbies[gameCode];
  const hostId = lobby?.hostId;
  if (!hostId) return;
  for (const [_id, s] of io.sockets.sockets) {
    if (s.data.playerId === hostId && s.rooms.has(gameCode)) {
      s.emit('host-assigned');
      break;
    }
  }
}

export function broadcastHandCounts(io, gameCode, game) {
  const lobby = lobbies[gameCode];
  const g = game || lobby?.game;
  if (!g || !lobby) return;
  const counts = g.turnOrder.map((id) => ({
    id,
    name: lobby.names[id],
    count: g.hands[id]?.length || 0,
  }));
  io.to(gameCode).emit('update-hand-counts', counts);
}

export function registerLobbyHandlers(io, socket, avatarFiles) {
  socket.on('join-lobby', (gameCode, playerName, maxPlayersFromHost) => {
    if (!lobbies[gameCode]) {
      if (maxPlayersFromHost) {
        lobbies[gameCode] = {
          hostId: socket.data.playerId,
          players: [],
          names: {},
          avatars: {},
          maxPlayers: maxPlayersFromHost || 5,
          settings: socket.data.session?.settings || {},
        };
        console.log(`\u{1F195} Lobby ${gameCode} created by ${playerName}`);
        logLobbyList();
      } else {
        socket.emit('lobby-not-found');
        return;
      }
    }

    const lobby = lobbies[gameCode];
    const already = lobby.players.includes(socket.data.playerId);

    if (lobby.game && !already) {
      socket.emit('game-in-progress');
      return;
    }

    if (lobby.players.length >= lobby.maxPlayers && !already) {
      socket.emit('lobby-full');
      return;
    }

    socket.join(gameCode);
    lobby.names[socket.data.playerId] = playerName;
    socket.data.playerName = playerName;

    if (!already) {
      lobby.players.push(socket.data.playerId);
      if (!lobby.avatars[socket.data.playerId]) {
        lobby.avatars[socket.data.playerId] =
          avatarFiles[Math.floor(Math.random() * avatarFiles.length)];
      }
    }

    const players = lobby.players.map((id) => ({ id, name: lobby.names[id] }));
    io.to(gameCode).emit(
      'update-lobby',
      players,
      lobby.maxPlayers,
      lobby.avatars,
      lobby.names[lobby.hostId],
      lobby.hostId,
    );

    // Always log the lobby list when membership changes
    if (!already) {
      logLobbyList();
    }

    const runningGame = lobby.game;
    if (runningGame) {
      socket.emit('game-started');
      const hand = runningGame.hands[socket.data.playerId] || [];
      socket.emit('deal-cards', hand);
      const topCard = runningGame.discard[runningGame.discard.length - 1];
      socket.emit('card-played', { player: null, card: topCard });
      broadcastHandCounts(io, gameCode, runningGame);
      socket.emit('player-turn', {
        player: runningGame.turnOrder[runningGame.current],
        startedAt: runningGame.turnStartedAt,
        drawStack: runningGame.drawStack || 0,
      });
    }
  });

  socket.on('kick-player', (gameCode, playerIdToKick) => {
    const lobby = lobbies[gameCode];
    if (!lobby) return;

    lobby.players = lobby.players.filter((p) => p !== playerIdToKick);
    delete lobby.names[playerIdToKick];
    delete lobby.avatars[playerIdToKick];
    if (lobby.hostId === playerIdToKick) {
      lobby.hostId = lobby.players[0] || null;
      notifyHost(io, gameCode);
    }
    if (lobby.game) {
      lobby.maxPlayers = lobby.players.length;
    }
    const players = lobby.players.map((id) => ({ id, name: lobby.names[id] }));
    io.to(gameCode).emit(
      'update-lobby',
      players,
      lobby.maxPlayers,
      lobby.avatars,
      lobby.names[lobby.hostId],
      lobby.hostId,
    );

    for (const [_id, s] of io.sockets.sockets) {
      if (s.data?.playerId === playerIdToKick && s.rooms.has(gameCode)) {
        s.emit('kicked');
        s.leave(gameCode);
      }
    }
    // Log lobby status after a player was kicked
    logLobbyList();
  });

  socket.on('close-lobby', (gameCode) => {
    const lobby = lobbies[gameCode];
    if (!lobby) return;
    if (lobby.hostId && socket.data.playerId !== lobby.hostId) return;

    for (const pid of lobby.players) {
      if (pid === socket.data.playerId) continue;
      for (const [_id, s] of io.sockets.sockets) {
        if (s.data?.playerId === pid && s.rooms.has(gameCode)) {
          s.emit('kicked');
          s.leave(gameCode);
        }
      }
    }
    socket.leave(gameCode);
    delete lobbies[gameCode];
      console.log(
        `\u{1F512} Lobby ${gameCode} closed by ${socket.data.playerName}`,
      );
    logLobbyList();
  });

  socket.on('change-code', (oldCode, newCode) => {
    if (!lobbies[oldCode]) return;

    lobbies[newCode] = lobbies[oldCode];
    delete lobbies[oldCode];

    for (const [_id, s] of io.sockets.sockets) {
      if (s.rooms.has(oldCode)) {
        s.join(newCode);
        s.leave(oldCode);
      }
    }

    io.to(newCode).emit('update-code', newCode);
    // Show updated lobby code in the log
    logLobbyList();
  });

  socket.on('leave-lobby', (gameCode, playerId) => {
    const lobby = lobbies[gameCode];
    if (!lobby) return;

    lobby.players = lobby.players.filter((p) => p !== playerId);
    delete lobby.avatars[playerId];
    delete lobby.names[playerId];
    if (lobby.hostId === playerId) {
      lobby.hostId = lobby.players[0] || null;
      notifyHost(io, gameCode);
    }

    socket.leave(gameCode);

    if (lobby.players.length === 0) {
      delete lobbies[gameCode];
      logLobbyList();
      return;
    }

    const players = lobby.players.map((id) => ({ id, name: lobby.names[id] }));
    io.to(gameCode).emit(
      'update-lobby',
      players,
      lobby.maxPlayers,
      lobby.avatars,
      lobby.names[lobby.hostId],
      lobby.hostId,
    );
    // Log current lobby state after someone leaves
    logLobbyList();
  });
}
