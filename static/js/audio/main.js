/* Code by Sergio00166 */

// ============================================================================
// DOM ELEMENTS - AUDIO PLAYER
// ============================================================================

const audio = document.querySelector("audio");
const seekBar = document.getElementById("seek-bar");
const progress = document.getElementById("progress");
const hoverTime = document.getElementById("hover-time");
const hoverInfo = document.getElementById("hover-info");
const currentTime = document.getElementById("current-time");
const totalTime = document.getElementById("total-time");
const volumeSlider = document.getElementById("volume-bar");

// ============================================================================
// DOM ELEMENTS - CONTROLS
// ============================================================================

const shuffleButton = document.getElementById("shuffle-btn");
const loopButton = document.getElementById("loop-btn");
const previousLink = document.getElementById("prev");
const nextLink = document.getElementById("next");
const randomLink = document.getElementById("random");
const downloadLink = document.getElementById("download-link");
const speedButton = document.getElementById("speed-btn");

// ============================================================================
// DOM ELEMENTS - ICONS
// ============================================================================

const volumeIcons = Array.from(
    document.querySelectorAll("#vol-icons img")
);
const loopIcons = Array.from(
    loopButton.querySelectorAll("img")
);
const playIcons = Array.from(
    document.querySelectorAll("#play-pause img")
);

// ============================================================================
// STATE VARIABLES
// ============================================================================

let isShuffled = false;
let loopMode = 0;
let speedIndex = 1;
let speedButtonStartY = 0;
let isTouchHoverActive = false;
const speedValues = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

// ============================================================================
// INITIALIZATION
// ============================================================================

function initializeAudioPlayer() {
    const savedShuffled = localStorage.getItem("audioShuffle");
    const savedLoopMode = localStorage.getItem("audioLoop");
    const savedVolume   = localStorage.getItem("audioVolume");
    const savedMuted    = localStorage.getItem("audioMuted");
    const savedSpeed    = localStorage.getItem("audioSpeed");

    loopMode = parseInt(savedLoopMode || "0");
    isShuffled = savedShuffled === "true";
    audio.volume = parseFloat(savedVolume || 1);
    audio.muted = savedMuted === "true";
    speedIndex = Math.max(speedValues.indexOf(savedSpeed), speedValues.indexOf(1));
    audio.playbackRate = speedValues[speedIndex];
    volumeSlider.value = audio.volume;

    updateSpeed();
    updateVolumeBar();
    updateVolumeIcon();
    updateLoopButton();
    updateShuffleButton();
    waitForAudioReady();
    setupMediaSession();
}

function waitForAudioReady() {
    if (isNaN(audio.duration) || audio.duration === 0)
        return setTimeout(waitForAudioReady, 25);

    playAudio();
    if (audio.paused) pauseAudio();

    totalTime.textContent = formatTime(audio.duration);
    audio.addEventListener("timeupdate", updateSeekBar);
}


// ============================================================================
// MEDIA SESSION API
// ============================================================================

function setupMediaSession() {
    if ("mediaSession" in navigator) {
        navigator.mediaSession.setActionHandler("previoustrack", navigateToPrevious);
        navigator.mediaSession.setActionHandler("nexttrack", navigateToNext);
    }
}

// ============================================================================
// INITIALIZATION CALL
// ============================================================================

window.addEventListener("pageshow", initializeAudioPlayer);

 