import { lobbies } from './lobbyManagement.js';

export function registerAvatarHandlers(io, socket, avatarFiles) {
  socket.on('change-avatar', (gameCode) => {
    const lobby = lobbies[gameCode];
    if (!lobby) return;
    const player = socket.data.playerId;
    const avatars = lobby.avatars;
    if (!player || !avatars) return;
    const file = avatarFiles[Math.floor(Math.random() * avatarFiles.length)];
    avatars[player] = file;
    io.to(gameCode).emit('avatar-changed', { player, file });
  });
}
