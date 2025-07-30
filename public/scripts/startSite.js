// Behaviour for the landing page: shows intro dialogs and navigation buttons
import { handleIntro } from './utils/intros.js';

/** Initialize the start page buttons and intro. */
export function initStartSite() {

    handleIntro({
        flagName: "introSeenStart",
        lastStepId: "intro6wrap",
        resetBtnId: "eichberg2",
        skipBtnId: "NO"
    });

    document.getElementById("about")?.addEventListener("click", () => {
        window.location.href = "/about";
    });

    document.getElementById("help")?.addEventListener("click", () => {
        window.location.href = "/help";
    });

    document.getElementById("start")?.addEventListener("click", () => {
        window.location.href = "/start/game";
    });


}
