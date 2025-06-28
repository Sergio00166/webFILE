/* Code by Sergio00166 */

const audio = document.getElementById('audio');
const iconPlay = document.querySelector('#play-pause img:first-child');
const iconPause = document.querySelector('#play-pause img:last-child');
const duration = document.querySelector(".duration");
const currentTime = document.querySelector(".current-time");
const hoverTime = document.querySelector(".hover-time");
const hoverDuration = document.querySelector(".hover-duration");
const currentTimeElem = document.getElementById('current-time');
const totalTimeElem = document.getElementById('total-time');
const volumeBar = document.getElementById('volume-bar');
const shuffleBtn = document.getElementById('shuffle-btn');
const loopBtn = document.getElementById('loop-btn');
const prevLink = document.getElementById('prev');
const nextLink = document.getElementById('next');
const randomLink = document.getElementById('random');
const downloadLink = document.getElementById('download-link');
const volHighIcon = document.querySelector('.vol-icons img:nth-child(1)');
const volMedIcon = document.querySelector('.vol-icons img:nth-child(2)');
const volLowIcon = document.querySelector('.vol-icons img:nth-child(3)');
const volZeroIcon = document.querySelector('.vol-icons img:nth-child(4)');
const volMutedIcon = document.querySelector('.vol-icons img:nth-child(5)');
const loopImg = document.querySelector('#loop-btn img:first-child');
const loopSameImg = document.querySelector('#loop-btn img:last-child');

let isShuffled = JSON.parse(localStorage.getItem('audioShuffle')) || false;
let loopMode = parseInt(localStorage.getItem('audioLoopMode'), 10) || 0;
const savedVolume = parseFloat(localStorage.getItem('audioVolume'));
const savedMuted = localStorage.getItem('audioMuted');
const speedBtn = document.getElementById('speed-btn');
const speedOptions = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
let speedIndex = speedOptions.indexOf(parseFloat(localStorage.getItem('audioSpeed'))) >= 0 ?
    speedOptions.indexOf(parseFloat(localStorage.getItem('audioSpeed'))) :
    speedOptions.indexOf(1);
audio.playbackRate = speedOptions[speedIndex];
let speedBtn_startY = 0;
let fixTouchHover = false;

if (!isNaN(savedVolume)) audio.volume = savedVolume;
if (savedMuted !== null) audio.muted = savedMuted === 'true';
updateVolumeIcon(audio.volume);

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

window.addEventListener('pageshow', () => {
    volumeBar.value = audio.volume;
    updateVolumeBar();
    (function wait4ready() {
        if (isNaN(audio.duration) || audio.duration === 0) {
            return setTimeout(wait4ready, 25);
        }
        play(); if (audio.paused) pause();
        totalTimeElem.textContent = formatTime(audio.duration);
        audio.addEventListener('timeupdate', updateSeekBar);
    })();
});


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
    if (e.deltaY < 0 && speedIndex < speedOptions.length - 1) speedIndex++;
    else if (e.deltaY > 0 && speedIndex > 0) speedIndex--;
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
    currentTime.style.width = (audio.currentTime / audio.duration) * 100 + "%";
    currentTimeElem.textContent = formatTime(audio.currentTime);
}

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

audio.addEventListener('ended', () => {
    if (loopMode === 2) play();
    else if (loopMode === 1) next();
    else {
        iconPause.style.display = 'none';
        iconPlay.style.display = 'block';
    }
});

function updateVolumeBar() {
    const percent = volumeBar.value * 100;
    if (audio.muted) volumeBar.style.background = '#e1e1e1';
    else volumeBar.style.background = `linear-gradient(to right, #007aff ${percent}%, #e1e1e1 ${percent}%)`;
}

function updateVolumeIcon(vol) {
    [volHighIcon, volMedIcon, volLowIcon, volZeroIcon, volMutedIcon].forEach(el => el.style.display = 'none');
    if (audio.muted) volMutedIcon.style.display = 'block';
    else if (vol === 0) volZeroIcon.style.display = 'block';
    else if (vol > 0.66) volHighIcon.style.display = 'block';
    else if (vol > 0.33) volMedIcon.style.display = 'block';
    else volLowIcon.style.display = 'block';
}

function pause() {
    audio.pause();
    iconPause.style.display = 'none';
    iconPlay.style.display = 'block';
}

function play() {
    audio.play().catch(()=>{});
    iconPlay.style.display = 'none';
    iconPause.style.display = 'block';
}

function toggleMainState() {
    audio.paused ? play() : pause();
}
audio.addEventListener("play", play);
audio.addEventListener("pause", pause);


function toggleMuteUnmute() {
    audio.muted = !audio.muted;
    localStorage.setItem('audioMuted', audio.muted);
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
    if (isShuffled) window.history.go(-1);
    else prevLink.click();
}

function next() {
    if (isShuffled) {
        window.history.forward();
        setTimeout(() => {
            randomLink.click();
        }, 250);
    } else nextLink.click();
}

function download() { downloadLink.click(); }

speedBtn.addEventListener('touchstart', e => {
    e.preventDefault();
    speedBtn_startY = e.touches[0].clientY;
}, { passive: false });

speedBtn.addEventListener('touchend', e => {
    const speedBtn_endY = e.changedTouches[0].clientY;
    const speedBtn_deltaY = speedBtn_endY - speedBtn_startY;

    if (speedBtn_deltaY > 10 && speedIndex < speedOptions.length - 1) speedIndex++;
    else if (speedBtn_deltaY < -10 && speedIndex > 0) speedIndex--;
    else if (Math.abs(speedBtn_deltaY) < 10) speedBtn.click();

    audio.playbackRate = speedOptions[speedIndex];
    localStorage.setItem('audioSpeed', speedOptions[speedIndex]);
    updateSpeedDisplay();
});


function formatter(number) {
    return new Intl.NumberFormat({}, {
        minimumIntegerDigits: 2
    }).format(number);
}
function showDuration(time) {
    const hours = Math.floor(time / 60 ** 2);
    const min = Math.floor((time / 60) % 60);
    const sec = Math.floor(time % 60);
    if (hours > 0) return `${formatter(hours)}:${formatter(min)}:${formatter(sec)}`;
    else return `${formatter(min)}:${formatter(sec)}`;
}


// Time bar control funcs

const getPct = clientX => {
    const { x, width, height } = duration.getBoundingClientRect();
    const pos = Math.min(Math.max(0, clientX - x), width);
    return { pct: pos / width, pos, height };
};

function updateTime(pct) {
    currentTime.style.width = `${pct * 100}%`;
    audio.currentTime = pct * audio.duration;
}

function showHover(clientX) {
    const { pct, pos, height } = getPct(clientX);
    hoverTime.style.width = `${pct * 100}%`;
    hoverDuration.textContent = showDuration(pct * audio.duration);
    hoverDuration.style.display = 'block';
    hoverDuration.style.bottom = `${height + 6}px`;
    const barRect = duration.getBoundingClientRect();
    const tooltipWidth = hoverDuration.offsetWidth;
    let left = pos - tooltipWidth / 2;
    if (left < 0) left = 0;
    if (left + tooltipWidth > barRect.width) left = barRect.width - tooltipWidth;
    hoverDuration.style.left = `${left}px`;
    hoverDuration.style.visibility = tooltipWidth ? 'visible' : 'hidden';
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

duration.addEventListener('mousedown', e =>
    drag(eMove => updateTime(getPct(eMove.clientX).pct))
);
duration.addEventListener('touchstart', e =>
    touchDrag(eMove => updateTime(getPct(eMove.touches[0]?.clientX).pct))
);

document.addEventListener('touchstart', () => { fixTouchHover = true; clearHover(); }, { passive: true });
duration.addEventListener('click', e => updateTime(getPct(e.clientX).pct));
duration.addEventListener('mousemove', e => { if (!fixTouchHover) showHover(e.clientX); });
duration.addEventListener('mouseleave', () => { fixTouchHover = false; clearHover(); });


// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;

    if (e.key.match(/[0-9]/gi)) {
        audio.currentTime = (audio.duration / 100) * (parseInt(e.key) * 10);
        return;
    }
    switch (e.key.toLowerCase()) {
        case ' ':
            if (document.activeElement === document.body) {
                e.preventDefault();
                if (e.repeat) break;
                toggleMainState();
            } break;
        case 'm':
            toggleMuteUnmute();
            break;
        case 's':
            toggleShuffle();
            break;
        case 'l':
            cycleLoop();
            break;
        case "arrowdown":
            next();
            break;
        case "arrowup":
            prev();
            break;
        case "arrowright":
            audio.currentTime += 2;
            break;
        case "arrowleft":
            audio.currentTime -= 2;
            break;
        case "+":
            audio.volume = Math.min(audio.volume + 0.02, 1);
            volume_kbd_helper();
            break;
        case "-":
            audio.volume = Math.max(audio.volume - 0.02, 0);
            volume_kbd_helper();
            break;
        default:
            break;
    }
});

function volume_kbd_helper() {
    volumeBar.value = audio.volume;
    localStorage.setItem('audioVolume', audio.volume);
    updateVolumeIcon(audio.volume);
    updateVolumeBar();
}

// Media session
if ('mediaSession' in navigator) {
    navigator.mediaSession.setActionHandler('previoustrack', prev);
    navigator.mediaSession.setActionHandler('nexttrack', next);
}

