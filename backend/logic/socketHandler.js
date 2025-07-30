import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSession } from '../jwtSession.js';
import {
  registerLobbyHandlers,
  broadcastHandCounts,
  notifyHost,
  getLobbyMeta,
  lobbies,
} from './lobbyManagement.js';
import { registerGameHandlers } from './gameFlow.js';
import { registerAvatarHandlers } from './avatarHandling.js';

// Socket.IO entry that wires together lobby and game handlers

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Preload available avatar images for quick random assignment
const avatarFiles = fs
  .readdirSync(path.join(__dirname, '../../public/images/avatars'))
  .filter((f) => /\.(?:png|jpe?g|gif)$/i.test(f));

// Parse the session cookie from the raw handshake headers
function getSessionFromSocket(socket) {
  const cookieStr = socket.handshake.headers.cookie || '';
  const cookies = {};
  for (const part of cookieStr.split(';')) {
    const [key, ...val] = part.trim().split('=');
    if (!key) continue;
    cookies[key] = decodeURIComponent(val.join('='));
  }
  return getSession({ cookies });
}

/**
 * Attach all Socket.IO event handlers.
 * Lobby state is stored in {@link lobbies} and game logic is handled in
 * gameFlow.js.
 */
export function setupSocket(io) {
  io.on('connection', (socket) => {
    socket.data.session = getSessionFromSocket(socket);
    socket.data.playerId = socket.data.session?.playerId;
    socket.data.playerName = socket.data.session?.playerName;
    // Lobby join/leave logic
    registerLobbyHandlers(io, socket, avatarFiles);
    // Game events such as card play and draw
    registerGameHandlers(io, socket);
    // Avatar change requests
    registerAvatarHandlers(io, socket, avatarFiles);
  });
}

// Re-export lobby helpers for use in routes and tests
export {
  getLobbyMeta,
  lobbies,
  broadcastHandCounts,
  notifyHost,
} from './lobbyManagement.js';
