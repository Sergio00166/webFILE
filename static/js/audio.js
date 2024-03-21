// JS for the custom audio player
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

var audio = document.getElementById("audio");
var mode = document.getElementById("mode");
var volumeVal = localStorage.getItem("audioVolume");
var currentMode = localStorage.getItem("audioMode");

document.addEventListener("keydown", handleShorthand);

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
  
canPlayInit()
 
audio.addEventListener("play", play);
audio.addEventListener("pause", pause);

function canPlayInit() {
  muted = audio.muted;
  handleAudioIcon();
  if (audio.paused) {
    sh_play.classList.remove("sh_play");
    isPlaying = false;
  } else {
    isPlaying = true;
    sh_pause.classList.remove("sh_pause");
  }
  function setAudioTime() {
    if (!(isNaN(audio.duration) || audio.duration === 0)) {
      totalDuration.innerHTML = showDuration(audio.duration); 
    } else { setTimeout(setAudioTime, 25); }
  } setAudioTime()
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
      hoverDuration.innerHTML = showDuration((audio.duration / 100) * percent);
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
  hoverDuration.style.display = 'none';
});

// Magic trick to hide the time when using touchscreen
duration.addEventListener("touchend", () => {
   const oldleft = hoverDuration.style.left;
   const oldwidth = hoverDuration.style.width;
   hoverDuration.style.left = "-9999px";
   hoverDuration.style.width = "0px";
   setTimeout(function() {
	  hoverDuration.style.left = oldleft;
      hoverDuration.style.width = oldwidth;
      hoverTime.style.width = 0;
      hoverDuration.style.display = 'none';
      mouseOverDuration = false;
    }, 250);
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
  handleAudioIcon();
}

volume.addEventListener("mouseenter", (e) => {
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
    handleAudioIcon();
  } else {
    audio.volume = volumeVal;
    muted = false;
    handleAudioIcon();
  }
}

totalVol.addEventListener("mousedown", (e) => {
  mouseDownVol = true;
  handleVolume(e);
});

volume.addEventListener("mouseleave", (e) => {
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
  if (type === "increase" && audio.playbackRate < 2) {
    audio.playbackRate += 0.25;
  } else if (audio.playbackRate > 0.25 && type !== "increase") {
    audio.playbackRate -= 0.25;
  }
  speedButtons.forEach((btn) => {
    btn.classList.remove("speed-active");
    if (btn.dataset.value == audio.playbackRate) {
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
        window.location.href = nextUrl; 
    } else if (currentMode === 2) { audio.play(); }
    else { pause(); }
}

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
    audio.currentTime = (audio.duration / 100) * (parseInt(e.key) * 10);
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
    case "arrowright":
      audio.currentTime += 2;
      handleProgressBar();
      break;
    case "arrowleft":
      audio.currentTime -= 2;
      handleProgressBar();
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
      toggleMuteUnmute();
      break;
    case "+":
     if (volumeVal < 1 && !muted) {
        volumeVal=volumeVal+0.05;
        if (volumeVal > 1)
        { volumeVal=1; }
        audio.volume = volumeVal;
        currentVol.style.width = volumeVal * 100 +"%";
        handleAudioIcon();
		saveVolume();
     } break;
    case "-":
     if (volumeVal != 0 && !muted) {
        volumeVal=volumeVal-0.05;
        if (volumeVal < 0)
        { volumeVal=0; }
        handleAudioIcon();
        audio.volume = volumeVal;
        currentVol.style.width = volumeVal * 100 +"%";
		saveVolume();
     } break;
    default:
      break;
  }
}

