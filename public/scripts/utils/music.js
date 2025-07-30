// Simple utility for background music persistence across pages
const MUSIC_SRC = '/music/background.mp3';
const BG_MUSIC_TIME_KEY = 'bg-music-time';

let audioElem;

export function startMusic() {
    const volume = getVolume();
    if (!audioElem) {
        audioElem = new Audio(MUSIC_SRC);
        audioElem.loop = true;
        audioElem.volume = volume;

        const stored = parseFloat(localStorage.getItem(BG_MUSIC_TIME_KEY));
        const startTime = Number.isFinite(stored) ? stored : 0;

        audioElem.addEventListener('loadedmetadata', () => {
            if (startTime > 0 && startTime < audioElem.duration) {
                audioElem.currentTime = startTime;
            }
        }, { once: true });

        audioElem.addEventListener('timeupdate', () => {
            localStorage.setItem(BG_MUSIC_TIME_KEY, String(audioElem.currentTime));
        });

        window.addEventListener('beforeunload', () => {
            localStorage.setItem(BG_MUSIC_TIME_KEY, String(audioElem.currentTime));
        });

        audioElem.play().catch(() => { });
    } else {
        audioElem.volume = volume;
    }
}

window.addEventListener('storage', (e) => {
    if (e.key === 'bg-music-volume' && audioElem) {
        const vol = parseFloat(e.newValue);
        if (Number.isFinite(vol)) {
            audioElem.volume = vol;
        }
    }
});

export function setVolume(vol) {
    const volume = Math.min(Math.max(vol, 0), 1);
    localStorage.setItem('bg-music-volume', String(volume));
    if (audioElem) {
        audioElem.volume = volume;
    }
}

export function getVolume() {
    const stored = parseFloat(localStorage.getItem('bg-music-volume'));
    return Number.isFinite(stored) ? stored : 0.5;
}
