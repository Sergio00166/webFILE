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

let isShuffled = JSON.parse(localStorage.getItem('audioShuffle')) || false;
let loopMode = parseInt(localStorage.getItem('audioLoopMode'), 10) || 0;
const savedVolume = parseFloat(localStorage.getItem('audioVolume'));
const savedMuted = localStorage.getItem('audioMuted');

// ============================================================================
// PLAYBACK SPEED CONFIGURATION
// ============================================================================

const playbackSpeedOptions = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
let currentSpeedIndex;
if (playbackSpeedOptions.indexOf(parseFloat(localStorage.getItem('audioSpeed'))) >= 0) {
    currentSpeedIndex = playbackSpeedOptions.indexOf(parseFloat(localStorage.getItem('audioSpeed')));
} else {
    currentSpeedIndex = playbackSpeedOptions.indexOf(1);
}

// ============================================================================
// TOUCH INTERACTION VARIABLES
// ============================================================================

let speedButtonStartY = 0;
let isTouchHoverActive = false;

// ============================================================================
// INITIALIZATION
// ============================================================================

function initializeAudioPlayer() {
    // Set initial playback speed
    audio.playbackRate = playbackSpeedOptions[currentSpeedIndex];
    
    // Set initial volume
    if (!isNaN(savedVolume)) {
        audio.volume = savedVolume;
    }
    // Set initial muted state
    if (savedMuted !== null) {
        audio.muted = savedMuted === 'true';
    }
    // Update UI elements
    updateVolumeIcon();
    updateLoopButton();
    updateShuffleButton();
    updateSpeed();
}

function waitForAudioReady() {
    if (isNaN(audio.duration) || audio.duration === 0) {
        return setTimeout(waitForAudioReady, 25);
    }
    playAudio();
    if (audio.paused) pauseAudio();
    
    totalTime.textContent = formatTime(audio.duration);
    audio.addEventListener('timeupdate', updateSeekBar);
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
    localStorage.setItem('audioLoopMode', loopMode);
}

function cycleLoopMode() {
    loopMode = (loopMode + 1) % 3;
    updateLoopButton();
}

// ============================================================================
// SHUFFLE MODE MANAGEMENT
// ============================================================================

function updateShuffleButton() {
    if (isShuffled) {
        shuffleButton.style.opacity = 1;
    } else {
        shuffleButton.style.opacity = 0.4;
    }
}

function toggleShuffleMode() {
    isShuffled = !isShuffled;
    localStorage.setItem('audioShuffle', JSON.stringify(isShuffled));
    updateShuffleButton();
}

// ============================================================================
// PLAYBACK SPEED MANAGEMENT
// ============================================================================

function updateSpeed() {
    speedButton.textContent = playbackSpeedOptions[currentSpeedIndex] + 'x';
}

function changePlaybackSpeed() {
    currentSpeedIndex = (currentSpeedIndex + 1) % playbackSpeedOptions.length;
    audio.playbackRate = playbackSpeedOptions[currentSpeedIndex];
    localStorage.setItem('audioSpeed', playbackSpeedOptions[currentSpeedIndex]);
    updateSpeed();
}

function handleSpeedWheel(event) {
    event.preventDefault();
    
    if (event.deltaY < 0 && currentSpeedIndex < playbackSpeedOptions.length - 1) {
        currentSpeedIndex++;
    } else if (event.deltaY > 0 && currentSpeedIndex > 0) {
        currentSpeedIndex--;
    }
    
    audio.playbackRate = playbackSpeedOptions[currentSpeedIndex];
    localStorage.setItem('audioSpeed', playbackSpeedOptions[currentSpeedIndex]);
    updateSpeed();
}

function handleSpeedTouchStart(event) {
    event.preventDefault();
    speedButtonStartY = event.touches[0].clientY;
}

function handleSpeedTouchEnd(event) {
    const speedButtonEndY = event.changedTouches[0].clientY;
    const speedButtonDeltaY = speedButtonEndY - speedButtonStartY;

    if (speedButtonDeltaY > 10 && currentSpeedIndex < playbackSpeedOptions.length - 1) {
        currentSpeedIndex++;
    } else if (speedButtonDeltaY < -10 && currentSpeedIndex > 0) {
        currentSpeedIndex--;
    } else if (Math.abs(speedButtonDeltaY) < 10) {
        speedButton.click();
    }

    audio.playbackRate = playbackSpeedOptions[currentSpeedIndex];
    localStorage.setItem('audioSpeed', playbackSpeedOptions[currentSpeedIndex]);
    updateSpeed();
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
    
    if (hours > 0) {
        return `${formatNumber(hours)}:${formatNumber(minutes)}:${formatNumber(seconds)}`;
    } else {
        return `${formatNumber(minutes)}:${formatNumber(seconds)}`;
    }
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
    if (leftPosition + tooltipWidth > barRect.width) {
        leftPosition = barRect.width - tooltipWidth;
    }
    hoverInfo.style.left = `${leftPosition}px`;

    if (tooltipWidth) {
        hoverInfo.style.visibility = 'visible';
    } else {
        hoverInfo.style.visibility = 'hidden';
    }

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
    if (audio.muted) {
        volumeSlider.style.background = '#e1e1e1';
    } else {
        volumeSlider.style.background = `linear-gradient(to right, #007aff ${volumePercent}%, #e1e1e1 ${volumePercent}%)`;
    }
}

function updateVolumeIcon() {
    let index;

    if (audio.muted) {
        index = 0; // mute
    } else if (audio.volume === 0) {
        index = 4; // no volume
    } else if (audio.volume > 0.67) {
        index = 1; // full
    } else if (audio.volume > 0.33) {
        index = 2; // medium
    } else {
        index = 3; // low
    }
    for (var i = 0; i < volumeIcons.length; i++) {
        if (i === index) {
            volumeIcons[i].style.display = 'block';
        } else {
            volumeIcons[i].style.display = 'none';
        }
    }
}

function handleVolumeChange(event) {
    audio.volume = event.target.value;
    
    if (audio.muted) {
        audio.muted = false;
        localStorage.setItem('audioMuted', 'false');
    }
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
    audio.play().catch(() => {});
    playIcons[0].style.display = 'none';
    playIcons[1].style.display = 'block';
}

function togglePlayPauseState() {
    if (audio.paused) {
        playAudio();
    } else {
        pauseAudio();
    }
}

function handleAudioEnded() {
    if (loopMode === 2) {
        playAudio();
    } else if (loopMode === 1) {
        navigateToNext();
    } else {
        playIcons[1].style.display = 'none';
        playIcons[0].style.display = 'block';
    }
}

// ============================================================================
// NAVIGATION
// ============================================================================

function navigateToPrevious() {
    if (isShuffled) {
        window.history.go(-1);
    } else {
        previousLink.click();
    }
}

function navigateToNext() {
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

// ============================================================================
// KEYBOARD SHORTCUTS
// ============================================================================

function handleKeyboardShortcuts(event) {
    if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;

    if (event.key.match(/[0-9]/gi)) {
        audio.currentTime = (audio.duration / 100) * (parseInt(event.key) * 10);
        return;
    }
    switch (event.key.toLowerCase()) {
        case ' ':
            if (document.activeElement === document.body) {
                event.preventDefault();
                if (event.repeat) break;
                togglePlayPauseState();
            }
            break;
        case 'arrowright':
            audio.currentTime += 2;
            break;
        case 'arrowleft':
            audio.currentTime -= 2;
            break;
        case 'arrowup':
            audio.volume = Math.min(audio.volume + 0.02, 1);
            handleVolumeKeyboardChange();
            break;
        case 'arrowdown':
            audio.volume = Math.max(audio.volume - 0.02, 0);
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
}

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
// EVENT LISTENERS - AUDIO ELEMENT
// ============================================================================

audio.addEventListener('ended', handleAudioEnded);
audio.addEventListener('play', playAudio);
audio.addEventListener('pause', pauseAudio);

// ============================================================================
// EVENT LISTENERS - CONTROLS
// ============================================================================

volumeSlider.addEventListener('input', handleVolumeChange);
volumeSlider.addEventListener('keydown', (e) => { e.preventDefault(); });

speedButton.addEventListener('click', changePlaybackSpeed);
speedButton.addEventListener('wheel', handleSpeedWheel);
speedButton.addEventListener('touchstart', handleSpeedTouchStart, { passive: false });
speedButton.addEventListener('touchend', handleSpeedTouchEnd);

// ============================================================================
// EVENT LISTENERS - TIMELINE
// ============================================================================

seekBar.addEventListener('mousedown', (event) => {
    setupMouseDrag(moveEvent => updateAudioTime(getTimelinePosition(moveEvent.clientX).percentage));
});

seekBar.addEventListener('touchstart', (event) => {
    setupTouchDrag(moveEvent => updateAudioTime(getTimelinePosition(moveEvent.touches[0] && moveEvent.touches[0].clientX).percentage));
});

document.addEventListener('touchstart', () => {
    isTouchHoverActive = true;
    clearTimelineHover();
}, { passive: true });

seekBar.addEventListener('click', (event) => {
    updateAudioTime(getTimelinePosition(event.clientX).percentage);
});

seekBar.addEventListener('mousemove', (event) => {
    if (!isTouchHoverActive) showTimelineHover(event.clientX);
});

seekBar.addEventListener('mouseleave', () => {
    isTouchHoverActive = false;
    clearTimelineHover();
});

// ============================================================================
// EVENT LISTENERS - KEYBOARD
// ============================================================================

document.addEventListener('keydown', handleKeyboardShortcuts);

// ============================================================================
// EVENT LISTENERS - WINDOW
// ============================================================================

window.addEventListener('pageshow', () => {
    volumeSlider.value = audio.volume;
    updateVolumeBar();
    waitForAudioReady();
});

// ============================================================================
// INITIALIZATION CALL
// ============================================================================

initializeAudioPlayer();
setupMediaSession();

 