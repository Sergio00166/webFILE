/* Code by Sergio00166 */

const audio = document.getElementById('audio');
const iconPlay = document.querySelector('.icon-play');
const iconPause = document.querySelector('.icon-pause');
const seekBar = document.getElementById('seek-bar');
const currentTimeElem = document.getElementById('current-time');
const totalTimeElem = document.getElementById('total-time');
const volIcon = document.getElementById('vol-icon');
const volumeBar = document.getElementById('volume-bar');
const shuffleBtn = document.getElementById('shuffle-btn');
const loopBtn = document.getElementById('loop-btn');
const prevLink = document.getElementById('prev');
const nextLink = document.getElementById('next');
const randomLink = document.getElementById('random');
const downloadLink = document.getElementById('download-link');
const volHighIcon = document.querySelector('.vol-high');
const volMedIcon = document.querySelector('.vol-medium');
const volLowIcon = document.querySelector('.vol-low');
const volZeroIcon = document.querySelector('.vol-zero');
const volMutedIcon = document.querySelector('.vol-muted');
const loopImg = document.getElementById('loop');
const loopSameImg = document.getElementById('loopSame');

let isShuffled = JSON.parse(localStorage.getItem('audioShuffle')) || false;
let loopMode = parseInt(localStorage.getItem('audioLoopMode'), 10) || 0;

function updateLoopButton() {
    if (loopMode === 0) {
        audio.loop = false;
        loopBtn.style.opacity = 0.4;
        loopBtn.title = 'No Loop';
        loopImg.style.display = "block";
        loopSameImg.style.display = "none";
    } else if (loopMode === 1) {
        audio.loop = false;
        loopBtn.style.opacity = 1;
        loopBtn.title = 'Loop Playlist';
        loopImg.style.display = "block";
        loopSameImg.style.display = "none";
    } else {
        audio.loop = true;
        loopBtn.style.opacity = 1;
        loopBtn.title = 'Repeat One';
        loopImg.style.display = "none";
        loopSameImg.style.display = "block";
    }
    localStorage.setItem('audioLoopMode', loopMode);
}
updateLoopButton();

shuffleBtn.style.opacity = isShuffled ? 1 : 0.4;

const savedVolume = parseFloat(localStorage.getItem('audioVolume'));
const savedMuted = localStorage.getItem('audioMuted');
if (!isNaN(savedVolume)) {
    audio.volume = savedVolume;
    volumeBar.value = savedVolume;
}
if (savedMuted !== null) {
    audio.muted = savedMuted === 'true';
}
updateVolumeIcon(audio.volume);
updateVolumeBar();

const speedBtn = document.getElementById('speed-btn');
const speedOptions = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
let speedIndex = speedOptions.indexOf(parseFloat(localStorage.getItem('audioSpeed'))) >= 0 ?
    speedOptions.indexOf(parseFloat(localStorage.getItem('audioSpeed'))) :
    speedOptions.indexOf(1);
audio.playbackRate = speedOptions[speedIndex];

function updateSpeedDisplay() {
    speedBtn.textContent = speedOptions[speedIndex] + 'x';
}
updateSpeedDisplay();
speedBtn.addEventListener('click', () => {
    speedIndex = (speedIndex + 1) % speedOptions.length;
    audio.playbackRate = speedOptions[speedIndex];
    localStorage.setItem('audioSpeed', speedOptions[speedIndex]);
    updateSpeedDisplay();
});
speedBtn.addEventListener('wheel', e => {
    e.preventDefault();
    if (e.deltaY < 0 && speedIndex < speedOptions.length - 1) {
        speedIndex++;
    } else if (e.deltaY > 0 && speedIndex > 0) {
        speedIndex--;
    }
    audio.playbackRate = speedOptions[speedIndex];
    localStorage.setItem('audioSpeed', speedOptions[speedIndex]);
    updateSpeedDisplay();
});

function formatTime(sec) {
    const min = Math.floor(sec / 60).toString().padStart(2, '0');
    const sec2 = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${min}:${sec2}`;
}

function updateSeekBar() {
    const percent = (audio.currentTime/audio.duration)*100;
    seekBar.style.background = `linear-gradient(to right, #007aff ${percent}%, #e1e1e1 ${percent}%)`;
    currentTimeElem.textContent = formatTime(audio.currentTime);
    seekBar.value = percent;
    if ('mediaSession' in navigator) {
        navigator.mediaSession.setPositionState({
            position: audio.currentTime,
            playbackRate: audio.playbackRate,
            duration: audio.duration
        });
    }
}

seekBar.addEventListener('input', (e) => {
    audio.currentTime = (e.target.value / 100) * audio.duration;
    updateSeekBar();
});

volumeBar.addEventListener('input', (e) => {
    audio.volume = e.target.value;
    if (audio.muted) {
        audio.muted = false;
        localStorage.setItem('audioMuted', 'false');
    }
    localStorage.setItem('audioVolume', audio.volume);
    updateVolumeIcon(audio.volume);
    updateVolumeBar();
});

audio.addEventListener('loadeddata', () => {
    totalTimeElem.textContent = formatTime(audio.duration);
    toggleMainState();
    updateVolumeBar();
});
audio.addEventListener('timeupdate', updateSeekBar);
audio.addEventListener('ended', () => {
    if (loopMode === 2) {
        audio.play();
    } else if (loopMode === 1) {
        next();
    } else {
        iconPause.style.display = 'none';
        iconPlay.style.display = 'block';
    }
});

function updateVolumeBar() {
    const percent = volumeBar.value * 100;
    if (audio.muted) {
        volumeBar.style.background = '#e1e1e1';
    } else {
        volumeBar.style.background = `linear-gradient(to right, #007aff ${percent}%, #e1e1e1 ${percent}%)`;
    }
}

function updateVolumeIcon(vol) {
    [volHighIcon, volMedIcon, volLowIcon, volZeroIcon, volMutedIcon].forEach(el => el.style.display = 'none');
    if (audio.muted) {
        volMutedIcon.style.display = 'block';
    } else if (vol === 0) {
        volZeroIcon.style.display = 'block';
    } else if (vol > 0.66) {
        volHighIcon.style.display = 'block';
    } else if (vol > 0.33) {
        volMedIcon.style.display = 'block';
    } else {
        volLowIcon.style.display = 'block';
    }
}

function pause() {
    audio.pause();
    iconPause.style.display = 'none';
    iconPlay.style.display = 'block';
}

function play() {
    audio.play().catch(()=>{});
    if (!audio.paused) {
        iconPlay.style.display = 'none';
        iconPause.style.display = 'block';
    }
}

function toggleMainState() {
    if (audio.paused) { play();  }
    else { pause(); }
}
audio.addEventListener("play", play);
audio.addEventListener("pause", pause);


function toggleMuteUnmute() {
    audio.muted = !audio.muted;
    localStorage.setItem('audioMuted', audio.muted.toString());
    updateVolumeIcon(audio.volume);
    updateVolumeBar();
}

function toggleShuffle() {
    isShuffled = !isShuffled;
    localStorage.setItem('audioShuffle', JSON.stringify(isShuffled));
    shuffleBtn.style.opacity = isShuffled ? 1 : 0.4;
}

function cycleLoop() {
    loopMode = (loopMode + 1) % 3;
    updateLoopButton();
}

function prev() {
    if (isShuffled) {
        window.history.go(-1);
    } else {
        prevLink.click();
    }
}

function next() {
    if (isShuffled) {
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


let speedBtn_startY = 0;

speedBtn.addEventListener('touchstart', e => {
    speedBtn_startY = e.touches[0].clientY;
}, { passive: true });

speedBtn.addEventListener('touchend', e => {
    const speedBtn_endY = e.changedTouches[0].clientY;
    const speedBtn_deltaY = speedBtn_endY - speedBtn_startY;

    if (speedBtn_deltaY > 10 && speedIndex < speedOptions.length - 1) {
        speedIndex++;
    } else if (speedBtn_deltaY < -10 && speedIndex > 0) {
        speedIndex--;
    }

    audio.playbackRate = speedOptions[speedIndex];
    localStorage.setItem('audioSpeed', speedOptions[speedIndex]);
    updateSpeedDisplay();
});


// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
    e.preventDefault();
    switch (e.key.toLowerCase()) {
        case ' ':
            e.preventDefault();
            toggleMainState();
            break;
        case 'KeyM':
            toggleMuteUnmute();
            break;
        case 's':
            toggleShuffle();
            break;
        case 'l':
            cycleLoop();
            break;
        case "arrowdown":
            prev();
            break;
        case "arrowup":
            next();
            break;
        case "arrowright":
            audio.currentTime += 2;
            break;
        case "arrowleft":
            audio.currentTime -= 2;
            break;
        case "+":
            audio.volume = Math.min(audio.volume + 0.05, 1);
            volumeBar.value = audio.volume;
            localStorage.setItem('audioVolume', audio.volume);
            updateVolumeIcon(audio.volume);
            updateVolumeBar();
            break;
        case "-":
            audio.volume = Math.max(audio.volume - 0.05, 0);
            volumeBar.value = audio.volume;
            localStorage.setItem('audioVolume', audio.volume);
            updateVolumeIcon(audio.volume);
            updateVolumeBar();
            break;
        default:
            break;
    }
});

// Media session
if ('mediaSession' in navigator) {
    navigator.mediaSession.setActionHandler('previoustrack', prev);
    navigator.mediaSession.setActionHandler('nexttrack', next);
}
