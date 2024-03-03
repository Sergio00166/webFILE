const video = document.querySelector("video");
const fullscreen = document.querySelector(".fullscreen-btn");
const playPause = document.querySelector(".play-pause");
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
const muteUnmute = document.querySelector(".mute-unmute");
const forward = document.querySelector(".forward");
const backward = document.querySelector(".backward");
const hoverTime = document.querySelector(".hover-time");
const hoverDuration = document.querySelector(".hover-duration");
const settingsBtn = document.querySelector(".setting-btn");
const settingMenu = document.querySelector(".setting-menu");
const downloadBtn = document.querySelector(".download-btn");
const speedButtons = document.querySelectorAll(".setting-menu li");
const loader = document.querySelector(".custom-loader");
const modeBtn = document.querySelector(".mode-btn");

var modeTxtBtn = document.getElementById("mdbttn");
var currentMode = localStorage.getItem("videoMode");

totalVol.classList.add("show")

modeBtn.addEventListener("click", changeMode);

if (currentMode != null) { 
	currentMode=parseInt(currentMode);
	if (currentMode === 0) { modeTxtBtn.innerHTML = "1"; } 
	else if (currentMode === 1) { modeTxtBtn.innerHTML = "»"; } 
	else if (currentMode === 2) { modeTxtBtn.innerHTML = "↻"; } 
 } else { currentMode = 0; }

var volumeVal = localStorage.getItem("videoVolume");

if (volumeVal !== null) { volumeVal = parseFloat(volumeVal); }
else { volumeVal = 1; }

function changeMode() {
    if (currentMode === 2) { currentMode = 0 ; modeTxtBtn.innerHTML = "1";  }
    else if (currentMode === 0) { currentMode = 1 ; modeTxtBtn.innerHTML = "»";  }
    else if (currentMode === 1) { currentMode = 2 ; modeTxtBtn.innerHTML = "↻";  }
    localStorage.setItem("videoMode", currentMode);
} 
function saveVolume() { localStorage.setItem("videoVolume", volumeVal.toString()); }

function handleForward() { 
    localStorage.setItem("videoMode", currentMode);
    localStorage.setItem("videoVolume", video.volume.toString());
	window.location.href = next; 
}
function handleBackward() { 
    localStorage.setItem("videoMode", currentMode);
    localStorage.setItem("videoVolume", video.volume.toString());
	window.location.href =  prev;
}
function handleVideoEnded() {
    if (currentMode === 1) {
        localStorage.setItem("videoMode", currentMode);
        localStorage.setItem("videoVolume", volumeVal.toString());
        window.location.href = next; }
    else if (currentMode === 2) { play(); } 
}
function download() {
    const downloadLink = document.createElement('a');
    downloadLink.style.display = 'none';
    downloadLink.href = urlVideo;
    downloadLink.download = fileName;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}


video.play();
let isPlaying = true,
  mouseDownProgress = false,
  mouseDownVol = false,
  isCursorOnControls = false,
  muted = false,
  timeout,
  mouseOverDuration = false,
  touchClientX = 0,
  touchPastDurationWidth = 0,
  touchStartTime = 0;

currentVol.style.width = volumeVal * 100 + "%";

// Video Event Listeners
video.addEventListener("loadedmetadata", canPlayInit);
video.addEventListener("play", play);
video.addEventListener("pause", pause);
video.addEventListener("progress", handleProgress);
video.addEventListener("waiting", handleWaiting);
video.addEventListener("playing", handlePlaying);

document.addEventListener("keydown", handleShorthand);
fullscreen.addEventListener("click", toggleFullscreen);

playPause.addEventListener("click", (e) => {
  if (!isPlaying) {
    play();
  } else {
    pause();
  }
});

duration.addEventListener("click", navigate);

duration.addEventListener("mousedown", (e) => {
  mouseDownProgress = true;
  navigate(e);
});

totalVol.addEventListener("mousedown", (e) => {
  mouseDownVol = true;
  handleVolume(e);
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

videoContainer.addEventListener("fullscreenchange", () => {
  videoContainer.classList.toggle("fullscreen", document.fullscreenElement);
});
videoContainer.addEventListener("mouseleave", hideControls);
videoContainer.addEventListener("mousemove", (e) => {
  controls.classList.add("show-controls");
  hideControls();
});
videoContainer.addEventListener("touchstart", (e) => {
  controls.classList.add("show-controls");
  touchClientX = e.changedTouches[0].clientX;
  const currentTimeRect = currentTime.getBoundingClientRect();
  touchPastDurationWidth = currentTimeRect.width;
  touchStartTime = e.timeStamp;
});
videoContainer.addEventListener("touchend", () => {
  hideControls();
  touchClientX = 0;
  touchPastDurationWidth = 0;
  touchStartTime = 0;
});
videoContainer.addEventListener("touchmove", handleTouchNavigate);

controls.addEventListener("mouseenter", (e) => {
  controls.classList.add("show-controls");
  isCursorOnControls = true;
});

controls.addEventListener("mouseleave", (e) => {
  isCursorOnControls = false;
});

mainState.addEventListener("click", toggleMainState);
mainState.addEventListener("animationend", handleMainSateAnimationEnd);

video.addEventListener("click", toggleMainState);
video.addEventListener("animationend", handleMainSateAnimationEnd);

muteUnmute.addEventListener("click", toggleMuteUnmute);


forward.addEventListener("click", handleForward);

backward.addEventListener("click", handleBackward);

downloadBtn.addEventListener("click", download);

settingsBtn.addEventListener("click", handleSettingMenu);

speedButtons.forEach((btn) => {
  btn.addEventListener("click", handlePlaybackRate);
});

function canPlayInit() {
  totalDuration.innerHTML = showDuration(video.duration);
  video.volume = volumeVal;
  muted = video.muted;
  if (video.paused) {
    controls.classList.add("show-controls");
    mainState.classList.add("show-state");
  }
}

function play() {
  video.play();
  isPlaying = true;
  playPause.innerHTML = `<img src="`+pause_ico+`"></img>`;
  mainState.classList.remove("show-state");
}

video.ontimeupdate = handleProgressBar;

function handleProgressBar() {
  currentTime.style.width = (video.currentTime / video.duration) * 100 + "%";
  currentDuration.innerHTML = showDuration(video.currentTime);
}

function pause() {
  video.pause();
  isPlaying = false;
  playPause.innerHTML = `<img src="`+play_ico+`"></img>`;
  controls.classList.add("show-controls");
  mainState.classList.add("show-state");
  mainState.innerHTML = `<img class="fullimg"; src="`+play_ico+`"></img>`;
  if (video.ended) {
    currentTime.style.width = 100 + "%";
  }
}

function handleWaiting() {
  loader.style.display = "unset";
}

function handlePlaying() {
  loader.style.display = "none";
}

function navigate(e) {
  const totalDurationRect = duration.getBoundingClientRect();
  const width = Math.min(
    Math.max(0, e.clientX - totalDurationRect.x),
    totalDurationRect.width
  );
  currentTime.style.width = (width / totalDurationRect.width) * 100 + "%";
  video.currentTime = (width / totalDurationRect.width) * video.duration;
}

function handleTouchNavigate(e) {
  hideControls();
  if (e.timeStamp - touchStartTime > 500) {
    const durationRect = duration.getBoundingClientRect();
    const clientX = e.changedTouches[0].clientX;
    const value = Math.min(
      Math.max(0, touchPastDurationWidth + (clientX - touchClientX) * 1.5),
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
  return new Intl.NumberFormat({}, { minimumIntegerDigits: 2 }).format(number);
}

function toggleMuteUnmute() {
  if (!muted) {
    video.volume = 0;
    muted = true;
    muteUnmute.innerHTML = `<img src="`+mute_ico+`"></img>`;
    handleMainStateIcon(`<img class="fullimg"; src="`+mute_ico+`"></img>`);
  } else {
    video.volume = volumeVal;
    muted = false;
    handleMainStateIcon(`<img class="fullimg"; src="`+unmute_ico+`"></img>`);
    muteUnmute.innerHTML = `<img src="`+unmute_ico+`"></img>`;
  }
}

function hideControls() {
  if (timeout) {
    clearTimeout(timeout);
  }
  timeout = setTimeout(() => {
    if (isPlaying && !isCursorOnControls) {
      controls.classList.remove("show-controls");
      settingMenu.classList.remove("show-setting-menu");
    }
  }, 1000);
}

function toggleMainState() {
    if (!isPlaying) {
      play();
    } else {
      pause();
  }
}

function handleVolume(e) {
  const totalVolRect = totalVol.getBoundingClientRect();
  currentVol.style.width =
    Math.min(Math.max(0, e.clientX - totalVolRect.x), totalVolRect.width) +
    "px";
  volumeVal = Math.min(
    Math.max(0, (e.clientX - totalVolRect.x) / totalVolRect.width),
    1
  );
  saveVolume()
  video.volume = volumeVal;
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
    var width = (currentBufferLength/video.duration)*100;
    buffer.style.width = width+"%";

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
    hoverDuration.innerHTML = showDuration((video.duration / 100) * percent);
  }
}

function handleMainStateIcon(icon) {
  mainState.classList.add("animate-state");
  mainState.innerHTML = icon;
}

function handleMainSateAnimationEnd() {
  mainState.classList.remove("animate-state");
  if (!isPlaying) {
    mainState.innerHTML = `<img class="fullimg"; src="`+play_ico+`"></img>`;
  }
}

function handleSettingMenu() {
  settingMenu.classList.toggle("show-setting-menu");
}

function handlePlaybackRate(e) {
  video.playbackRate = parseFloat(e.target.dataset.value);
  speedButtons.forEach((btn) => {
    btn.classList.remove("speed-active");
  });
  e.target.classList.add("speed-active");
  settingMenu.classList.remove("show-setting-menu");
}

function handlePlaybackRateKey(type = "") {
  if (type === "increase" && video.playbackRate < 2) {
    video.playbackRate += 0.25;
  } else if (video.playbackRate > 0.25 && type !== "increase") {
    video.playbackRate -= 0.25;
  }
  handleMainStateIcon(
    `<span style="font-size: 1.4rem">${video.playbackRate}x</span>`
  );
  speedButtons.forEach((btn) => {
    btn.classList.remove("speed-active");
    if (btn.dataset.value == video.playbackRate) {
      btn.classList.add("speed-active");
    }
  });
}

function handleShorthand(e) {
  const tagName = document.activeElement.tagName.toLowerCase();
  if (tagName === "input") return;
  if (e.key.match(/[0-9]/gi)) {
    video.currentTime = (video.duration / 100) * (parseInt(e.key) * 10);
    currentTime.style.width = parseInt(e.key) * 10 + "%";
  }
  switch (e.key.toLowerCase()) {
    case " ":
      if (tagName === "button") return;
      if (isPlaying) {
        pause();
      } else {
        play();
      }
      break;
    case "f":
      toggleFullscreen();
      break;
	  
    case "arrowright":
      video.currentTime += 5;
      handleProgressBar();
	  break;
    case "arrowleft":
      video.currentTime -= 5;
      handleProgressBar();
	  break;	  
	case "arrowup":
      handleForward();
      break;
    case "arrowdown":
      handleBackward();
      break;
    case "i":
      changeMode();
      break;
    case "m":
      toggleMuteUnmute();
      break;
    case "+":
	 if (volumeVal < 1) {
		volumeVal=volumeVal+0.05;
		if (volumeVal > 1)
		{ volumeVal=1; }
	    video.volume = volumeVal;
	    currentVol.style.width = volumeVal * 100 +"%";
	 } break;
    case "-":
	 if (volumeVal != 0) {
		volumeVal=volumeVal-0.05;
		if (volumeVal < 0)
		{ volumeVal=0; }
	    video.volume = volumeVal;
	    currentVol.style.width = volumeVal * 100 +"%";
	 } break;
    default:
      break;
  }
}
