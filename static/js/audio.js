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
const sh_unmute = document.querySelector(".sh_unmute");
const muteUnmute = document.querySelector(".muteUnmute");
const settingMenu = document.querySelector(".setting-menu");
const speedButtons = document.querySelectorAll(".setting-menu li");
var audio = document.getElementById("audio");
var mode = document.getElementById("mode");
var volumeVal = localStorage.getItem("audioVolume");
var currentMode = localStorage.getItem("audioMode");

if (currentMode != null) {
    currentMode=parseInt(currentMode);
    if (currentMode === 0) { mode.innerHTML = "1"; }
    else if (currentMode === 1) { mode.innerHTML = "»"; }
    else if (currentMode === 2) { mode.innerHTML = "↻"; }
 } else { currentMode = 0; }

if (volumeVal !== null) { volumeVal = parseFloat(volumeVal); }
else { volumeVal = 1; }

audio.volume = volumeVal;
currentVol.style.width = volumeVal * 100 +"%";

handleViewportChange();

// Beacuse some devices can not load it properly
setTimeout(function(){ totalDuration.innerHTML = showDuration(audio.duration);}, 250);
setTimeout(function(){ totalDuration.innerHTML = showDuration(audio.duration);}, 400);
setTimeout(function(){ if (isNaN(audio.duration) || audio.duration === 0) {totalDuration.innerHTML = "00:00";}}, 500);


function isMobileDevice() { return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent); }

function handleViewportChange() {
    // set the volume to 100 if the device is mobile
    if ( isMobileDevice() ) { volumeVal = 1; }
    audio.volume = volumeVal;
    currentVol.style.width = volumeVal*100+"%";
}

sh_unmute.classList.remove("sh_unmute");
sh_pause.classList.remove("sh_pause");

let mouseDownProgress = false,
  isPlaying = false,
  mouseDownVol = false,
  isCursorOnControls = false,
  muted = false,
  timeout,
  mouseOverDuration = false,
  touchClientX = 0,
  touchPastDurationWidth = 0,
  touchStartTime = 0;
  
hoverDuration.style.display = "none";

audio.addEventListener("play", play);
audio.addEventListener("pause", pause);

function canPlayInit() {
  muted = audio.muted;
  if (audio.paused) {
    sh_play.classList.remove("sh_play");
    isPlaying = false;
  } else {
    isPlaying = true;
    sh_pause.classList.remove("sh_pause");
  }
}

function play() {
  audio.play();
  isPlaying = true;
  sh_pause.classList.remove("sh_pause");
  sh_play.classList.add("sh_play");
}

function pause() {
  audio.pause();
  isPlaying = false;
  sh_pause.classList.add("sh_pause");
  sh_play.classList.remove("sh_play");
  if (audio.ended) {
    currentTime.style.width = 100 + "%";
  }
}

duration.addEventListener("touchmove", handleTouchNavigate);
audio.ontimeupdate = handleProgressBar;

function handleProgressBar() {
  currentTime.style.width = (audio.currentTime / audio.duration) * 100 + "%";
  currentDuration.innerHTML = showDuration(audio.currentTime);
}

function toggleMainState() {
    if (!isPlaying) {
      play();
    } else {
      pause();
  }
}

function navigate(e) {
  const totalDurationRect = duration.getBoundingClientRect();
  const width = Math.min(
    Math.max(0, e.clientX - totalDurationRect.x),
    totalDurationRect.width
  );
  currentTime.style.width = (width / totalDurationRect.width) * 100 + "%";
  audio.currentTime = (width / totalDurationRect.width) * audio.duration;
}

function handleTouchNavigate(e) {
  hoverTime.style.width = "0px";
  if (e.timeStamp - touchStartTime > 500) {
    const durationRect = duration.getBoundingClientRect();
    const clientX = e.changedTouches[0].clientX;
    const offsetX = clientX - durationRect.left; // Calcula la posición relativa dentro del elemento "duration"
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

function handleMousemove(e) {
  if (mouseDownProgress) {
    e.preventDefault();
    navigate(e);
  }
  if (mouseDownVol) {
    handleVolume(e);
  }
  if (mouseOverDuration) {
	  const rect = duration.getBoundingClientRect();
      const width = Math.min(Math.max(0, e.clientX - rect.x), rect.width);
      const percent = (width / rect.width) * 100;
	  hoverTime.style.width = width + "px";
      hoverDuration.innerHTML = showDuration((audio.duration / 100) * percent);
	if (!isMobileDevice()) {
      hoverDuration.style.display = "block";
	} else { hoverDuration.style.display = "none"; }
  }
}

duration.addEventListener("mousedown", (e) => {
  mouseDownProgress = true;
  navigate(e);
});

document.addEventListener("mouseup", (e) => {
  mouseDownProgress = false;
  mouseDownVol = false;
});

document.addEventListener("mousemove", handleMousemove);

duration.addEventListener("mouseenter", (e) => {
  mouseOverDuration = true;
});

duration.addEventListener("mouseleave", (e) => {
  mouseOverDuration = false;
  hoverTime.style.width = 0;
  hoverDuration.innerHTML = "";
});

function formatter(number) {
  return new Intl.NumberFormat({}, { minimumIntegerDigits: 2 }).format(number);
}

function handleVolume(e) {
  const totalVolRect = totalVol.getBoundingClientRect();
  volumeVal = Math.min(Math.max(0, (e.clientX - totalVolRect.x) / totalVolRect.width),1);
  currentVol.style.width = volumeVal * 100 +"%";
  saveVolume()
  audio.volume = volumeVal;
  sh_mute.classList.add("sh_mute");
  sh_unmute.classList.remove("sh_unmute");
  if (volumeVal==0) {
     sh_mute.classList.remove("sh_mute");
     sh_unmute.classList.add("sh_unmute");
  }
  else {
     sh_mute.classList.add("sh_mute");
     sh_unmute.classList.remove("sh_unmute");
  }

}

muteUnmute.addEventListener("mouseenter", (e) => {
  if (!muted) {
    totalVol.classList.add("show");
  } else {
    totalVol.classList.remove("show");
  }
});

function toggleMuteUnmute() {
  totalVol.classList.remove("show");
  if (!muted) {
    audio.volume = 0;
    muted = true;
    sh_mute.classList.remove("sh_mute");
    sh_unmute.classList.add("sh_unmute");
  } else {
    audio.volume = volumeVal;
    muted = false;
    sh_mute.classList.add("sh_mute");
    sh_unmute.classList.remove("sh_unmute");
  }
}

totalVol.addEventListener("mousedown", (e) => {
  mouseDownVol = true;
  handleVolume(e);
});

muteUnmute.addEventListener("mouseleave", (e) => {
    totalVol.classList.remove("show");
});

function handleSettingMenu() {
  settingMenu.classList.toggle("show-setting-menu");
}

function handlePlaybackRate(e) {
  audio.playbackRate = parseFloat(e.target.dataset.value);
  speedButtons.forEach((btn) => {
    btn.classList.remove("speed-active");
  });
  e.target.classList.add("speed-active");
  settingMenu.classList.remove("show-setting-menu");
}

function handlePlaybackRateKey(type = "") {
  if (type === "increase" && video.playbackRate < 2) {
    audio.playbackRate += 0.25;
  } else if (audio.playbackRate > 0.25 && type !== "increase") {
    audio.playbackRate -= 0.25;
  }
  speedButtons.forEach((btn) => {
    btn.classList.remove("speed-active");
    if (btn.dataset.value == video.playbackRate) {
      btn.classList.add("speed-active");
    }
  });
}
speedButtons.forEach((btn) => {
  btn.addEventListener("click", handlePlaybackRate);
});

function next() {
    localStorage.setItem("audioMode", currentMode);
    localStorage.setItem("audioVolume", audio.volume.toString());
    window.location.href = nextUrl; }

function prev() {
    localStorage.setItem("audioMode", currentMode);
    localStorage.setItem("audioVolume", audio.volume.toString());
    window.location.href = prevUrl; }

function chMode() {
    if (currentMode === 0) { currentMode=1; mode.textContent = "»"; }
    else if (currentMode === 1) { currentMode=2; mode.textContent = "↻"; }
    else if (currentMode === 2) { currentMode=0; mode.textContent = "1"; }
    localStorage.setItem("audioMode", currentMode); }

function handleAudioEnded() {
    if (currentMode === 1) {
        localStorage.setItem("audioMode", currentMode);
        localStorage.setItem("audioVolume", audio.volume.toString());
        window.location.href = nextUrl; }
    else if (currentMode === 2) { audio.currentTime = 0; audio.play(); }
    else { pause(); }}
function saveVolume() { localStorage.setItem("audioVolume", audio.volume.toString()); }

function download() {
    const downloadLink = document.createElement('a');
    downloadLink.style.display = 'none';
    downloadLink.href = urlaudio;
    downloadLink.download = fileName;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}