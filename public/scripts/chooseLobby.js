// Choose between creating or joining a lobby
import { handleIntro } from './utils/intros.js';

/** Setup the choose lobby buttons and intro. */
export function initChooseLobby() {


    handleIntro({
        flagName: "introSeenChooseLobby",
        lastStepId: "intro4wrap",
        resetBtnId: "eichberg2"
    });

    document.getElementById("backBtnChooseLobby")?.addEventListener("click", () => {
        window.location.href = "/start";
    });

    document.getElementById("create")?.addEventListener("click", () => {
        window.location.href = "/start/game/create";
    });
    document.getElementById("join")?.addEventListener("click", () => {
        window.location.href = "/start/game/join";
    });


}