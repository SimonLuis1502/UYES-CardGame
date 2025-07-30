// Handles the game creation form and intro sequence
import { handleIntro } from './utils/intros.js';
import { setupAmountControls, setupSelectAllCheckbox } from './utils/uiHelpers.js';

/** Initialise form controls for the create game page. */
export function initCreateGame() {


    handleIntro({
        flagName: "introSeenCreateGame",
        lastStepId: "intro9wrap",
        resetBtnId: "eichberg2"
    });

    document.getElementById("createBackBtn")?.addEventListener("click", () => {
        window.location.href = "/start/game";
    });

    setupAmountControls('playerSlider', 'playerCount', '.subtract', '.add');
    setupAmountControls('cardSlider', 'cardCount', '.subtract', '.add');

    setupSelectAllCheckbox('#special-cards input[type="checkbox"]', 'check-all');

    document.getElementById("continue-createGame")?.addEventListener("click", async (e) => {
        e.preventDefault();

        const data = {
            name: document.getElementById("NameInput").value || "",
            settings: {
                players: document.getElementById("playerSlider").value,
                cards: document.getElementById("cardSlider").value,
                draw2: document.getElementById("draw2").checked,
                reverse: document.getElementById("reverse").checked,
                skip: document.getElementById("skip").checked,
                wild: document.getElementById("wild").checked,
                wild4: document.getElementById("wild+4").checked
            },
            role: "host"
        };

        sessionStorage.setItem("gameData", JSON.stringify(data));


        const response = await fetch("/api/createGame", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });

        if (response.redirected) {
            window.location.href = response.url;
        }
    });

}
