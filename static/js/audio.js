/* Code by Sergio00166 */

// ============================================================================
// DOM ELEMENTS - AUDIO PLAYER
// ============================================================================

const audio = document.querySelector('audio');
const seekBar = document.getElementById('seek-bar');
const progress = document.getElementById('progress');
const hoverTime = document.getElementById('hover-time');
const hoverInfo = document.getElementById('hover-info');
const currentTime = document.getElementById('current-time');
const totalTime = document.getElementById('total-time');
const volumeSlider = document.getElementById('volume-bar');

// ============================================================================
// DOM ELEMENTS - CONTROLS
// ============================================================================

const shuffleButton = document.getElementById('shuffle-btn');
const loopButton = document.getElementById('loop-btn');
const previousLink = document.getElementById('prev');
const nextLink = document.getElementById('next');
const randomLink = document.getElementById('random');
const downloadLink = document.getElementById('download-link');
const speedButton = document.getElementById('speed-btn');

// ============================================================================
// DOM ELEMENTS - ICONS
// ============================================================================

const volumeIcons = Array.from(
    document.querySelectorAll('#vol-icons img')
);
const loopIcons = Array.from(
    loopButton.querySelectorAll('img')
);
const playIcons = Array.from(
    document.querySelectorAll('#play-pause img')
);

// ============================================================================
// STATE VARIABLES
// ============================================================================

let isShuffled = false;
let loopMode = 0;
let speedIndex = 1;
let speedButtonStartY = 0;
let isTouchHoverActive = false;
const speedValues = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

// ============================================================================
// INITIALIZATION
// ============================================================================

function initializeAudioPlayer() {
    const savedShuffled = localStorage.getItem('audioShuffle');
    const savedLoopMode = localStorage.getItem('audioLoop');
    const savedVolume   = localStorage.getItem('audioVolume');
    const savedMuted    = localStorage.getItem('audioMuted');
    const savedSpeed    = localStorage.getItem('audioSpeed');

    loopMode = parseInt(savedLoopMode || '0');
    isShuffled = savedShuffled === 'true';
    audio.volume = parseFloat(savedVolume || 1);
    audio.muted = savedMuted === 'true';
    speedIndex = Math.max(speedValues.indexOf(savedSpeed), speedValues.indexOf(1));
    audio.playbackRate = speedValues[speedIndex];
    volumeSlider.value = audio.volume;

    updateSpeed();
    updateVolumeBar();
    updateVolumeIcon();
    updateLoopButton();
    updateShuffleButton();
    waitForAudioReady();
    setupMediaSession();
}

function waitForAudioReady() {
    if (isNaN(audio.duration) || audio.duration === 0)
        return setTimeout(waitForAudioReady, 25);

    playAudio();
    if (audio.paused) pauseAudio();

    totalTime.textContent = formatTime(audio.duration);
    audio.addEventListener('timeupdate', updateSeekBar);
}

function updateSpeed() {
    speedButton.textContent = speedValues[speedIndex] + 'x';
}

// ============================================================================
// LOOP MODE MANAGEMENT
// ============================================================================

function updateLoopButton() {
    if (loopMode === 0) {
        loopButton.style.opacity = 0.4;
        loopIcons[0].style.display = 'block';
        loopIcons[1].style.display = 'none';
    } else if (loopMode === 1) {
        loopButton.style.opacity = 1;
        loopIcons[0].style.display = 'block';
        loopIcons[1].style.display = 'none';
    } else {
        loopButton.style.opacity = 1;
        loopIcons[0].style.display = 'none';
        loopIcons[1].style.display = 'block';
    }
    localStorage.setItem('audioLoop', loopMode);
}

function cycleLoopMode() {
    loopMode = (loopMode + 1) % 3;
    updateLoopButton();
}

// ============================================================================
// SHUFFLE MODE MANAGEMENT
// ============================================================================

function updateShuffleButton() {
    if (isShuffled)
        shuffleButton.style.opacity = 1;
    else
        shuffleButton.style.opacity = 0.4;
}

function toggleShuffleMode() {
    isShuffled = !isShuffled;
    localStorage.setItem('audioShuffle', JSON.stringify(isShuffled));
    updateShuffleButton();
}

// ============================================================================
// TIME FORMATTING & DISPLAY
// ============================================================================

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
    const remainingSeconds = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${minutes}:${remainingSeconds}`;
}

function formatDuration(timeInSeconds) {
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds / 60) % 60);
    const seconds = Math.floor(timeInSeconds % 60);

    if (hours > 0)
        return `${formatNumber(hours)}:${formatNumber(minutes)}:${formatNumber(seconds)}`;
    else
        return `${formatNumber(minutes)}:${formatNumber(seconds)}`;
}

function formatNumber(number) {
    return new Intl.NumberFormat({}, {
        minimumIntegerDigits: 2
    }).format(number);
}

// ============================================================================
// SEEK BAR & PROGRESS
// ============================================================================

function updateSeekBar() {
    progress.style.width = (audio.currentTime / audio.duration) * 100 + '%';
    currentTime.textContent = formatTime(audio.currentTime);
}

function getTimelinePosition(clientX) {
    const rect = seekBar.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const position = Math.min(Math.max(0, clientX - rect.left), width);
    return {
        percentage: position / width,
        position: position,
        height: height
    };
}

function updateAudioTime(percentage) {
    audio.currentTime = percentage * audio.duration;
    updateSeekBar();
}

// ============================================================================
// TIMELINE INTERACTION
// ============================================================================

function showTimelineHover(clientX) {
    const { percentage, position, height } = getTimelinePosition(clientX);
    hoverTime.style.width = `${percentage * 100}%`;

    hoverInfo.textContent = formatDuration(percentage * audio.duration);
    hoverInfo.style.display = 'block';
    hoverInfo.style.bottom = `${height + 6}px`;

    const barRect = seekBar.getBoundingClientRect();
    const tooltipWidth = hoverInfo.offsetWidth;
    let leftPosition = position - tooltipWidth / 2;

    if (leftPosition < 0) leftPosition = 0;
    if (leftPosition + tooltipWidth > barRect.width)
        leftPosition = barRect.width - tooltipWidth;

    hoverInfo.style.left = `${leftPosition}px`;

    if (tooltipWidth)
        hoverInfo.style.visibility = 'visible';
    else
        hoverInfo.style.visibility = 'hidden';
}

function clearTimelineHover() {
    hoverTime.style.width = '0';
    hoverInfo.style.display = 'none';
}

function setupMouseDrag(handlerMove) {
    const endDrag = () => document.removeEventListener('mousemove', handlerMove);
    document.addEventListener('mousemove', handlerMove);
    document.addEventListener('mouseup', endDrag, { once: true });
}

function setupTouchDrag(handlerMove) {
    const endDrag = () => document.removeEventListener('touchmove', handlerMove);
    document.addEventListener('touchmove', handlerMove, { passive: true });
    document.addEventListener('touchend', endDrag, { once: true });
}

// ============================================================================
// VOLUME CONTROL
// ============================================================================

function updateVolumeBar() {
    const volumePercent = volumeSlider.value * 100;
    if (audio.muted)
        volumeSlider.style.background = '#e1e1e1';
    else
        volumeSlider.style.background = `linear-gradient(to right, #007aff ${volumePercent}%, #e1e1e1 ${volumePercent}%)`;
}

function updateVolumeIcon() {
    let index;
    if (audio.muted)
        index = 0; // mute
    else if (audio.volume === 0)
        index = 4; // no volume
    else if (audio.volume > 0.67)
        index = 1; // full
    else if (audio.volume > 0.33)
        index = 2; // medium
    else
        index = 3; // low

    for (let i = 0; i < volumeIcons.length; i++) {
        if (i === index)
            volumeIcons[i].style.display = 'block';
        else
            volumeIcons[i].style.display = 'none';
    }
}

function handleVolumeChange(event) {
    if (audio.muted) {
        audio.muted = false;
        localStorage.setItem('audioMuted', 'false');
    }
    audio.volume = event.target.value;
    localStorage.setItem('audioVolume', audio.volume);
    updateVolumeIcon();
    updateVolumeBar();
}

function toggleMuteState() {
    audio.muted = !audio.muted;
    localStorage.setItem('audioMuted', audio.muted);
    updateVolumeIcon();
    updateVolumeBar();
}

function handleVolumeKeyboardChange() {
    volumeSlider.value = audio.volume;
    localStorage.setItem('audioVolume', audio.volume);
    updateVolumeIcon();
    updateVolumeBar();
}

// ============================================================================
// PLAYBACK CONTROL
// ============================================================================

function pauseAudio() {
    audio.pause();
    playIcons[1].style.display = 'none';
    playIcons[0].style.display = 'block';
}

function playAudio() {
    audio.play().catch(()=>{});
    playIcons[0].style.display = 'none';
    playIcons[1].style.display = 'block';
}

function togglePlayPauseState() {
    if (audio.paused)
        playAudio();
    else
        pauseAudio();
}

function handleAudioEnded() {
    switch (loopMode) {
        case 1:
            navigateToNext();
            break;
        case 2:
            playAudio();
            break;
        default:
            playIcons[1].style.display = 'none';
            playIcons[0].style.display = 'block';
            break;

    }
}

// ============================================================================
// NAVIGATION
// ============================================================================

function navigateToPrevious() {
    if (isShuffled)
        window.history.go(-1);
    else
        previousLink.click();
}

function navigateToNext() {
    if (isShuffled) {
        window.history.forward();
        setTimeout(() => randomLink.click(), 250);
    } else {
        nextLink.click();
    }
}

function download() {
    downloadLink.click();
}

// ============================================================================
// KEYBOARD SHORTCUTS
// ============================================================================

document.addEventListener('mouseup', event => {
    switch (event.button) {
        case 3:
            event.preventDefault();
            navigateToPrevious();
            break;
        case 4:
            event.preventDefault();
            navigateToNext();
            break;
        default:
            break;
    }
});

document.addEventListener('keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    if (event.key.match(/[0-9]/gi)) {
        audio.currentTime = (audio.duration / 100) * (parseInt(event.key) * 10);
        return;
    }
    let delta = 1;

    switch (event.key.toLowerCase()) {
        case ' ':
            if (document.activeElement === document.body) {
                event.preventDefault();
                if (event.repeat) break;
                togglePlayPauseState();
            }
            break;

        case 'arrowleft': delta -= 2;
        case 'arrowright':
            audio.currentTime += delta * 2;
            break;

        case 'arrowdown': delta -= 2;
        case 'arrowup':
            const tmp = audio.volume + (delta * 0.02);
            audio.volume = Math.min(Math.max(tmp, 0), 1);
            handleVolumeKeyboardChange();
            break;

        case 'm':
            toggleMuteState();
            break;
        case 's':
            toggleShuffleMode();
            break;
        case 'l':
            cycleLoopMode();
            break;
        case 'n':
            navigateToNext();
            break;
        case 'p':
            navigateToPrevious();
            break;
        default:
            break;
    }
});

// ============================================================================
// MEDIA SESSION API
// ============================================================================

function setupMediaSession() {
    if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('previoustrack', navigateToPrevious);
        navigator.mediaSession.setActionHandler('nexttrack', navigateToNext);
    }
}

// ============================================================================
// EVENT LISTENERS - BASE
// ============================================================================

audio.addEventListener('ended', handleAudioEnded);
audio.addEventListener('play', playAudio);
audio.addEventListener('pause', pauseAudio);

volumeSlider.addEventListener('input', handleVolumeChange);
volumeSlider.addEventListener('keydown', e => e.preventDefault());

// ============================================================================
// EVENT LISTENERS - SPEED
// ============================================================================

speedButton.addEventListener('click', ()=>{
    speedIndex = (speedIndex + 1) % speedValues.length;
    audio.playbackRate = speedValues[speedIndex];
    localStorage.setItem('audioSpeed', speedValues[speedIndex]);
    updateSpeed();
});

speedButton.addEventListener('touchstart', event => {
    event.preventDefault();
    speedButtonStartY = event.touches[0].clientY;
}, { passive: false });

speedButton.addEventListener('touchend', event => {
    const speedButtonEndY = event.changedTouches[0].clientY;
    const speedButtonDeltaY = speedButtonEndY - speedButtonStartY;

    if (speedButtonDeltaY > 10 && speedIndex < speedValues.length - 1)
        speedIndex++;
    else if (speedButtonDeltaY < -10 && speedIndex > 0)
        speedIndex--;
    else if (Math.abs(speedButtonDeltaY) < 10)
        speedButton.click();

    audio.playbackRate = speedValues[speedIndex];
    localStorage.setItem('audioSpeed', speedValues[speedIndex]);
    updateSpeed();
});

speedButton.addEventListener('wheel', event => {
    event.preventDefault();

    if (event.deltaY < 0 && speedIndex < speedValues.length - 1)
        speedIndex++;
    else if (event.deltaY > 0 && speedIndex > 0)
        speedIndex--;

    audio.playbackRate = speedValues[speedIndex];
    localStorage.setItem('audioSpeed', speedValues[speedIndex]);
    updateSpeed();

}, { passive: false });

// ============================================================================
// EVENT LISTENERS - TIMELINE
// ============================================================================

seekBar.addEventListener('mousedown', event => {
    setupMouseDrag(moveEvent => updateAudioTime(
        getTimelinePosition(moveEvent.clientX).percentage)
    );
});

seekBar.addEventListener('touchstart', event => {
    setupTouchDrag(moveEvent => updateAudioTime(
        getTimelinePosition(moveEvent.touches[0] && moveEvent.touches[0].clientX).percentage)
    );
},{ passive: true });

document.addEventListener('touchstart', ()=>{
    isTouchHoverActive = true;
    clearTimelineHover();
},{ passive: true });

seekBar.addEventListener('click', event => {
    updateAudioTime(getTimelinePosition(event.clientX).percentage);
});

seekBar.addEventListener('mousemove', event => {
    if (!isTouchHoverActive) showTimelineHover(event.clientX);
});

seekBar.addEventListener('mouseleave', ()=>{
    isTouchHoverActive = false;
    clearTimelineHover();
});

// ============================================================================
// INITIALIZATION CALL
// ============================================================================

window.addEventListener('pageshow', initializeAudioPlayer);

 