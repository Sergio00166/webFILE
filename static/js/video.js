/* Code by Sergio00166 */

let mouse_ctrl_delay = 1500;
let doubleTouch_delay = 400;

var video = document.querySelector("video");
const volume = document.querySelector(".volume");
const currentTime = document.querySelector(".current-time");
const duration = document.querySelector(".duration");
const buffer = document.querySelector(".buffer");
const totalDuration = document.querySelector(".total-duration");
const currentDuration = document.querySelector(".current-duration");
const controls = document.querySelector(".controls");
var videoContainer = document.querySelector(".video-container");
const currentVol = document.querySelector(".current-vol");
const totalVol = document.querySelector(".max-vol");
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

var mode = document.getElementById("mode");
var currentMode = localStorage.getItem("videoMode");
var muted = localStorage.getItem("videoMuted");
var subs_legacy = localStorage.getItem("subsLegacy");
var subtitleId = 0;


/* Start functions zone */

let ass_worker;
function crate_ass_worker(url) {
    return new JASSUB({
        video: video, canvas: canvas, subUrl: url,
        workerUrl: '/?static=jassub/worker.js',
        wasmUrl: '/?static=jassub/worker.wasm',
        useLocalFonts: true, fallbackFont: "arial",
        availableFonts: { 'arial': '/?static=jassub/arial.ttf' }
    });
}
function webvtt_subs(url) {
    var track = document.createElement('track');
    track.kind = 'subtitles';
    track.src = url;
    track.default = true;
    track.mode = 'showing';
    video.appendChild(track);
}
function is_SSA_subs(url) {
    const xhr = new XMLHttpRequest();
    xhr.open('HEAD', url, false);
    try {
        xhr.send();
        const mimeType = xhr.getResponseHeader("Content-Type");
        return mimeType==="application/x-substation-alpha";
    } catch (e){ return false; }
}
function changeSubs(value) {
    var existingTrack = video.querySelector('track[kind="subtitles"]');
    if (existingTrack){ existingTrack.parentNode.removeChild(existingTrack); }
    if (ass_worker) { ass_worker.destroy(); }
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    if (value > -1) {
        url = window.location.pathname+"?subs="+value;
        if (!is_SSA_subs(url)) { webvtt_subs(url); }
        else if (subs_legacy) { webvtt_subs(url+"legacy"); }
        else { ass_worker = crate_ass_worker(url); }
    }
}
function fix_aspect_ratio(){
    if (video.videoWidth<=0 || video.videoHeight<=0){ 
        setTimeout(fix_aspect_ratio,25);
    } else {
        if (video.videoWidth < video.videoHeight){
            var vCont = videoContainer.style;
            vCont.marginTop = "0 !important";
            vCont.paddingBottom = "0 !important";
        } scaleVideo();
    }
}

function scaleVideo(){
    const cw = videoContainer.offsetWidth;
    const ch = videoContainer.offsetHeight;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const scale = Math.min( cw/vw,ch/vh );
    video.style.width  = (vw*scale)+"px";
    video.style.height = (vh*scale)+"px";
}
window.addEventListener('resize', scaleVideo);
window.addEventListener('fullscreenchange', scaleVideo);


/* Inicialitate everything */
{
    if (subs_legacy != null) {
        if (subs_legacy == "true") {
            subs_legacy = true;
            settingsBtn.classList.add('lmbsl');
        } else { subs_legacy = false; }
    } else { subs_legacy = false; }

    const text = localStorage.getItem("videoSubs");

    for (var i = 0; i < subtitleSelect.options.length; i++) {
        if (subtitleSelect.options[i].text === text) {
            subtitleId = i;  break;
        }
    }
    subtitleSelect.selectedIndex = subtitleId;
    subtitleId = subtitleId - 1;
    changeSubs(subtitleId);

    var saved_speed = localStorage.getItem("videoSpeed");
    if (saved_speed != null) {
        video.playbackRate = parseFloat(saved_speed);
        for (let i = 0; i < speedSelect.options.length; i++) {
            if (speedSelect.options[i].value === saved_speed) {
                speedSelect.selectedIndex = i;  break;
            }
        }
    } else { speedSelect.selectedIndex = 3; }

    if (currentMode != null) {
        currentMode = parseInt(currentMode);
        mode.innerHTML = ["1", "»", "&orarr;"][currentMode] || "1";
    } else { currentMode = 0; }

    var volumeVal = localStorage.getItem("videoVolume");
    if (volumeVal === null) { volumeVal = 1; }
    video.volume = parseFloat(volumeVal);
    currentVol.style.width = volumeVal * 100 + "%";

    // Cast value
    if (muted != null) {
        if (muted == "true") {
            muted = true;
            video.volume = 0;
        } else { muted = false; }
    } else { muted = false; }
}
{
    handleVideoIcon();
    video.play();
    if (video.paused) { pause(); } 
    setVideoTime();
    fix_aspect_ratio();
}


/* Rest of the functions */

let mouseDownProgress = false,
    mouseDownVol = false,
    isCursorOnControls = false,
    timeout,
    mouseOverDuration = false,
    touchClientX = 0,
    touchPastDurationWidth = 0,
    touchStartTime = 0;

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
        settingMenu.classList.toggle("show-setting-menu");
        isCursorOnControls = !isCursorOnControls;
    }
}

function saveVolume() {
    localStorage.setItem("videoVolume", volumeVal);
}

function setVideoTime() {
    if (!(isNaN(video.duration) || video.duration === 0)) {
        totalDuration.innerHTML = showDuration(video.duration);
        split_timeline_chapters();
        loadTracks();
    } else {
        setTimeout(setVideoTime, 25);
    }
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

// Video Event Listeners
video.addEventListener("play", play);
video.addEventListener("pause", pause);

video.addEventListener("waiting", function () {
    loader.classList.add("show-state");
});
video.addEventListener("playing", function () {
    loader.classList.remove("show-state");
});
document.addEventListener("keydown", handleShorthand);
duration.addEventListener("click", navigate);

controls.addEventListener("click", () => {
    controls.classList.add("show-controls");
    showCursor();
    hideControls(mouse_ctrl_delay);
});

duration.addEventListener("mousedown", (e) => {
    mouseDownProgress = true;
    navigate(e);
});

document.addEventListener("mouseup", () => {
    mouseDownProgress = false;
    mouseDownVol = false;
});

videoContainer.addEventListener("mouseleave", () => {
    clearTimeout(cursorTimeout);
    document.body.style.cursor = 'auto';
    hideControls(50);
});

videoContainer.addEventListener("mousemove", (e) => {
    controls.classList.add("show-controls");
    showCursor();
    handleMousemove(e);
    hideControls(mouse_ctrl_delay);
});

duration.addEventListener("mouseenter", () => {
    mouseOverDuration = true;
});

duration.addEventListener("mouseleave", () => {
    mouseOverDuration = false;
    hoverTime.style.width = 0;
    hoverDuration.style.display = 'none';
});

duration.addEventListener("touchmove", handleTouchNavigate);


let cursorTimeout;
function showCursor() {
    clearTimeout(cursorTimeout);
    document.body.style.cursor = 'auto';
    if (!video.paused) {
        cursorTimeout = setTimeout(function () {
            if (!video.paused) {
                document.body.style.cursor = 'none';
            }
        }, mouse_ctrl_delay);
    }
}

mainState.addEventListener("click", toggleMainState);
mainState.addEventListener("animationend", handleMainSateAnimationEnd);

videoContainer.addEventListener("fullscreenchange",()=> {
    videoContainer.classList.toggle("fullscreen", document.fullscreenElement);
    if (video.videoWidth >= video.videoHeight){
        screen.orientation.lock('landscape').catch(()=>{});
    } else {
        screen.orientation.lock('portrait').catch(()=>{});
    }
});

volume.addEventListener("mouseenter", () => {
    muted ? totalVol.classList.remove("show") : totalVol.classList.add("show");
});

volume.addEventListener("mouseleave", () => {
    totalVol.classList.remove("show");
});

totalVol.addEventListener("mousedown", (e) => {
    mouseDownVol = true;
    handleVolume(e);
});

function play() {
    video.play();
    sh_pause.classList.remove("sh_pause");
    sh_play.classList.add("sh_play");
    show_main_animation("");
    hideControls(mouse_ctrl_delay);
}

function pause() {
    video.pause();
    controls.classList.add("show-controls");
    show_main_animation("play");
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
video.ontimeupdate = handleProgressBar;

function navigate(e) {
    try {
        const totalDurationRect = duration.getBoundingClientRect();
        const width = Math.min(
            Math.max(0, e.clientX - totalDurationRect.x),
            totalDurationRect.width
        );
        currentTime.style.width = (width / totalDurationRect.width) * 100 + "%";
        video.currentTime = (width / totalDurationRect.width) * video.duration;
    } catch {};
}

function handleTouchNavigate(e) {
    if (e.timeStamp - touchStartTime > 500) {
        const durationRect = duration.getBoundingClientRect();
        const clientX = e.changedTouches[0].clientX;
        const offsetX = clientX - durationRect.left;
        const value = Math.min(
            Math.max(0, offsetX),
            durationRect.width
        );
        currentTime.style.width = value + "px";
        video.currentTime = (value / durationRect.width) * video.duration;
        currentDuration.innerHTML = showDuration(video.currentTime);
    }
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
    totalVol.classList.remove("show");
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
    localStorage.setItem("videoMuted", muted);
}

function hideControls(delay) {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
        if (!video.paused && !isCursorOnControls) {
            controls.classList.remove("show-controls");
            settingMenu.classList.remove("show-setting-menu");
            for (let i = 0; i < menuButtons.length; i++) {
                menuButtons[i].style.display = "block";
            }
        }
    }, delay);
}

function handleVolume(e) {
    const totalVolRect = totalVol.getBoundingClientRect();
    volumeVal = Math.min(Math.max(0, (e.clientX - totalVolRect.x) / totalVolRect.width), 1);
    currentVol.style.width = volumeVal * 100 + "%";
    saveVolume();
    video.volume = volumeVal;
    handleVideoIcon();
}

function handleProgress() {
    var currentTime = video.currentTime;
    var buffLen = video.buffered.length;
    var i;

    for (i = 0; i < buffLen; i++) {
        if (video.buffered.start(i) <= currentTime && currentTime < video.buffered.end(i)) {
            var currentBufferLength = video.buffered.end(i);
            break;
        }
    }
    // Calculate buffer width
    var width = (currentBufferLength / video.duration) * 100;
    buffer.style.width = width + "%";
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

// Prevent mouse events from triggering after a touch event
touchActive = false;
let fixtouch;
document.addEventListener('touchstart', ()=> {
    clearTimeout(fixtouch);
    touchActive = true;
});
document.addEventListener('touchend', ()=> {
    clearTimeout(fixtouch);
    fixtouch = setTimeout(() => {
        touchActive = false
    }, 500);
});


function handleMousemove(e) {
    if (mouseDownProgress) {
        hoverTime.style.width = 0;
        hoverDuration.style.display = 'none';
        e.preventDefault();
        navigate(e);
    } else if (mouseDownVol) {
        handleVolume(e);
    } else if (mouseOverDuration) {
        const rect = duration.getBoundingClientRect();
        hoverDuration.style.bottom = `${rect.height+8}px`;
        const width = Math.min(Math.max(0, e.clientX - rect.x), rect.width);
        if (!touchActive) {
            const percent = (width / rect.width) * 100;
            hoverTime.style.width = `${percent}%`;
            const hovtime = (video.duration * percent) / 100;
            hoverDuration.innerHTML = showDuration(hovtime);
            const chapter = getchptname(hovtime);
            if (chapter) { hoverDuration.innerHTML += "<br>"+chapter; }
            const offset = hoverDuration.offsetWidth/2;
            var hvs = hoverDuration.style;
            hvs.left = (width-offset)+"px";
            hvs.display = 'block';
            hvs.visibility = offset===0 ? "hidden":"visible";
       } else {
            e.preventDefault();
        }
    }
}


function show_main_animation(mode) {
    sh_play_st.classList.add("sh_play_st");
    sh_mute_st.classList.add("sh_mute_st");
    sh_unmute_st.classList.add("sh_unmute_st");
    sh_back_st.classList.add("sh_back_st");
    sh_fordward_st.classList.add("sh_fordward_st");
    switch (mode) {
    case "play":
        mainState.classList.add("show-state");
        sh_play_st.classList.remove("sh_play_st");
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
        mainState.classList.remove("show-state");
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
        video.currentTime += 5;
        show_main_animation("fordward");
        break;
    case "arrowleft":
        video.currentTime -= 5;
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
            handleVideoIcon();
            currentVol.style.width = volumeVal * 100 + "%";
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
            handleVideoIcon();
            currentVol.style.width = volumeVal * 100 + "%";
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

let originalTime = 0;

function changeTrack(selectedIndex) {
    if (!isNaN(selectedIndex)) {
        originalTime = video.currentTime;
        for (let i = 0; i < audioTracks.length; i++) {
            audioTracks[i].enabled = (i === selectedIndex);
        }
        video.currentTime = originalTime;
    }
}

audioTracksSelect.addEventListener('change', function () {
    selectedIndex = parseInt(this.value, 10);
    changeTrack(selectedIndex);
    text = audioTracksSelect[selectedIndex].text
    localStorage.setItem("videoAudio", text);
    handleSettingMenu();
});

subtitleSelect.addEventListener('change', function () {
    subtitleId = parseInt(this.value);
    changeSubs(subtitleId);
    if (subtitleId == -1) {
        localStorage.removeItem("videoSubs");
    } else {
        text = subtitleSelect.options[subtitleId + 1].text;
        localStorage.setItem("videoSubs", text);
    }
    handleSettingMenu();
});

speedSelect.addEventListener('change', function () {
    video.playbackRate = parseFloat(this.value);
    localStorage.setItem("videoSpeed", video.playbackRate);
    handleSettingMenu();
});

liD.addEventListener("click", () => {
    downloadLink.click();
    handleSettingMenu();
});

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

// Show menu if screen movement (touch)
videoContainer.addEventListener('touchmove',()=>{
    touchFix = true;
    controls.classList.add("show-controls");
    hideControls(2500);
});

let lastTouchTime = 0;
let touchTimeout;
let touchFix;
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

touchBox.addEventListener("click",(e)=>{
    e.preventDefault();
    toggleMainState();
    showCursor();
});
touchBox.addEventListener('touchend', double_touch);

var mber = undefined;
var sttbtnpress = false;
settingsBtn.addEventListener("mouseup", (e) => {
    clearTimeout(mber);
});
settingsBtn.addEventListener("touchend", (e) => {
    clearTimeout(mber);
});

function addrmMLcl() {
    sttbtnpress = true;
    if (settingsBtn.classList.contains('lmbsl')) {
        subs_legacy = false;
        changeSubs(subtitleId);
        settingsBtn.classList.remove('lmbsl');
    } else {
        subs_legacy = true;
        changeSubs(subtitleId);
        settingsBtn.classList.add('lmbsl');
    }
    localStorage.setItem("subsLegacy", subs_legacy);
}
settingsBtn.addEventListener("mousedown", (e) => {
    e.preventDefault();
    mber = setTimeout(addrmMLcl, 600);
});
settingsBtn.addEventListener("touchstart", (e) => {
    e.preventDefault();
    mber = setTimeout(addrmMLcl, 600);
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
