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
const sh_fulla = document.querySelector(".sh_fulla");
const sh_lowa = document.querySelector(".sh_lowa");
const sh_meda = document.querySelector(".sh_meda");
const sh_noa = document.querySelector(".sh_noa");
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
const sh_mute = document.querySelector(".sh_mute");
const sh_unmute = document.querySelector(".sh_unmute");
const sh_pause = document.querySelector(".sh_pause");
const sh_play = document.querySelector(".sh_play");
const sh_play_st = document.querySelector(".sh_play_st");
const sh_mute_st = document.querySelector(".sh_mute_st");
const sh_unmute_st = document.querySelector(".sh_unmute_st");

var modeTxtBtn = document.getElementById("mdbttn");
var currentMode = localStorage.getItem("videoMode");

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
video.volume = volumeVal;
currentVol.style.width = volumeVal*100+"%";

totalDuration.innerHTML = "00:00";

let mouseDownProgress = false,
  mouseDownVol = false,
  isCursorOnControls = false,
  muted = false,
  timeout,
  mouseOverDuration = false,
  touchClientX = 0,
  touchPastDurationWidth = 0,
  touchStartTime = 0;

canPlayInit();

function changeMode() {
    if (currentMode === 2) { currentMode = 0 ; modeTxtBtn.innerHTML = "1";  }
    else if (currentMode === 0) { currentMode = 1 ; modeTxtBtn.innerHTML = "»";  }
    else if (currentMode === 1) { currentMode = 2 ; modeTxtBtn.innerHTML = "↻";  }
    localStorage.setItem("videoMode", currentMode);
}
function saveVolume() { localStorage.setItem("videoVolume", volumeVal.toString()); }


function canPlayInit() {
  muted = video.muted;
  video.play();
  handleAudioIcon();
  if (video.paused) {
    controls.classList.add("show-controls");
    sh_play_st.classList.remove("sh_play_st");
    sh_play.classList.remove("sh_play");
    isPlaying = false;
  } else {
    isPlaying = true;
    sh_pause.classList.remove("sh_pause");
  }
  function setVideoTime() {
    if (!(isNaN(video.duration) || video.duration === 0)) {
      totalDuration.innerHTML = showDuration(video.duration); 
    } else { setTimeout(setVideoTime, 500); }
  } setVideoTime()
}

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

// Video Event Listeners
video.addEventListener("play", play);
video.addEventListener("pause", pause);
// Disable the video buffered representation due to weird bugs
//video.addEventListener("progress", handleProgress);
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
  hoverDuration.style.display = 'none';
});

duration.addEventListener("touchend", () => {
   hoverTime.style.width = 0;
   hoverDuration.style.display = 'none';
   mouseOverDuration = false;
   setTimeout(function() {
	  hoverTime.style.width = 0;
      hoverDuration.style.display = 'none';
      mouseOverDuration = false;
    }, 2);
});

videoContainer.addEventListener("mousemove", (e) => {
  controls.classList.add("show-controls");
  hideControls();
});

duration.addEventListener("touchmove", handleTouchNavigate);

videoContainer.addEventListener("fullscreenchange", () => {
  videoContainer.classList.toggle("fullscreen", document.fullscreenElement);
});

mainState.addEventListener("click", toggleMainState);
mainState.addEventListener("animationend", handleMainSateAnimationEnd);

video.addEventListener("click", toggleMainState);

video.addEventListener("animationend", handleMainSateAnimationEnd);

muteUnmute.addEventListener("click", toggleMuteUnmute);

muteUnmute.addEventListener("mouseenter", (e) => {
  if (!muted) {
    totalVol.classList.add("show");
  } else {
    totalVol.classList.remove("show");
  }
});

volume.addEventListener("mouseleave", (e) => {
    totalVol.classList.remove("show");
});

totalVol.addEventListener("mousedown", (e) => {
  mouseDownVol = true;
  handleVolume(e);
});

forward.addEventListener("click", handleForward);

backward.addEventListener("click", handleBackward);

downloadBtn.addEventListener("click", download);

settingsBtn.addEventListener("click", handleSettingMenu);

speedButtons.forEach((btn) => {
  btn.addEventListener("click", handlePlaybackRate);
});

function play() {
  video.play();
  isPlaying = true;
  sh_pause.classList.remove("sh_pause");
  sh_play.classList.add("sh_play");
  mainState.classList.remove("show-state");
  sh_mute_st.classList.add("sh_mute_st");
  sh_unmute_st.classList.add("sh_unmute_st");
}

video.ontimeupdate = handleProgressBar;

function handleProgressBar() {
  currentTime.style.width = (video.currentTime / video.duration) * 100 + "%";
  currentDuration.innerHTML = showDuration(video.currentTime);
}

function pause() {
  video.pause();
  isPlaying = false;
  controls.classList.add("show-controls");
  mainState.classList.add("show-state");
  sh_play_st.classList.remove("sh_play_st");
  sh_mute_st.classList.add("sh_mute_st");
  sh_unmute_st.classList.add("sh_unmute_st");
  handleAudioIcon();
  sh_pause.classList.add("sh_pause");
  sh_play.classList.remove("sh_play");
  if (video.ended) {
    currentTime.style.width = 100 + "%";
  }
}

function handleWaiting() { loader.classList.add("show-state"); }

function handlePlaying() { loader.classList.remove("show-state"); }

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
  return new Intl.NumberFormat({}, { minimumIntegerDigits: 2 }).format(number);
}

function toggleMuteUnmute() {
  totalVol.classList.remove("show");
  if (!muted) {
    video.volume = 0;
    muted = true;
    mainState.classList.add("animate-state");
    sh_play_st.classList.add("sh_play_st");
    sh_mute_st.classList.remove("sh_mute_st");
    sh_unmute_st.classList.add("sh_unmute_st");
    handleAudioIcon();
  } else {
    video.volume = volumeVal;
    muted = false;
    mainState.classList.add("animate-state");
    sh_play_st.classList.add("sh_play_st");
    sh_mute_st.classList.add("sh_mute_st");
    sh_unmute_st.classList.remove("sh_unmute_st");
    handleAudioIcon();
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
  volumeVal = Math.min(Math.max(0, (e.clientX - totalVolRect.x) / totalVolRect.width),1);
  currentVol.style.width = volumeVal * 100 +"%";
  saveVolume()
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
	hoverTime.style.width = 0;
	hoverDuration.style.display = 'none';
    e.preventDefault();
    navigate(e);
  } else if (mouseDownVol) {
    handleVolume(e);
  } else if (mouseOverDuration) {
	  hoverDuration.style.display = 'block';
	  const rect = duration.getBoundingClientRect();
      const width = Math.min(Math.max(0, e.clientX - rect.x), rect.width);
      const percent = (width / rect.width) * 100;
	  hoverTime.style.width = width + "px";
      hoverDuration.innerHTML = showDuration((video.duration / 100) * percent);
  } if (!isPlaying) { pause(); } else { play(); }
}

function handleMainSateAnimationEnd() {
  mainState.classList.remove("animate-state");
  if (!isPlaying) {
    sh_play_st.classList.remove("sh_play_st");
    sh_mute_st.classList.add("sh_mute_st");
    sh_unmute_st.classList.add("sh_unmute_st");
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
  speedButtons.forEach((btn) => {
    btn.classList.remove("speed-active");
    if (btn.dataset.value == video.playbackRate) {
      btn.classList.add("speed-active");
    }
  });
}

function handleAudioIcon(){
	if (!muted) {
		if (volumeVal==0.0){
		   sh_mute.classList.add("sh_mute");
		   sh_fulla.classList.add("sh_fulla");
		   sh_meda.classList.add("sh_meda");
		   sh_lowa.classList.add("sh_lowa");
		   sh_noa.classList.remove("sh_noa");
		} else if (volumeVal>0.67){
		   sh_mute.classList.add("sh_mute");
		   sh_fulla.classList.remove("sh_fulla");
		   sh_meda.classList.add("sh_meda");
		   sh_lowa.classList.add("sh_lowa");
		   sh_noa.classList.add("sh_noa");
		} else if (volumeVal>0.33){
		   sh_mute.classList.add("sh_mute");
		   sh_fulla.classList.add("sh_fulla");
		   sh_meda.classList.remove("sh_meda");
		   sh_lowa.classList.add("sh_lowa");
		   sh_noa.classList.add("sh_noa");
		} else if (volumeVal>0){
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
    case "r":
      changeMode();
      break;
    case "s":
      toggleMuteUnmute();
      break;
    case "+":
     if (volumeVal < 1) {
        volumeVal=volumeVal+0.05;
        if (volumeVal > 1)
        { volumeVal=1; }
        video.volume = volumeVal;
		handleAudioIcon();
        currentVol.style.width = volumeVal * 100 +"%";
     } break;
    case "-":
     if (volumeVal != 0) {
        volumeVal=volumeVal-0.05;
        if (volumeVal < 0)
        { volumeVal=0; }
        video.volume = volumeVal;
		handleAudioIcon();
        currentVol.style.width = volumeVal * 100 +"%";
     } break;
    default:
      break;
  }
}

