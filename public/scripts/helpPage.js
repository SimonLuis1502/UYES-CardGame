import { startMusic, setVolume, getVolume } from './utils/music.js';

export function initHelpPage() {

    startMusic();

    document.getElementById("backBtnHelp")?.addEventListener("click", () => {
        window.history.back();
    });

    document.getElementById("rulesBtnHelp")?.addEventListener("click", () => {
        window.location.href = "/rules";
    });

    const slider = document.getElementById('volume-range');
    const decBtn = document.querySelector('.help-reduce-volume');
    const incBtn = document.querySelector('.help-increase-volume');

    if (slider) {
        slider.value = getVolume();
        const update = () => setVolume(parseFloat(slider.value));
        slider.addEventListener('input', update);
        decBtn?.addEventListener('click', () => { slider.stepDown(); update(); });
        incBtn?.addEventListener('click', () => { slider.stepUp(); update(); });
    }

}
