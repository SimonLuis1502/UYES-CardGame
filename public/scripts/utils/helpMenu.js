// Generic help and exit menu used across pages
export function helpFunctionality(socket, getGameCode, playerId) {
    const helpBtn = document.getElementById("helpBtnLobby");
    const helpDiv = document.getElementById("helpButtonClicked");
    const closeHelpBtn = document.getElementById("closeHelpBtn");
    const aboutBtn = document.getElementById("AboutBtn");
    const rulesBtn = document.getElementById("RulesBtn");
    const exitBtn = document.getElementById("ExitGameBtn");

    const exitDiv = document.getElementById("submitLeaving");
    const stopLeaving = document.getElementById("stopLeaving");
    const leave = document.getElementById("leave");

    if (helpBtn) {
        helpBtn.addEventListener("click", () => {
            helpDiv.classList.add("helpOpen");
        });
    }

    if (closeHelpBtn) {
        closeHelpBtn.addEventListener("click", () => {
            helpDiv.classList.remove("helpOpen");
        });
    }

    if(exitBtn){
        exitBtn.addEventListener("click", () => {
            exitDiv.classList.add("exitOpen");
        });
    }
    if(stopLeaving){
        stopLeaving.addEventListener("click", () => {
            exitDiv.classList.remove("exitOpen");
        });
    }
    if (leave) {
        leave.addEventListener("click", () => {
            socket.emit("leave-lobby", getGameCode(), playerId);
            window.location.href = "/start/game";
        });
    }

    if (aboutBtn) {
        aboutBtn.addEventListener("click", () => {
            window.location.href = "/help";
        });
    }

    if (rulesBtn) {
        rulesBtn.addEventListener("click", () => {
            window.open("/rules", "_blank");
        });
    }
}
