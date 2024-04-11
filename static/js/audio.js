const elements = {
  duration: ".duration",
  currentTime: ".current-time",
  currentDuration: ".current-duration",
  hoverTime: ".hover-time",
  hoverDuration: ".hover-duration",
  sh_pause: ".sh_pause",
  sh_play: ".sh_play",
  totalDuration: ".total-duration",
  currentVol: ".current-vol",
  totalVol: ".max-vol",
  sh_mute: ".sh_mute",
  sh_fulla: ".sh_fulla",
  sh_lowa: ".sh_lowa",
  sh_meda: ".sh_meda",
  sh_noa: ".sh_noa",
  settingMenu: ".setting-menu",
  speedButtons: ".setting-menu li",
  volume: ".volume",
};

const audio = document.getElementById("audio");
const mode = document.getElementById("mode");
let volumeVal = parseFloat(localStorage.getItem("audioVolume")) || 1;
let currentMode = parseInt(localStorage.getItem("audioMode")) || 0;
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

document.addEventListener("keydown", handleShorthand);

initialize();

function initialize() {
  setupMode();
  setupVolume();
  setupListeners();
  canPlayInit();
}

function setupMode() {
  if (currentMode === 0) mode.innerHTML = "1";
  else if (currentMode === 1) mode.innerHTML = "»";
  else if (currentMode === 2) mode.innerHTML = "↻";
}

function setupVolume() {
  audio.volume = volumeVal;
  document.querySelector(elements.currentVol).style.width = volumeVal * 100 + "%";
}

function setupListeners() {
  audio.addEventListener("play", play);
  audio.addEventListener("pause", pause);
  audio.addEventListener("timeupdate", handleProgressBar);
  document.querySelector(elements.duration).addEventListener("click", navigate);
  document.querySelector(elements.duration).addEventListener("mousedown", handleMouseDown);
  document.addEventListener("mouseup", handleMouseUp);
  document.addEventListener("mousemove", handleMouseMove);
  document.querySelector(elements.duration).addEventListener("mouseenter", handleMouseEnter);
  document.querySelector(elements.duration).addEventListener("mouseleave", handleMouseLeave);
  document.querySelector(elements.volume).addEventListener("mouseenter", handleVolumeMouseEnter);
  document.querySelector(elements.totalVol).addEventListener("mousedown", handleVolumeMouseDown);
  document.querySelector(elements.volume).addEventListener("mouseleave", handleVolumeMouseLeave);
  document.querySelectorAll(elements.speedButtons).forEach(btn => {
    btn.addEventListener("click", handlePlaybackRate);
  });
}

function play() {
  audio.play();
  isPlaying = true;
  document.querySelector(elements.sh_pause).classList.remove("sh_pause");
  document.querySelector(elements.sh_play).classList.add("sh_play");
}

function pause() {
  audio.pause();
  isPlaying = false;
  document.querySelector(elements.sh_pause).classList.add("sh_pause");
  document.querySelector(elements.sh_play).classList.remove("sh_play");
  if (audio.ended) {
    document.querySelector(elements.currentTime).style.width = 100 + "%";
  }
}

function handleProgressBar() {
  const currentTime = document.querySelector(elements.currentTime);
  const currentDuration = document.querySelector(elements.currentDuration);
  currentTime.style.width = (audio.currentTime / audio.duration) * 100 + "%";
  currentDuration.innerHTML = showDuration(audio.currentTime);
}

function navigate(e) {
  const totalDuration = document.querySelector(elements.duration);
  const totalDurationRect = totalDuration.getBoundingClientRect();
  const width = Math.min(Math.max(0, e.clientX - totalDurationRect.x), totalDurationRect.width);
  const currentTime = document.querySelector(elements.currentTime);
  currentTime.style.width = (width / totalDurationRect.width) * 100 + "%";
  audio.currentTime = (width / totalDurationRect.width) * audio.duration;
}

function handleMouseDown(e) {
  navigate(e);
  mouseDownProgress = true;
}

function handleMouseUp(e) {
  mouseDownProgress = false;
  mouseDownVol = false;
}

function handleMouseMove(e) {
  if (mouseDownProgress) {
    e.preventDefault();
    navigate(e);
  } else if (mouseDownVol) {
    handleVolume(e);
  } else if (mouseOverDuration) {
    handleHoverDuration(e);
  }
}

function handleMouseEnter() {
  mouseOverDuration = true;
}

function handleMouseLeave() {
  mouseOverDuration = false;
  hideHoverDuration();
}

function handleVolumeMouseEnter() {
  if (!muted) {
    document.querySelector(elements.totalVol).classList.add("show");
  } else {
    document.querySelector(elements.totalVol).classList.remove("show");
  }
}

function handleVolumeMouseDown(e) {
  mouseDownVol = true;
  handleVolume(e);
}

function handleVolumeMouseLeave() {
  document.querySelector(elements.totalVol).classList.remove("show");
}

function handleHoverDuration(e) {
  const hoverTime = document.querySelector(elements.hoverTime);
  const hoverDuration = document.querySelector(elements.hoverDuration);
  hoverDuration.style.display = 'block';
  const rect = duration.getBoundingClientRect();
  const width = Math.min(Math.max(0, e.clientX - rect.x), rect.width);
  const percent = (width / rect.width) * 100;
  hoverTime.style.width = width + "px";
  hoverDuration.innerHTML = showDuration((audio.duration / 100) * percent);
}

function handleVolume(e) {
  const totalVol = document.querySelector(elements.totalVol);
  const volumeVal = Math.min(Math.max(0, (e.clientX - totalVolRect.x) / totalVolRect.width), 1);
  const currentVol = document.querySelector(elements.currentVol);
  currentVol.style.width = volumeVal * 100 + "%";
  saveVolume();
  audio.volume = volumeVal;
  handleAudioIcon();
}

function showDuration(time) {
  const hours = Math.floor(time / 3600);
  const minutes = Math.floor((time % 3600) / 60);
  const seconds = Math.floor(time % 60);
  return `${formatter(hours)}:${formatter(minutes)}:${formatter(seconds)}`;
}

function formatter(number) {
  return new Intl.NumberFormat({}, { minimumIntegerDigits: 2 }).format(number);
}

function handlePlaybackRate(e) {
  audio.playbackRate = parseFloat(e.target.dataset.value);
  document.querySelectorAll(elements.speedButtons).forEach(btn => {
    btn.classList.remove("speed-active");
  });
  e.target.classList.add("speed-active");
  document.querySelector(elements.settingMenu).classList.remove("show-setting-menu");
}

function canPlayInit() {
  muted = audio.muted;
  handleAudioIcon();
  if (audio.paused) {
    document.querySelector(elements.sh_play).classList.add("sh_play");
    isPlaying = false;
  } else {
    isPlaying = true;
    document.querySelector(elements.sh_pause).classList.add("sh_pause");
  }
  function setAudioTime() {
    if (!(isNaN(audio.duration) || audio.duration === 0)) {
      document.querySelector(elements.totalDuration).innerHTML = showDuration(audio.duration); 
    } else { setTimeout(setAudioTime, 25); }
  } 
  setAudioTime();
}

function handleShorthand(e) {
  const tagName = document.activeElement.tagName.toLowerCase();
  if (tagName === "input") return;
  if (e.key.match(/[0-9]/gi)) {
    audio.currentTime = (audio.duration / 100) * (parseInt(e.key) * 10);
    document.querySelector(elements.currentTime).style.width = parseInt(e.key) * 10 + "%";
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
      } 
      break;
    case "-":
      if (volumeVal != 0 && !muted) {
        volumeVal=volumeVal-0.05;
        if (volumeVal < 0)
        { volumeVal=0; }
        handleAudioIcon();
        audio.volume = volumeVal;
        currentVol.style.width = volumeVal * 100 +"%";
        saveVolume();
      } 
      break;
    default:
      break;
  }
}

function handleAudioIcon() {
  if (!muted) {
    if (volumeVal==0.0){
      document.querySelector(elements.sh_mute).classList.add("sh_mute");
      document.querySelector(elements.sh_fulla).classList.add("sh_fulla");
      document.querySelector(elements.sh_meda).classList.add("sh_meda");
      document.querySelector(elements.sh_lowa).classList.add("sh_lowa");
      document.querySelector(elements.sh_noa).classList.remove("sh_noa");
    } else if (volumeVal>0.67){
      document.querySelector(elements.sh_mute).classList.add("sh_mute");
      document.querySelector(elements.sh_fulla).classList.remove("sh_fulla");
      document.querySelector(elements.sh_meda).classList.add("sh_meda");
      document.querySelector(elements.sh_lowa).classList.add("sh_lowa");
      document.querySelector(elements.sh_noa).classList.add("sh_noa");
    } else if (volumeVal>0.33){
      document.querySelector(elements.sh_mute).classList.add("sh_mute");
      document.querySelector(elements.sh_fulla).classList.add("sh_fulla");
      document.querySelector(elements.sh_meda).classList.remove("sh_meda");
      document.querySelector(elements.sh_lowa).classList.add("sh_lowa");
      document.querySelector(elements.sh_noa).classList.add("sh_noa");
    } else if (volumeVal>0){
      document.querySelector(elements.sh_mute).classList.add("sh_mute");
      document.querySelector(elements.sh_fulla).classList.add("sh_fulla");
      document.querySelector(elements.sh_meda).classList.add("sh_meda");
      document.querySelector(elements.sh_lowa).classList.remove("sh_lowa");
      document.querySelector(elements.sh_noa).classList.add("sh_noa");
    }
  } else {
    document.querySelector(elements.sh_mute).classList.remove("sh_mute");
    document.querySelector(elements.sh_fulla).classList.add("sh_fulla");
    document.querySelector(elements.sh_meda).classList.add("sh_meda");
    document.querySelector(elements.sh_lowa).classList.add("sh_lowa");
    document.querySelector(elements.sh_noa).classList.add("sh_noa");
  }
}

function saveVolume() {
  localStorage.setItem("audioVolume", audio.volume.toString());
}

function next() {
  localStorage.setItem("audioMode", currentMode);
  localStorage.setItem("audioVolume", audio.volume.toString());
  window.location.href = nextUrl; 
}

function prev() {
  localStorage.setItem("audioMode", currentMode);
  localStorage.setItem("audioVolume", audio.volume.toString());
  window.location.href = prevUrl; 
}

function chMode() {
  if (currentMode === 0) { 
    currentMode=1; 
    mode.textContent = "»"; 
  } else if (currentMode === 1) { 
    currentMode=2; 
    mode.textContent = "↻"; 
  } else if (currentMode === 2) { 
    currentMode=0; 
    mode.textContent = "1"; 
  }
  localStorage.setItem("audioMode", currentMode); 
}

function toggleMuteUnmute() {
  document.querySelector(elements.totalVol).classList.remove("show");
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

function handleAudioEnded() {
  if (currentMode === 1) {
    localStorage.setItem("audioMode", currentMode);
    localStorage.setItem("audioVolume", audio.volume.toString());
    window.location.href = nextUrl; 
  } else if (currentMode === 2) { 
    audio.play(); 
  } else { 
    pause(); 
  }
}

function download() {
  const downloadLink = document.createElement('a');
  downloadLink.style.display = 'none';
  downloadLink.href = urlaudio;
  downloadLink.download = fileName;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}
