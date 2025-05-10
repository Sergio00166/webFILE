/* Code by Sergio00166 */

let mouse_ctrl_delay = 1500;
let doubleTouch_delay = 400;

const volume = document.querySelector(".volume");
const currentTime = document.querySelector(".current-time");
const duration = document.querySelector(".duration");
const buffer = document.querySelector(".buffer");
const totalDuration = document.querySelector(".total-duration");
const timeContainer = document.querySelector(".time-container");
const currentDuration = document.querySelector(".current-duration");
const controls = document.querySelector(".controls");
const volumeBar = document.getElementById("volume-bar");
const mainState = document.querySelector(".main-state");
const hoverTime = document.querySelector(".hover-time");
const hoverDuration = document.querySelector(".hover-duration");
const settingMenu = document.querySelector(".setting-menu");
const settingsBtn = document.getElementById("settings");
const menuButtons = document.querySelectorAll(".setting-menu li");
const loader = document.querySelector(".custom-loader");
const subtitleSelect = document.getElementById('s0');
const audioTracksSelect = document.getElementById('s1');
const speedSelect = document.getElementById('s2');
const sh_mute = document.querySelector(".sh_mute");
const sh_unmute = document.querySelector(".sh_unmute");
const sh_pause = document.querySelector(".sh_pause");
const sh_play = document.querySelector(".sh_play");
const sh_play_st = document.querySelector(".sh_play_st");
const sh_pause_st = document.querySelector(".sh_pause_st");
const sh_mute_st = document.querySelector(".sh_mute_st");
const sh_unmute_st = document.querySelector(".sh_unmute_st");
const sh_fordward_st = document.querySelector(".sh_fordward_st");
const sh_back_st = document.querySelector(".sh_back_st");
const sh_fulla = document.querySelector(".sh_fulla");
const sh_lowa = document.querySelector(".sh_lowa");
const sh_meda = document.querySelector(".sh_meda");
const sh_noa = document.querySelector(".sh_noa");
const liD = document.getElementById("liD");
const downloadLink = document.getElementById("download");
const prevLink = document.getElementById("prev");
const nextLink = document.getElementById("next");
const canvas = document.querySelector("canvas");
const touchBox = document.getElementById("touch-box");

sh_pause.classList.remove("sh_pause");
var video = document.querySelector("video");
var videoContainer = document.querySelector(".video-container");
var saved_speed = localStorage.getItem("videoSpeed");
var volumeVal = localStorage.getItem("videoVolume");
var mode = document.getElementById("mode");
var currentMode = localStorage.getItem("videoMode");
var muted = localStorage.getItem("videoMuted");
var subs_legacy = localStorage.getItem("subsLegacy");

var mber = undefined;
var sttbtnpress = false;
let isCursorOnControls = false;
let lastTouchTime = 0;
let originalTime = 0;
let touchFix;
let timeout;
let touchTimeout;
let cursorTimeout;
var subtitleId = 0;
let ass_worker;
let fixTouchHover = false;


/* Inicialitate everything */

if (subs_legacy != null) {
    if (subs_legacy == "true") {
        subs_legacy = true;
        settingsBtn.classList.add('lmbsl');
    } else {
        subs_legacy = false;
    }
} else {
    subs_legacy = false;
}

for (var i = 0; i < subtitleSelect.options.length; i++) {
    if (subtitleSelect.options[i].text ===
        localStorage.getItem("videoSubs")) {
        subtitleId = i;  break;
    }
}
subtitleSelect.selectedIndex = subtitleId;
subtitleId = subtitleId - 1;
changeSubs(subtitleId);

if (saved_speed != null) {
    video.playbackRate = parseFloat(saved_speed);
    for (let i = 0; i < speedSelect.options.length; i++) {
        if (speedSelect.options[i].value === saved_speed) {
            speedSelect.selectedIndex = i;
            break;
        }
    }
} else {
    speedSelect.selectedIndex = 3;
}

if (currentMode != null) {
    currentMode = parseInt(currentMode);
    mode.innerHTML = ["1", "»", "&orarr;"][currentMode] || "1";
} else {
    currentMode = 0;
}

if (volumeVal === null) {
    volumeVal = 1;
}

video.volume = parseFloat(volumeVal);

window.addEventListener('pageshow', () => {
    volumeBar.value = video.volume;
    updateVolumeBar();
});

if (muted != null) {
    if (muted == "true") {
        muted = true;
        video.volume = 0;
    } else {
        muted = false;
    }
} else {
    muted = false;
}
handleVideoIcon();

video.addEventListener('loadeddata', () => {
    (function wait4ready() {
        if (isNaN(video.duration) || video.duration === 0) {
            return setTimeout(wait4ready, 25);
        }
        video.play().catch(() => {});
        if (video.paused) {
            pause();
        }
        totalDuration.innerHTML = showDuration(video.duration);
        video.ontimeupdate = handleProgressBar;
        video.onended = handleVideoEnded;
        split_timeline_chapters(); // Set chapters
        loadTracks(); // Set all audio tracks info
        fix_aspect_ratio(); // Fix the aspect ratio
    })();
});


/* Video helpers zone */

async function create_ass_worker(url) {
    const response = await fetch(url);
    if (!response.ok) {
        alert("Cannot load subtitle [normal mode]");
        return;
    }
    return new JASSUB({
        video: video,
        canvas: canvas,
        subContent: await response.text(),
        workerUrl: '/?static=jassub/worker.js',
        wasmUrl: '/?static=jassub/worker.wasm',
        useLocalFonts: true,
        fallbackFont: "arial",
        availableFonts: {
            'arial': '/?static=jassub/arial.ttf'
        }
    });
}

function webvtt_subs(url) {
    var track = document.createElement('track');
    track.kind = 'subtitles';
    track.src = url;
    track.default = true;
    track.onerror = ()=>{
        alert("Cannot load subtitle [legacy mode]");
    }
    video.appendChild(track);
    track.mode = 'showing';
    // Firefox you are a joke
    video.textTracks[0].mode = "showing";
}

async function changeSubs(value) {
    var existingTrack = video.querySelector('track[kind="subtitles"]');
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    if (ass_worker) { ass_worker.destroy(); }
    if (existingTrack) {
        existingTrack.track.mode = 'disabled';
        existingTrack.remove();
    }
    if (value > -1) {
        url = window.location.pathname + "?subs=" + value;
        if (subs_legacy) { 
            webvtt_subs(url + "legacy");
        } else { 
            ass_worker = await create_ass_worker(url);
        }
    }
}

function fix_aspect_ratio() {
    if (video.videoWidth <= 0 || video.videoHeight <= 0) {
        setTimeout(fix_aspect_ratio, 25);
    } else {
        if (video.videoWidth < video.videoHeight) {
            var vCont = videoContainer.style;
            vCont.marginTop = "0 !important";
            vCont.paddingBottom = "0 !important";
        }
        scaleVideo();
    }
}

function scaleVideo() {
    const cw = videoContainer.offsetWidth;
    const ch = videoContainer.offsetHeight;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const scale = Math.min(cw / vw, ch / vh);
    video.style.width = (vw * scale) + "px";
    video.style.height = (vh * scale) + "px";
}


/* Main functions zone */

function next() {
    nextLink.click();
}

function prev() {
    prevLink.click();
}

function chMode() {
    const modes = ["1", "»", "&orarr;"];
    currentMode = (currentMode + 1) % 3;
    mode.innerHTML = modes[currentMode];
    localStorage.setItem("videoMode", currentMode);
}

function toggleMainState() {
    video.paused ? play() : pause();
}

function handleSettingMenu() {
    if (sttbtnpress) {
        sttbtnpress = false;
    } else {
        settingMenu.classList.toggle("show");
        isCursorOnControls = !isCursorOnControls;
    }
}

function saveVolume() {
    localStorage.setItem("videoVolume", volumeVal);
}

function handleVideoEnded() {
    if (currentMode === 1) {
        next();
    } else if (currentMode === 2) {
        video.play();
    } else {
        pause();
    }
}

function showCursor() {
    clearTimeout(cursorTimeout);
    document.body.style.cursor = 'auto';
    if (!video.paused) {
        cursorTimeout = setTimeout(function() {
            if (!video.paused) {
                document.body.style.cursor = 'none';
            }
        }, mouse_ctrl_delay);
    }
}

function play() {
    video.play();
    sh_pause.classList.remove("sh_pause");
    sh_play.classList.add("sh_play");
    show_main_animation("play");
    hideControls(mouse_ctrl_delay);
}

function pause() {
    video.pause();
    controls.classList.add("show");
    show_main_animation("pause");
    handleVideoIcon();
    sh_pause.classList.add("sh_pause");
    sh_play.classList.remove("sh_play");
    if (video.ended) {
        currentTime.style.width = 100 + "%";
    }
}

function handleProgressBar() {
    currentTime.style.width = (video.currentTime / video.duration) * 100 + "%";
    currentDuration.innerHTML = showDuration(video.currentTime);
}


function showDuration(time) {
    const hours = Math.floor(time / 60 ** 2);
    const min = Math.floor((time / 60) % 60);
    const sec = Math.floor(time % 60);
    if (hours > 0) {
        return `${formatter(hours)}:${formatter(min)}:${formatter(sec)}`;
    } else {
        return `${formatter(min)}:${formatter(sec)}`;
    }
}

function formatter(number) {
    return new Intl.NumberFormat({}, {
        minimumIntegerDigits: 2
    }).format(number);
}

function toggleMuteUnmute() {
    volumeBar.classList.remove("show");
    if (!muted) {
        video.volume = 0;
        muted = true;
        handleVideoIcon();
        show_main_animation("mute");
    } else {
        video.volume = volumeVal;
        muted = false;
        handleVideoIcon();
        show_main_animation("unmute");
    }
    timeContainer.style.display = "block";
    localStorage.setItem("videoMuted", muted);
}

function hideControls(delay) {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
        if (!video.paused && !isCursorOnControls) {
            controls.classList.remove("show");
            settingMenu.classList.remove("show");
            for (let i = 0; i < menuButtons.length; i++) {
                menuButtons[i].style.display = "block";
            }
        }
    }, delay);
}

function updateVolumeBar() {
    const percent = volumeBar.value * 100;
    volumeBar.style.background = `linear-gradient(to right, #007aff ${percent}%, #e1e1e1 ${percent}%)`;
}

function handleVolume(e) {
    volumeVal = e.target.value;
    video.volume = volumeVal;
    updateVolumeBar();
    saveVolume();
    handleVideoIcon();
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        videoContainer.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
}

function getchptname(timeInSeconds) {
    for (let i = 0; i < chapters.length; i++) {
        if (timeInSeconds >= chapters[i].start_time) {
            try {
                if (timeInSeconds < chapters[i + 1].start_time) {
                    return chapters[i].title;
                }
            } catch {
                return chapters[i].title;
            }
        }
    }
}

const getPct = clientX => {
  const { x, width, height } = duration.getBoundingClientRect();
  const pos = Math.min(Math.max(0, clientX - x), width);
  return { pct: pos / width, pos, height };
};

function updateTime(pct) {
  currentTime.style.width = `${pct * 100}%`;
  video.currentTime = pct * video.duration;
}


// Time bar control funcs

function showHover(clientX) {
  const { pct, pos, height } = getPct(clientX);
  hoverTime.style.width = `${pct * 100}%`;
  const hovtime = pct * video.duration;
  const timeStr = showDuration(hovtime);
  const chapter = getchptname(hovtime);
  hoverDuration.innerHTML = chapter ? `${timeStr}<br>${chapter}` : timeStr;
  const offset = hoverDuration.offsetWidth / 2;
  hoverDuration.style.cssText = `
    bottom: ${height + 8}px;
    left: ${pos - offset}px;
    display: block;
    visibility: ${offset ? 'visible' : 'hidden'};
  `;
}

function clearHover() {
  hoverTime.style.width = '0';
  hoverDuration.style.display = 'none';
}

function drag(handlerMove) {
  const end = () => document.removeEventListener('mousemove', handlerMove);
  document.addEventListener('mousemove', handlerMove);
  document.addEventListener('mouseup', end, { once: true });
}

function touchDrag(handlerMove) {
  const end = () => document.removeEventListener('touchmove', handlerMove);
  document.addEventListener('touchmove', handlerMove, { passive: true });
  document.addEventListener('touchend', end, { once: true, passive: true });
}


function show_main_animation(mode) {
    sh_play_st.classList.add("sh_play_st");
    sh_pause_st.classList.add("sh_pause_st");
    sh_mute_st.classList.add("sh_mute_st");
    sh_unmute_st.classList.add("sh_unmute_st");
    sh_back_st.classList.add("sh_back_st");
    sh_fordward_st.classList.add("sh_fordward_st");
    switch (mode) {
        case "play":
            sh_play_st.classList.remove("sh_play_st");
            mainState.classList.add("animate-state");
            break;
        case "pause":
            sh_pause_st.classList.remove("sh_pause_st");
            mainState.classList.add("animate-state");
            break;
        case "mute":
            sh_mute_st.classList.remove("sh_mute_st");
            mainState.classList.add("animate-state");
            break;
        case "unmute":
            sh_unmute_st.classList.remove("sh_unmute_st");
            mainState.classList.add("animate-state");
            break;
        case "back":
            sh_back_st.classList.remove("sh_back_st");
            mainState.classList.add("animate-state");
            break;
        case "fordward":
            sh_fordward_st.classList.remove("sh_fordward_st");
            mainState.classList.add("animate-state");
            break;
        default:
            mainState.classList.remove("show");
            break;
    }
}

function handleMainSateAnimationEnd() {
    mainState.classList.remove("animate-state");
    if (video.paused) {
        sh_play_st.classList.remove("sh_play_st");
        sh_mute_st.classList.add("sh_mute_st");
        sh_unmute_st.classList.add("sh_unmute_st");
        sh_back_st.classList.add("sh_back_st");
        sh_fordward_st.classList.add("sh_fordward_st");
    }
}

function handleVideoIcon() {
    if (!muted) {
        if (volumeVal == 0.0) {
            sh_mute.classList.add("sh_mute");
            sh_fulla.classList.add("sh_fulla");
            sh_meda.classList.add("sh_meda");
            sh_lowa.classList.add("sh_lowa");
            sh_noa.classList.remove("sh_noa");
        } else if (volumeVal > 0.67) {
            sh_mute.classList.add("sh_mute");
            sh_fulla.classList.remove("sh_fulla");
            sh_meda.classList.add("sh_meda");
            sh_lowa.classList.add("sh_lowa");
            sh_noa.classList.add("sh_noa");
        } else if (volumeVal > 0.33) {
            sh_mute.classList.add("sh_mute");
            sh_fulla.classList.add("sh_fulla");
            sh_meda.classList.remove("sh_meda");
            sh_lowa.classList.add("sh_lowa");
            sh_noa.classList.add("sh_noa");
        } else if (volumeVal > 0) {
            sh_mute.classList.add("sh_mute");
            sh_fulla.classList.add("sh_fulla");
            sh_meda.classList.add("sh_meda");
            sh_lowa.classList.remove("sh_lowa");
            sh_noa.classList.add("sh_noa");
        }
    } else {
        sh_mute.classList.remove("sh_mute");
        sh_fulla.classList.add("sh_fulla");
        sh_meda.classList.add("sh_meda");
        sh_lowa.classList.add("sh_lowa");
        sh_noa.classList.add("sh_noa");
    }
}

function handleShorthand(e) {
    e.preventDefault();
    if (e.repeat && e.key.toLowerCase()==" ") return;
    if (e.code === 'F5') {
        location.reload(true);
        return;
    }
    if (e.code === 'F11') {
        toggleFullscreen();
        return;
    }
    if (e.key.match(/[0-9]/gi)) {
        video.currentTime = (video.duration / 100) * (parseInt(e.key) * 10);
        currentTime.style.width = parseInt(e.key) * 10 + "%";
        return;
    }
    switch (e.key.toLowerCase()) {
        case " ":
            video.paused ? play() : pause();
            break;
        case "f":
            toggleFullscreen();
            break;
        case "arrowright":
            controls.classList.add("show");
            hideControls(500);
            video.currentTime += 5;
            handleProgressBar();
            show_main_animation("fordward");
            break;
        case "arrowleft":
            controls.classList.add("show");
            hideControls(500);
            video.currentTime -= 5;
            handleProgressBar();
            show_main_animation("back");
            break;
        case "arrowup":
            prev();
            break;
        case "arrowdown":
            next();
            break;
        case "r":
            chMode();
            break;
        case "q":
            toggleMuteUnmute();
            break;
        case "+":
            if (volumeVal < 1 && !muted) {
                volumeVal = parseFloat(volumeVal + 0.05);
                if (volumeVal > 1) {
                    volumeVal = 1;
                }
                video.volume = volumeVal;
                volumeBar.value = volumeVal;
                updateVolumeBar();
                handleVideoIcon();
                saveVolume();
            }
            break;
        case "-":
            if (volumeVal > 0 && !muted) {
                volumeVal = parseFloat(volumeVal - 0.05);
                if (volumeVal < 0) {
                    volumeVal = 0;
                }
                video.volume = volumeVal;
                volumeBar.value = volumeVal;
                updateVolumeBar();
                handleVideoIcon();
                saveVolume();
            }
            break;
        default:
            break;
    }
}

function loadTracks() {
    try {
        saved = localStorage.getItem("videoAudio");
        audioTracks = video.audioTracks;
        for (let i = 0; i < audioTracks.length; i++) {
            const track = audioTracks[i];
            const option = document.createElement('option');
            option.value = i;
            name = (track.label || track.language || "Track " + (i + 1));
            option.textContent = name;
            audioTracksSelect.appendChild(option);
            if (name === saved) {
                audioTracksSelect.selectedIndex = i;
                changeTrack();
            } else {
                audioTracksSelect.selectedIndex = 0;
            }
        }
    } catch {}
}

function changeTrack(selectedIndex) {
    if (!isNaN(selectedIndex)) {
        originalTime = video.currentTime;
        for (let i = 0; i < audioTracks.length; i++) {
            audioTracks[i].enabled = (i === selectedIndex);
        }
        video.currentTime = originalTime;
    }
}

function split_timeline_chapters() {
    const divLength = video.duration;
    const container = document.querySelector(".chapter-container");
    // Sort times and add the initial time (0 seconds)
    chptdata = [...chapters.map(item => item.start_time), divLength];
    // Create sections within the div
    chptdata.slice(0, -1).forEach((time, index) => {
        const nextTime = chptdata[index + 1];
        const startPercent = Math.min((time / divLength) * 100, 100)
        const section = document.createElement('div');
        section.classList.add("chapter");
        section.style.left = `${startPercent}%`;
        container.appendChild(section);
    });
}

function double_touch(e) {
    e.preventDefault();
    clearTimeout(touchTimeout);
    if (touchFix) {
        touchFix = false;
        return;
    }
    const now = Date.now();
    const touchInterval = now - lastTouchTime;
    const divRect = touchBox.getBoundingClientRect();
    if (touchInterval < doubleTouch_delay) {
        const touchX = event.changedTouches[0].clientX;
        const centerX = divRect.left + (divRect.width / 2);
        const p = touchX < centerX;
        if (p) {
            video.currentTime -= 5;
            show_main_animation("back");
        } else {
            video.currentTime += 5;
            show_main_animation("fordward");
        }
    } else {
        touchTimeout = setTimeout(toggleMainState, doubleTouch_delay);
    }
    lastTouchTime = now;
}

async function addrmMLcl() {
    sttbtnpress = true;
    if (settingsBtn.classList.contains('lmbsl')) {
        subs_legacy = false;
        settingsBtn.classList.remove('lmbsl');
    } else {
        subs_legacy = true;
        settingsBtn.classList.add('lmbsl');
    }
    localStorage.setItem("subsLegacy", subs_legacy);
    await changeSubs(subtitleId);
}


/* Event listeners */

// Window events
window.addEventListener('resize', scaleVideo);
window.addEventListener('fullscreenchange', scaleVideo);

// Video events
video.addEventListener("play", play);
video.addEventListener("pause", pause);
video.addEventListener("waiting", () => {
    loader.classList.add("show");
});
video.addEventListener("playing", () => {
    loader.classList.remove("show");
});

// Video container events
videoContainer.addEventListener("mouseleave", () => {
    clearTimeout(cursorTimeout);
    document.body.style.cursor = 'auto';
    hideControls(50);
});
videoContainer.addEventListener("mousemove", (e) => {
    controls.classList.add("show");
    showCursor();
    hideControls(mouse_ctrl_delay);
});
videoContainer.addEventListener("fullscreenchange", () => {
    videoContainer.classList.toggle("fullscreen", document.fullscreenElement);
    if (video.videoWidth >= video.videoHeight) {
        screen.orientation.lock('landscape').catch(() => {});
    } else {
        screen.orientation.lock('portrait').catch(() => {});
    }
});
videoContainer.addEventListener('touchmove', () => {
    touchFix = true;
    controls.classList.add("show");
    hideControls(2500);
}, {
    passive: false
});

// Duration and navigation events

// Controls events
controls.addEventListener("click", () => {
    controls.classList.add("show");
    showCursor();
    hideControls(mouse_ctrl_delay);
});

// Volume events
volume.addEventListener("mouseenter", () => {
    if (!muted) { timeContainer.style.display = "none"; }
    muted ? volumeBar.classList.remove("show") : volumeBar.classList.add("show");
});
volume.addEventListener("mouseleave", () => {
    volumeBar.classList.remove("show");
    setTimeout(()=>{ timeContainer.style.display = "block"; }, 100);
});
volumeBar.addEventListener('input', (e) => {
    handleVolume(e);
});

// Settings events
settingsBtn.addEventListener("mousedown", (e) => {
    e.preventDefault();
    mber = setTimeout(addrmMLcl, 600);
});
settingsBtn.addEventListener("mouseup", () => {
    clearTimeout(mber);
});
settingsBtn.addEventListener("touchstart", (e) => {
    e.preventDefault();
    mber = setTimeout(addrmMLcl, 600);
}, {
    passive: false
});
settingsBtn.addEventListener("touchend", () => {
    clearTimeout(mber);
});
settingsBtn.addEventListener("click", (e) => {
    if (sttbtnpress) {
        e.preventDefault();
        sttbtnpress = false;
    } else {
        handleSettingMenu();
    }
});
settingsBtn.addEventListener("touchend", (e) => {
    if (sttbtnpress) {
        e.preventDefault();
        sttbtnpress = false;
    } else {
        handleSettingMenu();
    }
});

// Track selection events
audioTracksSelect.addEventListener('change', function() {
    selectedIndex = parseInt(this.value, 10);
    changeTrack(selectedIndex);
    text = audioTracksSelect[selectedIndex].text;
    localStorage.setItem("videoAudio", text);
    handleSettingMenu();
});
subtitleSelect.addEventListener('change', async function() {
    subtitleId = parseInt(this.value);
    if (subtitleId == -1) {
        localStorage.removeItem("videoSubs");
    } else {
        text = subtitleSelect.options[subtitleId + 1].text;
        localStorage.setItem("videoSubs", text);
    }
    await changeSubs(subtitleId);
    handleSettingMenu();
});
speedSelect.addEventListener('change', function() {
    video.playbackRate = parseFloat(this.value);
    localStorage.setItem("videoSpeed", video.playbackRate);
    handleSettingMenu();
});

// Main state events
mainState.addEventListener("animationend", handleMainSateAnimationEnd);

// Touch interaction events
touchBox.addEventListener('touchend', double_touch);
touchBox.addEventListener("click", (e) => {
    e.preventDefault();
    toggleMainState();
    showCursor();
});

// Keyboard events
document.addEventListener("keydown", handleShorthand);

// Download event
liD.addEventListener("click", () => {
    downloadLink.click();
    handleSettingMenu();
});

duration.addEventListener('mousedown', e =>
  drag(eMove => updateTime(getPct(eMove.clientX).pct))
);
duration.addEventListener('touchstart', e =>
  touchDrag(eMove => updateTime(getPct(eMove.touches[0]?.clientX).pct))
);

document.addEventListener('touchstart', () => { fixTouchHover = true; clearHover(); }, { passive: true });
duration.addEventListener('click', e => updateTime(getPct(e.clientX).pct));
duration.addEventListener('mousemove', e => { if (!fixTouchHover) { showHover(e.clientX); } });
duration.addEventListener('mouseleave', () => { fixTouchHover = false; clearHover(); });

