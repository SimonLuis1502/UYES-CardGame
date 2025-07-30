// Handles navigation buttons on the about page
export function initAboutPage() {

    document.getElementById("back-to-main-menu")?.addEventListener("click", () => {
        window.location.href = "/start";
    });

    document.getElementById("rulesBtnAbout")?.addEventListener("click", () => {
        window.location.href = "/rules";
    });

}
