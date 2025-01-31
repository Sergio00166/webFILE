/* Code by Sergio00166 */

const duration = document.querySelector(".duration");
const currentTime = document.querySelector(".current-time");
const currentDuration = document.querySelector(".current-duration");
const hoverTime = document.querySelector(".hover-time");
const hoverDuration = document.querySelector(".hover-duration");
const sh_pause = document.querySelector(".sh_pause");
const sh_play = document.querySelector(".sh_play");
const totalDuration = document.querySelector(".total-duration");
const currentVol = document.querySelector(".current-vol");
const totalVol = document.querySelector(".max-vol");
const sh_mute = document.querySelector(".sh_mute");
const sh_fulla = document.querySelector(".sh_fulla");
const sh_lowa = document.querySelector(".sh_lowa");
const sh_meda = document.querySelector(".sh_meda");
const sh_noa = document.querySelector(".sh_noa");
const settingMenu = document.querySelector(".setting-menu");
const speedButtons = document.querySelectorAll(".setting-menu li");
const volume = document.querySelector(".volume");
const downloadLink = document.getElementById("download");
const prevLink = document.getElementById("prev");
const nextLink = document.getElementById("next");
const randomLink = document.getElementById("random");

var audio = document.querySelector("audio");
var mode = document.getElementById("mode");
var volumeVal = localStorage.getItem("audioVolume");
var currentMode = localStorage.getItem("audioMode");
var muted = localStorage.getItem("audioMuted");
var saved_speed = localStorage.getItem("audioSpeed");
var random = localStorage.getItem("audioRandom");


if (saved_speed != null) {
    audio.playbackRate = parseFloat(saved_speed);
    speedButtons.forEach(item => {
        if (item.getAttribute('data-value') === saved_speed) {
            item.classList.add('speed-active');
        } else {
            item.classList.remove('speed-active');
        }
    });
}
delete saved_speed;

if (currentMode != null) {
    currentMode = parseInt(currentMode);
    mode.innerHTML = ["1", "»", "&orarr;"][currentMode] || "1";
} else {
    currentMode = 0;
}

if (volumeVal === null) {
    volumeVal = 1;
}
audio.volume = parseFloat(volumeVal);
currentVol.style.width = volumeVal * 100 + "%";

// Cast value
if (muted != null) {
    if (muted == "true") {
        muted = true;
        audio.volume = 0;
    } else {
        muted = false;
    }
} else {
    muted = false;
}
// Cast value
if (random != null) {
    if (random == "true") {
        random = true;
    } else {
        random = false;
    }
} else {
    random = false;
}


let mouseDownProgress = false,
    mouseDownVol = false,
    isCursorOnControls = false,
    mouseOverDuration = false,
    touchClientX = 0,
    touchPastDurationWidth = 0,
    touchStartTime = 0;

canPlayInit();

function prev() {
    if (random) {
        window.history.go(-1);
    } else {
        prevLink.click();
    }
}

function next() {
    if (random) {
        window.history.forward();
        setTimeout(() => {
            randomLink.click();
        }, 250);
    } else {
        nextLink.click();
    }
}

function download() {
    downloadLink.click();
}
document.addEventListener("keydown", handleShorthand);
audio.addEventListener("play", play);
audio.addEventListener("pause", pause);


function setAudioTime() {
    if (!(isNaN(audio.duration) || audio.duration === 0)) {
        totalDuration.innerHTML = showDuration(audio.duration);
    } else {
        setTimeout(setAudioTime, 25);
    }
}

function canPlayInit() {
    handleAudioIcon();
    audio.play().catch((e)=>{});
    if (random) {
        mode.classList.add('lmbsl');
    }
    if (audio.paused) {
        pause();
    }
    setAudioTime();
}


function play() {
    audio.play();
    sh_pause.classList.remove("sh_pause");
    sh_play.classList.add("sh_play");
}

function pause() {
    audio.pause();
    sh_pause.classList.add("sh_pause");
    sh_play.classList.remove("sh_play");
    if (audio.ended) {
        currentTime.style.width = 100 + "%";
    }
}

function toggleMainState() {
    audio.paused ? play() : pause();
}

function handleSettingMenu() {
    settingMenu.classList.toggle("show-setting-menu");
}

function saveVolume() {
    localStorage.setItem("audioVolume", volumeVal);
}

audio.ontimeupdate = handleProgressBar;

function handleProgressBar() {
    currentTime.style.width = (audio.currentTime / audio.duration) * 100 + "%";
    currentDuration.innerHTML = showDuration(audio.currentTime);
    if ('mediaSession' in navigator) {
        navigator.mediaSession.setPositionState({
            position: audio.currentTime,
            playbackRate: audio.playbackRate,
            duration: audio.duration
        });
    }
}

function navigate(e) {
    try {
        const totalDurationRect = duration.getBoundingClientRect();
        const width = Math.min(
            Math.max(0, e.clientX - totalDurationRect.x),
            totalDurationRect.width
        );
        currentTime.style.width = (width / totalDurationRect.width) * 100 + "%";
        audio.currentTime = (width / totalDurationRect.width) * audio.duration;
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
        audio.currentTime = (value / durationRect.width) * audio.duration;
        currentDuration.innerHTML = showDuration(audio.currentTime);
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

// Event Listeners
duration.addEventListener("click", navigate);

duration.addEventListener("mousedown", (e) => {
    mouseDownProgress = true;
    navigate(e);
});


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
            const hovtime = (audio.duration * percent) / 100;
            hoverDuration.innerHTML = showDuration(hovtime);
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

duration.addEventListener("mousedown", (e) => {
    mouseDownProgress = true;
    navigate(e);
});

document.addEventListener("mouseup", () => {
    mouseDownProgress = false;
    mouseDownVol = false;
});

document.addEventListener("mousemove", handleMousemove);

duration.addEventListener("mouseenter", () => {
    mouseOverDuration = true;
});

duration.addEventListener("mouseleave", () => {
    mouseOverDuration = false;
    hoverTime.style.width = 0;
    hoverDuration.style.display = 'none';
});

duration.addEventListener("touchmove",handleTouchNavigate,{ passive: false });

let hideHoverTimeout;

function hideHoverDuration() {
    clearTimeout(hideHoverTimeout);
    hoverDuration.style.left = "-9999px";
    hoverDuration.style.width = "0px";
    hideHoverTimeout = setTimeout(function () {
        hoverDuration.style.left = "";
        hoverDuration.style.width = "";
        hoverTime.style.width = 0;
        hoverDuration.style.display = 'none';
        mouseOverDuration = false;
    }, 250);
}

function formatter(number) {
    return new Intl.NumberFormat({}, {
        minimumIntegerDigits: 2
    }).format(number);
}

function handleVolume(e) {
    const totalVolRect = totalVol.getBoundingClientRect();
    volumeVal = Math.min(Math.max(0, (e.clientX - totalVolRect.x) / totalVolRect.width), 1);
    currentVol.style.width = volumeVal * 100 + "%";
    saveVolume();
    audio.volume = volumeVal;
    handleAudioIcon();
}

volume.addEventListener("mouseenter", () => {
    muted ? totalVol.classList.remove("show") : totalVol.classList.add("show");
});

function toggleMuteUnmute() {
    totalVol.classList.remove("show");
    if (!muted) {
        audio.volume = 0;
        muted = true;
        handleAudioIcon();
    } else {
        audio.volume = volumeVal;
        muted = false;
        handleAudioIcon();
    }
    localStorage.setItem("audioMuted", muted);
}

totalVol.addEventListener("mousedown", (e) => {
    mouseDownVol = true;
    handleVolume(e);
});

volume.addEventListener("mouseleave", () => {
    totalVol.classList.remove("show");
});


function handlePlaybackRate(e) {
    audio.playbackRate = parseFloat(e.target.dataset.value);
    speedButtons.forEach((btn) => {
        btn.classList.remove("speed-active");
    });
    e.target.classList.add("speed-active");
    settingMenu.classList.remove("show-setting-menu");
    localStorage.setItem("audioSpeed", audio.playbackRate);
}

speedButtons.forEach((btn) => {
    btn.addEventListener("click", handlePlaybackRate);
});

var mber = undefined;
var mdbtnpress = false;
mode.addEventListener("mouseup", () => {
    clearTimeout(mber);
});
mode.addEventListener("touchend", () => {
    clearTimeout(mber);
});

function chMode() {
    const modes = ["1", "»", "&orarr;"];
    currentMode = (currentMode + 1) % 3;
    mode.innerHTML = modes[currentMode];
    localStorage.setItem("audioMode", currentMode);
}

function addrmMLcl() {
    mdbtnpress = true;
    if (mode.classList.contains('lmbsl')) {
        random = false;
        mode.classList.remove('lmbsl');
    } else {
        random = true;
        mode.classList.add('lmbsl');
    }
    localStorage.setItem("audioRandom", random);
}
mode.addEventListener("mousedown", (e) => {
    e.preventDefault();
    mber = setTimeout(addrmMLcl, 600);
});
mode.addEventListener("touchstart", (e) => {
    e.preventDefault();
    mber = setTimeout(addrmMLcl, 600);
},{ passive: false });

mode.addEventListener("click", (e) => {
    if (mdbtnpress) {
        e.preventDefault();
        mdbtnpress = false;
    } else {
        chMode();
    }
});
mode.addEventListener("touchend", (e) => {
    if (mdbtnpress) {
        e.preventDefault();
        mdbtnpress = false;
    } else {
        chMode();
    }
});


function handleAudioEnded() {
    if (currentMode === 1) {
        next();
    } else if (currentMode === 2) {
        audio.play();
    } else {
        pause();
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
    e.preventDefault();
    if (e.code === 'F5') {
        location.reload(true);
        return;
    }
    if (e.code === 'F11') {
        document.documentElement.requestFullscreen();
        return;
    }
    if (e.key.match(/[0-9]/gi)) {
        audio.currentTime = (audio.duration / 100) * (parseInt(e.key) * 10);
        currentTime.style.width = parseInt(e.key) * 10 + "%";
        return;
    }
    switch (e.key.toLowerCase()) {
    case " ":
        audio.paused ? play() : pause();
        break;
    case "arrowright":
        audio.currentTime += 2;
        break;
    case "arrowleft":
        audio.currentTime -= 2;
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
    case "s":
        addrmMLcl();
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
            audio.volume = volumeVal;
            currentVol.style.width = volumeVal * 100 + "%";
            handleAudioIcon();
            saveVolume();
        }
        break;
    case "-":
        if (volumeVal > 0 && !muted) {
            volumeVal = parseFloat(volumeVal - 0.05);
            if (volumeVal < 0) {
                volumeVal = 0;
            }
            handleAudioIcon();
            audio.volume = volumeVal;
            currentVol.style.width = volumeVal * 100 + "%";
            saveVolume();
        }
        break;
    default:
        break;
    }
}

if ('mediaSession' in navigator) {
    navigator.mediaSession.setActionHandler('previoustrack', prev);
    navigator.mediaSession.setActionHandler('nexttrack', next);
}
