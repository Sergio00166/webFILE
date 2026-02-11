/* Code by Sergio00166 */

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const MOUSE_CONTROL_DELAY = 2000;
const TOUCH_CONTROL_DELAY = 3000;
const EXTRA_SETTINGS_DELAY = 2000;
const TIME_CHANGE_DELAY = 750;
const DOUBLE_TOUCH_DELAY = 400;
const ANIMATION_START_DELAY = 400;

// ============================================================================
// DOM ELEMENTS - CONTROLS
// ============================================================================

const volumeControl = document.getElementById("volume");
const progress = document.getElementById("progress");
const seekBar = document.getElementById("seek-bar");
const totalTime = document.getElementById("total-time");
const currentTime = document.getElementById("current-time");
const controlsContainer = document.getElementById("controls");
const volumeSlider = document.getElementById("volume-bar");
const mainState = document.getElementById("main-state");
const hoverTime = document.getElementById("hover-time");
const hoverInfo = document.getElementById("hover-info");
const settingsButton = document.getElementById("settings");
const loadingSpinner = document.getElementById("custom-loader");

// ============================================================================
// DOM ELEMENTS - MENU
// ============================================================================

const settingsMenu = document.getElementById("setting-menu");
const mainMenu = document.getElementById("main-menu");
const subsSubmenu = document.getElementById("subs-submenu");
const audioSubmenu = document.getElementById("audio-submenu");
const speedSubmenu = document.getElementById("speed-submenu");
const menuLegacyText = document.getElementById("menuLegacyText");
const menuSubsText = document.getElementById("menuSubsText");
const menuSpeedText = document.getElementById("menuSpeedText");
const menuAudioText = document.getElementById("menuAudioText");

// ============================================================================
// DOM ELEMENTS - NAVIGATION & MEDIA
// ============================================================================

const previousLink = document.getElementById("prev");
const nextLink = document.getElementById("next");
const subtitleCanvas = document.querySelector("canvas");
const video = document.querySelector("video");
const videoContainer = document.getElementById("video-container");
const loopButton = document.getElementById("loop-btn");
const downloadVideoLink = document.getElementById("download_video");
const downloadSubtitlesLink = document.getElementById("download_subs");
const chapterContainer = document.getElementById("chapter-container");

// ============================================================================
// DOM ELEMENTS - ICONS & STATES
// ============================================================================

const playIcons = Array.from(
    document.querySelectorAll("#play-pause img")
);
const fullscreenIcons = Array.from(
    document.querySelectorAll("#screenToggle img")
);
const mainStateIcons = Array.from(
    mainState.querySelectorAll("img")
);
const loopIcons = Array.from(
    loopButton.querySelectorAll("img")
);
const volumeIcons = Array.from(
    volume.querySelectorAll("img")
);
const mainStateVolume = document.querySelector("#state_volume");

// ============================================================================
// STATE VARIABLES
// ============================================================================

let chapters;
let loopMode = 0;
let legacySubtitles = false;
let assSubtitleWorker;
let previousVideoTime = 0;
let touchInteractionActive;
let controlsHideTimeout;
let touchActionTimeout;
let cursorHideTimeout;
let subtitleIndex = -1;
let lastTouchTimestamp = 0;
let touchHoverActive = false;

// ============================================================================
// INITIALIZATION
// ============================================================================

function initializeVideoPlayer() {
    const savedSpeed      = localStorage.getItem("videoSpeed");
    const savedVolume     = localStorage.getItem("videoVolume");
    const savedMuted      = localStorage.getItem("videoMuted");
    const savedLoopMode   = localStorage.getItem("videoLoop");
    const savedLegacySubs = localStorage.getItem("subsLegacy");

    video.muted = savedMuted === "true";
    video.volume = parseFloat(savedVolume || 1);
    volumeSlider.value = video.volume;
    video.playbackRate = parseFloat(savedSpeed || "1");
    loopMode = parseInt(savedLoopMode || "0");
    legacySubtitles = savedLegacySubs === "true";

    updateVolumeSlider();
    updateVolumeIcon();
    updateSpeedDisplay();
    updateLegacyDisplay();
    updateLoopButton();

    const isGecko = navigator.userAgent.includes("Gecko") &&
                   !navigator.userAgent.includes("like Gecko");

    if (isGecko || !navigator.gpu)
        document.body.dataset.fx = "no";
    else
        document.body.dataset.fx = "yes";

    loadSubtitleTracks();
    waitForVideoReady();
}

async function waitForVideoReady() {
    if (isNaN(video.duration) || video.duration === 0)
        return setTimeout(waitForVideoReady, 25);

    playVideo();
    if (video.paused) pauseVideo();

    totalTime.innerHTML = formatDuration(video.duration);
    video.ontimeupdate = updateProgressBar;
    video.onended = handleVideoEnded;

    loadAudioTracks();
    fixVideoAspectRatio();
    await setupTimelineChapters();
}

// ============================================================================
// GET BASE TRACK DATA
// ============================================================================

async function loadSubtitleTracks() {
    const subsContent = subsSubmenu.querySelector(".menu-content");
    const savedSubtitle = localStorage.getItem("videoSubs");
    const subtitleList = await fetch("?get=tracks").then(res => res.json());

    for (let i = 0; i < subtitleList.length; i++) {
        const trackName = subtitleList[i];
        const button = document.createElement("button");
        button.textContent = trackName;
        subsContent.appendChild(button);

        if (trackName === savedSubtitle) {
            changeSubtitles(i);
            subtitleIndex = i;
        }
    }
    updateSubtitleDisplay();
}

function loadAudioTracks() {
    const savedAudioTrack = localStorage.getItem("videoAudio");
    const audioContent = audioSubmenu.querySelector(".menu-content");
    const audioTracks = video.audioTracks;

    if (!audioTracks) return;
    audioContent.innerHTML = "";

    for (let i = 0; i < audioTracks.length; i++) {
        const track = audioTracks[i];
        const button = document.createElement("button");

        const trackName = (track.label || track.language || "Track " + (i + 1));
        button.textContent = trackName;
        audioContent.appendChild(button);

        if (trackName === savedAudioTrack)
            changeAudioTrack(i);
    }
    updateAudioDisplay();
}

async function setupTimelineChapters() {
    chapters = await fetch("?get=chapters").then(res => res.json());
    const videoDuration = video.duration;
    const chapterData = [...chapters.map(item => item.start_time), videoDuration];

    chapterData.slice(0, -1).forEach((time, index) => {
        const startPercent = Math.min((time / videoDuration) * 100, 100);
        const chapterSection = document.createElement("div");
        chapterSection.classList.add("chapter");
        chapterSection.style.left = `${startPercent}%`;
        chapterContainer.appendChild(chapterSection);
    });
}

// ============================================================================
// INITIALIZATION CALL
// ============================================================================

window.addEventListener("pageshow", initializeVideoPlayer);

 