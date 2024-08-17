/* Code by Sergio00166 */

const downloadLink = document.querySelector("a");
const video = document.querySelector("video");
const volume = document.querySelector(".volume");
const currentTime = document.querySelector(".current-time");
const duration = document.querySelector(".duration");
const buffer = document.querySelector(".buffer");
const totalDuration = document.querySelector(".total-duration");
const currentDuration = document.querySelector(".current-duration");
const controls = document.querySelector(".controls");
const videoContainer = document.querySelector(".video-container");
const currentVol = document.querySelector(".current-vol");
const totalVol = document.querySelector(".max-vol");
const mainState = document.querySelector(".main-state");
const hoverTime = document.querySelector(".hover-time");
const hoverDuration = document.querySelector(".hover-duration");
const settingMenu = document.querySelector(".setting-menu");
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
const sh_fulla = document.querySelector(".sh_fulla");
const sh_lowa = document.querySelector(".sh_lowa");
const sh_meda = document.querySelector(".sh_meda");
const sh_noa = document.querySelector(".sh_noa");

var mode = document.getElementById("mode");
var currentMode = localStorage.getItem("videoMode");
var muted = localStorage.getItem("videoMuted");

{
    text = localStorage.getItem("videoSubs");
    selectedIndex = 0;
    for (var i = 0; i < subtitleSelect.options.length; i++) {
        if (subtitleSelect.options[i].text === text) {
          selectedIndex = i; break; }
    }  subtitleSelect.selectedIndex = selectedIndex;
    changeSubs(selectedIndex-1);
    
    var saved_speed = localStorage.getItem("videoSpeed");
    if (saved_speed != null) {
        video.playbackRate = parseFloat(saved_speed);
        for (let i = 0; i < speedSelect.options.length; i++) {
            if (speedSelect.options[i].value === saved_speed) {
                speedSelect.selectedIndex = i; break; } }
    } else { speedSelect.selectedIndex = 3; }
}

if (currentMode != null) {
    currentMode = parseInt(currentMode);
    mode.innerHTML = ["1", "»", "↻"][currentMode] || "1";
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

let mouseDownProgress = false,
    mouseDownVol = false,
    isCursorOnControls = false,
    timeout,
    mouseOverDuration = false,
    touchClientX = 0,
    touchPastDurationWidth = 0,
    touchStartTime = 0;

function next() { window.location.href = nextUrl; }
function prev() { window.location.href = prevUrl; }
function download() { downloadLink.click(); }

canPlayInit();

function chMode() {
    const modes = ["1", "»", "↻"];
    currentMode = (currentMode + 1) % 3;
    mode.innerHTML = modes[currentMode];
    localStorage.setItem("videoMode", currentMode);
}

function toggleMainState() { 
    video.paused ? play() : pause();
}
function handleSettingMenu() {
    settingMenu.classList.toggle("show-setting-menu");
}
function saveVolume() {
    localStorage.setItem("videoVolume", volumeVal);
}

function setVideoTime() {
    if (!(isNaN(video.duration) || video.duration === 0)) {
        totalDuration.innerHTML = showDuration(video.duration);
        loadTracks(); split_timeline_chapters();
    } else { setTimeout(setVideoTime, 25); }
}

function canPlayInit() {
    handleAudioIcon();
    video.play();
    if (video.paused) {
        pause();
    } setVideoTime();
}

function handleVideoEnded() {
    if (currentMode === 1) { next(); }
    else if (currentMode === 2) { video.play(); }
    else { pause(); }
}

// Video Event Listeners
video.addEventListener("play", play);
video.addEventListener("pause", pause);
// Disable the video buffered representation due to weird bugs
//video.addEventListener("progress", handleProgress);

video.addEventListener("waiting", function() {
    loader.classList.add("show-state");    
});
video.addEventListener("playing", function() {
    loader.classList.remove("show-state");
});
document.addEventListener("keydown", handleShorthand);
duration.addEventListener("click", navigate);

duration.addEventListener("mousedown", (e) => {
    mouseDownProgress = true;
    navigate(e);
});

document.addEventListener("mouseup", (e) => {
    mouseDownProgress = false;
    mouseDownVol = false;
});

document.addEventListener("mousemove", (e) => {
    controls.classList.add("show-controls");
    showCursor();
    handleMousemove(e);
    hideControls();
});

duration.addEventListener("mouseenter", (e) => {
    mouseOverDuration = true;
});

duration.addEventListener("mouseleave", (e) => {
    mouseOverDuration = false;
    hoverTime.style.width = 0;
    hoverDuration.style.display = 'none';
});

let hideHoverTimeout;
function hideHoverDuration() {
    clearTimeout(hideHoverTimeout);
    hoverDuration.style.left = "-9999px";
    hoverDuration.style.width = "0px";
    hideHoverTimeout = setTimeout(function() {
        hoverDuration.style.left = "";
        hoverDuration.style.width = "";
        hoverTime.style.width = 0;
        hoverDuration.style.display = 'none';
        mouseOverDuration = false;
    }, 250);
}

// Magic tricks to hide the time when using touchscreen
duration.addEventListener("touchmove", handleTouchNavigate);
duration.addEventListener("touchstart", (e) => {
    setTimeout(function() { hideHoverDuration(); },250);
}); // Fix showing the time when hoving
duration.addEventListener("touchend", hideHoverDuration);

let cursorTimeout;
function showCursor() {
    if (cursorTimeout) { clearTimeout(cursorTimeout); }
    document.body.style.cursor = 'auto';
    if (!video.paused) {
        cursorTimeout = setTimeout(function() {
            if (!video.paused) { document.body.style.cursor = 'none'; }
        }, 3000);
    }
}

videoContainer.addEventListener("fullscreenchange", () => {
    videoContainer.classList.toggle("fullscreen", document.fullscreenElement);
    if (video.videoWidth>=video.videoHeight) {
        screen.orientation.lock('landscape').catch(() => {});
    } else {
        screen.orientation.lock('portrait').catch(() => {});
    }
});

mainState.addEventListener("click", toggleMainState);
mainState.addEventListener("animationend", handleMainSateAnimationEnd);
video.addEventListener("animationend", handleMainSateAnimationEnd);

volume.addEventListener("mouseenter", () => {
    muted ? totalVol.classList.remove("show") : totalVol.classList.add("show");
});

volume.addEventListener("mouseleave", (e) => {
    totalVol.classList.remove("show");
});

totalVol.addEventListener("mousedown", (e) => {
    mouseDownVol = true;
    handleVolume(e);
});

videoContainer.addEventListener('touchmove', function(event) {
    // Show menu if screen movement (touch)
    controls.classList.add("show-controls");
    showCursor(); hideControls();
}, false);

controls.addEventListener('touchend', hideControls);

function play() {
    video.play();
    sh_pause.classList.remove("sh_pause");
    sh_play.classList.add("sh_play");
    mainState.classList.remove("show-state");
    sh_mute_st.classList.add("sh_mute_st");
    sh_unmute_st.classList.add("sh_unmute_st");
    hideControls();
}

video.ontimeupdate = handleProgressBar;

function handleProgressBar() {
    currentTime.style.width = (video.currentTime / video.duration) * 100 + "%";
    currentDuration.innerHTML = showDuration(video.currentTime);
}

function pause() {
    video.pause();
    controls.classList.add("show-controls");
    mainState.classList.add("show-state");
    sh_play_st.classList.remove("sh_play_st");
    sh_mute_st.classList.add("sh_mute_st");
    sh_unmute_st.classList.add("sh_unmute_st");
    handleAudioIcon();
    sh_pause.classList.add("sh_pause");
    sh_play.classList.remove("sh_play");
    if (video.ended) { currentTime.style.width = 100+"%"; }
}

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
        sh_play_st.classList.add("sh_play_st");
        sh_mute_st.classList.remove("sh_mute_st");
        sh_unmute_st.classList.add("sh_unmute_st");
        handleAudioIcon();
        mainState.classList.add("animate-state");
    } else {
        video.volume = volumeVal;
        muted = false;
        sh_play_st.classList.add("sh_play_st");
        sh_mute_st.classList.add("sh_mute_st");
        sh_unmute_st.classList.remove("sh_unmute_st");
        handleAudioIcon();
        mainState.classList.add("animate-state");
    }
    localStorage.setItem("videoMuted", muted);
}

function hideControls() {
    if (timeout) { clearTimeout(timeout); }
    timeout = setTimeout(() => {
        if (!video.paused && !isCursorOnControls) {
            controls.classList.remove("show-controls");
            settingMenu.classList.remove("show-setting-menu");
            for (let i = 0; i < menuButtons.length; i++) {
                menuButtons[i].style.display = "block";
            }
        }
    }, 2500);
}

function handleVolume(e) {
    const totalVolRect = totalVol.getBoundingClientRect();
    volumeVal = Math.min(Math.max(0, (e.clientX - totalVolRect.x) / totalVolRect.width), 1);
    currentVol.style.width = volumeVal * 100 + "%";
    saveVolume();
    video.volume = volumeVal;
    handleAudioIcon();
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
        video.style.width = '100vw';
        video.style.objectFit = 'cover';
    } else {
        document.exitFullscreen();
        video.style.width = '';
        video.style.objectFit = '';
    }
}

function getchptname(timeInSeconds) {
    for (let i = 0; i < chapters.length; i++) {
        const cond0 = i === chapters.length-1;
        const cond1 = timeInSeconds >= chapters[i].start_time;
        const cond2 = timeInSeconds < chapters[i+1].start_time;
        const cond = cond0 || (cond1 && cond2);
        if (cond) { return chapters[i].title; }
    } return "";
}

function handleMousemove(e) {
    if (mouseDownProgress) {
        hoverTime.style.width = 0;
        hoverDuration.style.display = 'none';
        e.preventDefault();
        navigate(e);
    } else if (mouseDownVol) {
        handleVolume(e);
    } else if (mouseOverDuration) {
        hoverDuration.style.display = 'block';
        const rect = duration.getBoundingClientRect();
        const width = Math.min(Math.max(0,e.clientX-rect.x),rect.width);
        const percent = (width/rect.width)*100;
        hoverTime.style.width = percent+"%";
        hovtime = (video.duration/100)*percent;
        ctime = showDuration(hovtime);
        const title = getchptname(hovtime);
        if (!title) { 
            hoverDuration.innerHTML = ctime;
            hoverDuration.style.top = "-25px";
        } else { 
            hoverDuration.innerHTML = ctime+"<br>"+title;
            hoverDuration.style.top = "-35px";
        }
        const size = hoverDuration.getBoundingClientRect().width;
        hoverDuration.style.right = "-"+size/2+"px";    
    }
}

function handleMainSateAnimationEnd() {
    mainState.classList.remove("animate-state");
    if (video.paused) {
        sh_play_st.classList.remove("sh_play_st");
        sh_mute_st.classList.add("sh_mute_st");
        sh_unmute_st.classList.add("sh_unmute_st");
    }
}

function handleAudioIcon() {
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
    const tagName = document.activeElement.tagName.toLowerCase();
    if (tagName === "input") return;
    if (e.key.match(/[0-9]/gi)) {
        video.currentTime = (video.duration / 100) * (parseInt(e.key) * 10);
        currentTime.style.width = parseInt(e.key) * 10 + "%";
    }
    switch (e.key.toLowerCase()) {
        case " ": video.paused ? play() : pause(); break;
        case "f": toggleFullscreen(); break;
        case "arrowright": video.currentTime += 5; break;
        case "arrowleft": video.currentTime -= 5; break;
        case "arrowup": prev(); break;
        case "arrowdown": next(); break;
        case "r": changeMode(); break;
        case "q": toggleMuteUnmute(); break;
        case "+":
            if (volumeVal < 1 && !muted) {
                volumeVal = parseFloat(volumeVal + 0.05);
                if (volumeVal > 1) { volumeVal = 1; }
                video.volume = volumeVal;
                handleAudioIcon();
                currentVol.style.width = volumeVal * 100 + "%";
                saveVolume();
            } break;
        case "-":
            if (volumeVal > 0 && !muted) {
                volumeVal = parseFloat(volumeVal - 0.05);
                if (volumeVal < 0) { volumeVal = 0; }
                video.volume = volumeVal;
                handleAudioIcon();
                currentVol.style.width = volumeVal * 100 + "%";
                saveVolume();
            } break;
        default: break;
    }
}

function loadTracks() {
    saved = localStorage.getItem("videoAudio");
    audioTracks = video.audioTracks;
    for (let i = 0; i < audioTracks.length; i++) {
        const track = audioTracks[i];
        const option = document.createElement('option');
        option.value = i;
        name = (track.label || track.language || "Track "+(i+1));
        option.textContent = name;
        audioTracksSelect.appendChild(option);
        if (name === saved) { 
            audioTracksSelect.selectedIndex = i;
            changeTrack();
        } else { audioTracksSelect.selectedIndex = 0; }
    } 
}

let originalTime = 0;
function changeTrack(selectedIndex) {
    if (!isNaN(selectedIndex)) {
        originalTime = video.currentTime;
        for (let i = 0; i < audioTracks.length; i++) {
            audioTracks[i].enabled = (i === selectedIndex);
        } video.currentTime = originalTime;
    }    
}

audioTracksSelect.addEventListener('change', function() {
    selectedIndex = parseInt(this.value, 10);
    changeTrack(selectedIndex);
    text = audioTracksSelect[selectedIndex].text
    localStorage.setItem("videoAudio", text);
});

function changeSubs(value){
    var existingTrack = video.querySelector('track[kind="subtitles"]');
    if (existingTrack) {
        existingTrack.parentNode.removeChild(existingTrack);
    }
    if (value > -1) {
        url = window.location.pathname+"/?mode=subs"+value;
        var track = document.createElement('track');
        track.kind = 'subtitles';
        track.src = url;
        track.default = true;
        track.mode = 'showing';
        video.appendChild(track);
    }
}

subtitleSelect.addEventListener('change', function() {
    const value = parseInt(this.value);
    changeSubs(value);
    if (value == -1) { 
        localStorage.removeItem("videoSubs");
    } else { 
        text = subtitleSelect.options[value+1].text;
        localStorage.setItem("videoSubs", text);
    }
});

speedSelect.addEventListener('change', function() {
    video.playbackRate = parseFloat(this.value);
    localStorage.setItem("videoSpeed", video.playbackRate);
});

const liD = document.getElementById("liD");
liD.addEventListener("click", download);


function split_timeline_chapters() {
    const divLength = video.duration;
    const container = document.querySelector(".chapter-container");
    // Sort times and add the initial time (0 seconds)
    chptdata = [...chapters.map(item => item.start_time), divLength];
    // Create sections within the div
    chptdata.slice(0, -1).forEach((time, index) => {
        const nextTime = chptdata[index + 1];
        const startPercent = Math.min((time/divLength)*100,100)
        const section = document.createElement('div');
        section.classList.add("chapter");
        section.style.left = `${startPercent}%`;
        container.appendChild(section);
    });
}

video.addEventListener("click", (e) => {
    e.preventDefault();
    toggleMainState();
    document.body.style.cursor = 'auto';
    showCursor();    
});

let lastTouchTime = 0;
let touchTimeout;

video.addEventListener('touchend', (e) => {
    e.preventDefault();
    const now = Date.now();
    const touchInterval = now-lastTouchTime;
    const divRect = video.getBoundingClientRect();
    if (touchInterval < 250) {
        clearTimeout(touchTimeout);
        const touchX = event.changedTouches[0].clientX;
        const centerX = divRect.left+(divRect.width/2);
        const p = touchX < centerX;
        if (p) { video.currentTime -= 5; }
          else { video.currentTime += 5; }
    } else { touchTimeout=setTimeout(toggleMainState(false),250); } 
    lastTouchTime = now;
});