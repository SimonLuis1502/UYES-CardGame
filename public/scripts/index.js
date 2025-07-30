import { initStartSite } from './startSite.js';
import { initAboutPage } from './aboutPage.js';
import { initHelpPage } from './helpPage.js';
import { initRulesPage } from './rulesPage.js';
import { initChooseLobby } from './chooseLobby.js';
import { initCreateGame } from './createGame.js';
import { initChangeSettings } from './changeSettings.js';
import { initLobbyHost } from "./lobby.js";
import { initJoinLobby } from "./joinLobby.js";
import { initGameplay } from "./gameplay.js";
import { startMusic } from './utils/music.js';

const pages = {
    startsite: initStartSite,
    about: initAboutPage,
    'help-page-body': initHelpPage,
    'rules-page-body': initRulesPage,
    chooseLobby: initChooseLobby,
    createGame: initCreateGame,
    changeSettings: initChangeSettings,
    lobbyHost: initLobbyHost,
    joinLobby: initJoinLobby,
    gameplay: initGameplay,
};

const pageId = document.body.id;
startMusic();

const init = pages[pageId];
if (init) {
    init();
}
