/* Code by Sergio00166 */

// Async to make page load faster
const ISO_codes_promise = fetch("/srv/static/langcodes.json").then(res => res.json());

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const MOUSE_CONTROL_DELAY   = 2000;
const TOUCH_CONTROL_DELAY   = 3000;
const EXTRA_CONTROL_DELAY   = 2000;
const EXTRA_SKIP_DELAY      = 6000;
const TIME_CHANGE_DELAY     =  750;
const DOUBLE_TOUCH_DELAY    =  400;
const ANIMATION_START_DELAY =  400;

const skipPatterns = [
    /\bop(\d+)?\b/i,     // OP, OP1, OP2
    /\bopening\b/i,      // Opening
    /\bed(\d+)?\b/i,     // ED, ED1, ED2
    /\bend(ing)?\b/i,    // Ending
    /\bcredits?\b/i,     // Credit, Credits
];

// ============================================================================
// DOM ELEMENTS - CONTROLS
// ============================================================================

const volumeControl     = document.getElementById("volume");
const volumeSlider      = document.getElementById("volume-bar");
const progress          = document.getElementById("progress");
const seekBar           = document.getElementById("seek-bar");
const totalTime         = document.getElementById("total-time");
const currentTime       = document.getElementById("current-time");
const mainState         = document.getElementById("main-state");
const hoverTime         = document.getElementById("hover-time");
const hoverInfo         = document.getElementById("hover-info");
const settingsButton    = document.getElementById("settings");
const loadingSpinner    = document.getElementById("custom-loader");
const controlsContainer = document.getElementById("controls");

// ============================================================================
// DOM ELEMENTS - MENU
// ============================================================================

const mainMenu       = document.getElementById("main-menu");
const settingsMenu   = document.getElementById("setting-menu");
const subsSubmenu    = document.getElementById("subs-submenu");
const audioSubmenu   = document.getElementById("audio-submenu");
const speedSubmenu   = document.getElementById("speed-submenu");
const menuLegacyText = document.getElementById("menuLegacyText");
const menuSubsText   = document.getElementById("menuSubsText");
const menuSpeedText  = document.getElementById("menuSpeedText");
const menuAudioText  = document.getElementById("menuAudioText");

// ============================================================================
// DOM ELEMENTS - NAVIGATION & MEDIA
// ============================================================================

const video            = document.querySelector("video");
const subtitleCanvas   = document.querySelector("canvas");
const skipBtn          = document.getElementById("skipBtn");
const videoContainer   = document.getElementById("video-container");
const loopButton       = document.getElementById("loop-btn");
const downloadVideo    = document.getElementById("download_video");
const downloadSubs     = document.getElementById("download_subs");
const chapterContainer = document.getElementById("chapter-container");

// ============================================================================
// DOM ELEMENTS - ICONS & STATES
// ============================================================================

const playIcons       = Array.from(document.querySelectorAll("#play-pause img"));
const fullscreenIcons = Array.from(document.querySelectorAll("#screenToggle img"));
const mainStateIcons  = Array.from(mainState.querySelectorAll("img"));
const loopIcons       = Array.from(loopButton.querySelectorAll("img"));
const volumeIcons     = Array.from(volume.querySelectorAll("img"));
const mainStateVolume = document.querySelector("#state_volume");

// ============================================================================
// STATE VARIABLES
// ============================================================================

let prev, next;
let cursorHideTimeout;
let assSubtitleWorker;
let touchActionTimeout;
let controlsHideTimeout;
let touchInteractionActive;

let chapters           = [];
let loopMode           =  0;
let subtitleIndex      = -1;
let lastTouchTimestamp =  0;
let previousVideoTime  =  0;
let touchHoverActive   = false;
let legacySubtitles    = false;

// ============================================================================
// INITIALIZATION
// ============================================================================

function configurePlayer() {
    const savedSpeed      = localStorage.getItem("videoSpeed");
    const savedVolume     = localStorage.getItem("videoVolume");
    const savedMuted      = localStorage.getItem("videoMuted");
    const savedLoopMode   = localStorage.getItem("videoLoop");
    const savedLegacySubs = localStorage.getItem("subsLegacy");

    video.muted        = savedMuted === "true";
    loopMode           = parseInt(savedLoopMode || "0");
    video.volume       = parseFloat(savedVolume || 1);
    video.playbackRate = parseFloat(savedSpeed  || "1");
    legacySubtitles    = savedLegacySubs === "true";
    volumeSlider.value = video.volume;

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
}

async function initializePlayer(reset=false) {
    const title = window.location.pathname.split("/").pop();
    document.title = decodeURIComponent(title);

    const data = await fetch("?get=info").then(res => res.json());
    ISO_codes  = await ISO_codes_promise;
    ({ next, prev, chapters } = data);

    if (reset) {
        const speed = video.playbackRate;
        video.pause();
        video.currentTime = 0;
        video.load();
        video.playbackRate = speed;
    }
    if (data.subtitles.external)
        downloadSubs.href = data.subtitles.external + "?get=file";

    if (data.subtitles.tracks)
        loadSubtitleTracks(data.subtitles.tracks);

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

async function loadSubtitleTracks(trackList) {
    const subsContent = subsSubmenu.querySelector(".menu-content");
    const savedSubtitle = localStorage.getItem("videoSubs");
    subsContent.innerHTML = "<button>None</button>";

    for (let i = 0; i < trackList.length; i++) {
        const track = trackList[i];
        const trackName = createTrackName(track.lang, track.title, i);

        if (trackName === savedSubtitle) {
            changeSubtitles(i);
            subtitleIndex = i;
        }
        const button = document.createElement("button");
        button.textContent = trackName;
        subsContent.appendChild(button);
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
        const trackName = createTrackName(track.language, track.label, i);

        const button = document.createElement("button");
        button.textContent = trackName;
        audioContent.appendChild(button);

        if (trackName === savedAudioTrack)
            changeAudioTrack(i);
    }
    updateAudioDisplay();
}

async function setupTimelineChapters() {
    const videoDuration = video.duration;
    const chapterData = [...chapters.map(item => item.start_time), videoDuration];
    chapterContainer.innerHTML = "";

    chapterData.slice(0, -1).forEach((time, index) => {
        const startPercent = Math.min((time / videoDuration) * 100, 100);
        if (startPercent > 0) {
            const chapterSection = document.createElement("div");
            chapterSection.classList.add("chapter");
            chapterSection.style.left = `${startPercent}%`;
            chapterContainer.appendChild(chapterSection);
        }
    });
}

// ============================================================================
// INITIALIZATION CALL
// ============================================================================

window.addEventListener("popstate", initializePlayer);
window.addEventListener("pageshow", () => {
    configurePlayer(); initializePlayer();
});

 