// Display multi-step introductions on first visit
export function handleIntro({ flagName, lastStepId, resetBtnId, skipBtnId }) {

    document.getElementById(resetBtnId)?.addEventListener("click", () => {
        localStorage.removeItem(flagName);
        window.location.reload();
    });

    if (localStorage.getItem(flagName) === "true") {
        document.querySelectorAll(".intro").forEach(el => el.remove());
        const layer = document.getElementById("milch-glas-layer");
        if (layer) layer.style.display = "none";
        return;
    }

    document.querySelector(`#${lastStepId} button`)?.addEventListener("click", () => {
        localStorage.setItem(flagName, "true");
    });

    if (skipBtnId) {
        document.getElementById(skipBtnId)?.addEventListener("click", () => {
            localStorage.setItem(flagName, "true");
            window.location.reload();
        });
    }


}
