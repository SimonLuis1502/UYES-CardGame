// Join lobby form functionality
const MAX_NAME_LENGTH = 17;

export function initJoinLobby() {

    document.getElementById("joinBackBtn")?.addEventListener("click", () => {
        window.location.href = "/start/game";
    });

    const form = document.querySelector("form[action='/api/joinGame']");
    form?.addEventListener("submit", async (e) => {
        e.preventDefault();

        const codeInput = document.getElementById("gameCodeInput");
        const nameInput = document.getElementById("NameInput");

        const code = codeInput.value.trim();
        const name = nameInput.value.trim();

        if (!/^\d{9}$/.test(code)) {
            alert("❌ Please enter a valid 9-digit game code");
            return;
        }

        if (name.length > MAX_NAME_LENGTH) {
            alert("❌ Name too long");
            return;
        }

        const res = await fetch("/api/joinGame", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code, playerName: name }),
        });

        if (res.redirected) {
            window.location.href = res.url;
        } else {
            alert("❌ Lobby not found");
        }
    });
}
