/* Code by Sergio00166 */

// ============================================================================
// DOM ELEMENTS - AUDIO PLAYER
// ============================================================================

const audioElement = document.getElementById('audio');
const playIcon = document.querySelector('#play-pause img:first-child');
const pauseIcon = document.querySelector('#play-pause img:last-child');
const durationBar = document.querySelector('.duration');
const currentTimeBar = document.querySelector('.current-time');
const hoverTimeBar = document.querySelector('.hover-time');
const hoverDurationDisplay = document.querySelector('.hover-duration');
const currentTimeDisplay = document.getElementById('current-time');
const totalTimeDisplay = document.getElementById('total-time');
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

const volumeHighIcon = document.querySelector('.vol-icons img:nth-child(1)');
const volumeMediumIcon = document.querySelector('.vol-icons img:nth-child(2)');
const volumeLowIcon = document.querySelector('.vol-icons img:nth-child(3)');
const volumeZeroIcon = document.querySelector('.vol-icons img:nth-child(4)');
const volumeMutedIcon = document.querySelector('.vol-icons img:nth-child(5)');
const loopIcon = document.querySelector('#loop-btn img:first-child');
const loopSameIcon = document.querySelector('#loop-btn img:last-child');

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
let currentSpeedIndex = playbackSpeedOptions.indexOf(parseFloat(localStorage.getItem('audioSpeed'))) >= 0 ?
    playbackSpeedOptions.indexOf(parseFloat(localStorage.getItem('audioSpeed'))) :
    playbackSpeedOptions.indexOf(1);

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
    audioElement.playbackRate = playbackSpeedOptions[currentSpeedIndex];
    
    // Set initial volume
    if (!isNaN(savedVolume)) {
        audioElement.volume = savedVolume;
    }
    
    // Set initial muted state
    if (savedMuted !== null) {
        audioElement.muted = savedMuted === 'true';
    }
    
    // Update UI elements
    updateVolumeIcon(audioElement.volume);
    updateLoopButton();
    updateShuffleButton();
    updateSpeedDisplay();
}

function waitForAudioReady() {
    if (isNaN(audioElement.duration) || audioElement.duration === 0) {
        return setTimeout(waitForAudioReady, 25);
    }
    
    playAudio();
    if (audioElement.paused) pauseAudio();
    
    totalTimeDisplay.textContent = formatTime(audioElement.duration);
    audioElement.addEventListener('timeupdate', updateSeekBar);
}

// ============================================================================
// LOOP MODE MANAGEMENT
// ============================================================================

function updateLoopButton() {
    if (loopMode === 0) {
        loopButton.style.opacity = 0.4;
        loopIcon.style.display = 'block';
        loopSameIcon.style.display = 'none';
    } else if (loopMode === 1) {
        loopButton.style.opacity = 1;
        loopIcon.style.display = 'block';
        loopSameIcon.style.display = 'none';
    } else {
        loopButton.style.opacity = 1;
        loopIcon.style.display = 'none';
        loopSameIcon.style.display = 'block';
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
    shuffleButton.style.opacity = isShuffled ? 1 : 0.4;
}

function toggleShuffleMode() {
    isShuffled = !isShuffled;
    localStorage.setItem('audioShuffle', JSON.stringify(isShuffled));
    updateShuffleButton();
}

// ============================================================================
// PLAYBACK SPEED MANAGEMENT
// ============================================================================

function updateSpeedDisplay() {
    speedButton.textContent = playbackSpeedOptions[currentSpeedIndex] + 'x';
}

function changePlaybackSpeed() {
    currentSpeedIndex = (currentSpeedIndex + 1) % playbackSpeedOptions.length;
    audioElement.playbackRate = playbackSpeedOptions[currentSpeedIndex];
    localStorage.setItem('audioSpeed', playbackSpeedOptions[currentSpeedIndex]);
    updateSpeedDisplay();
}

function handleSpeedWheel(event) {
    event.preventDefault();
    
    if (event.deltaY < 0 && currentSpeedIndex < playbackSpeedOptions.length - 1) {
        currentSpeedIndex++;
    } else if (event.deltaY > 0 && currentSpeedIndex > 0) {
        currentSpeedIndex--;
    }
    
    audioElement.playbackRate = playbackSpeedOptions[currentSpeedIndex];
    localStorage.setItem('audioSpeed', playbackSpeedOptions[currentSpeedIndex]);
    updateSpeedDisplay();
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

    audioElement.playbackRate = playbackSpeedOptions[currentSpeedIndex];
    localStorage.setItem('audioSpeed', playbackSpeedOptions[currentSpeedIndex]);
    updateSpeedDisplay();
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
    currentTimeBar.style.width = (audioElement.currentTime / audioElement.duration) * 100 + '%';
    currentTimeDisplay.textContent = formatTime(audioElement.currentTime);
}

function getTimelinePosition(clientX) {
    const rect = durationBar.getBoundingClientRect();
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
    audioElement.currentTime = percentage * audioElement.duration;
    updateSeekBar();
}

// ============================================================================
// TIMELINE INTERACTION
// ============================================================================

function showTimelineHover(clientX) {
    const { percentage, position, height } = getTimelinePosition(clientX);
    hoverTimeBar.style.width = `${percentage * 100}%`;
    
    hoverDurationDisplay.textContent = formatDuration(percentage * audioElement.duration);
    hoverDurationDisplay.style.display = 'block';
    hoverDurationDisplay.style.bottom = `${height + 6}px`;
    
    const barRect = durationBar.getBoundingClientRect();
    const tooltipWidth = hoverDurationDisplay.offsetWidth;
    let leftPosition = position - tooltipWidth / 2;
    
    if (leftPosition < 0) leftPosition = 0;
    if (leftPosition + tooltipWidth > barRect.width) {
        leftPosition = barRect.width - tooltipWidth;
    }
    
    hoverDurationDisplay.style.left = `${leftPosition}px`;
    hoverDurationDisplay.style.visibility = tooltipWidth ? 'visible' : 'hidden';
}

function clearTimelineHover() {
    hoverTimeBar.style.width = '0';
    hoverDurationDisplay.style.display = 'none';
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
    if (audioElement.muted) {
        volumeSlider.style.background = '#e1e1e1';
    } else {
        volumeSlider.style.background = `linear-gradient(to right, #007aff ${volumePercent}%, #e1e1e1 ${volumePercent}%)`;
    }
}

function updateVolumeIcon(volume) {
    const allVolumeIcons = [volumeHighIcon, volumeMediumIcon, volumeLowIcon, volumeZeroIcon, volumeMutedIcon];
    allVolumeIcons.forEach(icon => icon.style.display = 'none');
    
    if (audioElement.muted) {
        volumeMutedIcon.style.display = 'block';
    } else if (volume === 0) {
        volumeZeroIcon.style.display = 'block';
    } else if (volume > 0.66) {
        volumeHighIcon.style.display = 'block';
    } else if (volume > 0.33) {
        volumeMediumIcon.style.display = 'block';
    } else {
        volumeLowIcon.style.display = 'block';
    }
}

function handleVolumeChange(event) {
    audioElement.volume = event.target.value;
    
    if (audioElement.muted) {
        audioElement.muted = false;
        localStorage.setItem('audioMuted', 'false');
    }
    
    localStorage.setItem('audioVolume', audioElement.volume);
    updateVolumeIcon(audioElement.volume);
    updateVolumeBar();
}

function toggleMuteState() {
    audioElement.muted = !audioElement.muted;
    localStorage.setItem('audioMuted', audioElement.muted);
    updateVolumeIcon(audioElement.volume);
    updateVolumeBar();
}

function handleVolumeKeyboardChange() {
    volumeSlider.value = audioElement.volume;
    localStorage.setItem('audioVolume', audioElement.volume);
    updateVolumeIcon(audioElement.volume);
    updateVolumeBar();
}

// ============================================================================
// PLAYBACK CONTROL
// ============================================================================

function pauseAudio() {
    audioElement.pause();
    pauseIcon.style.display = 'none';
    playIcon.style.display = 'block';
}

function playAudio() {
    audioElement.play().catch(() => {});
    playIcon.style.display = 'none';
    pauseIcon.style.display = 'block';
}

function togglePlayPauseState() {
    audioElement.paused ? playAudio() : pauseAudio();
}

function handleAudioEnded() {
    if (loopMode === 2) {
        playAudio();
    } else if (loopMode === 1) {
        navigateToNext();
    } else {
        pauseIcon.style.display = 'none';
        playIcon.style.display = 'block';
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

function downloadAudio() {
    downloadLink.click();
}

// ============================================================================
// KEYBOARD SHORTCUTS
// ============================================================================

function handleKeyboardShortcuts(event) {
    if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;

    if (event.key.match(/[0-9]/gi)) {
        audioElement.currentTime = (audioElement.duration / 100) * (parseInt(event.key) * 10);
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
            audioElement.currentTime += 2;
            break;
        case 'arrowleft':
            audioElement.currentTime -= 2;
            break;
        case 'arrowup':
            audioElement.volume = Math.min(audioElement.volume + 0.02, 1);
            handleVolumeKeyboardChange();
            break;
        case 'arrowdown':
            audioElement.volume = Math.max(audioElement.volume - 0.02, 0);
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

audioElement.addEventListener('ended', handleAudioEnded);
audioElement.addEventListener('play', playAudio);
audioElement.addEventListener('pause', pauseAudio);

// ============================================================================
// EVENT LISTENERS - CONTROLS
// ============================================================================

volumeSlider.addEventListener('input', handleVolumeChange);

speedButton.addEventListener('click', changePlaybackSpeed);
speedButton.addEventListener('wheel', handleSpeedWheel);
speedButton.addEventListener('touchstart', handleSpeedTouchStart, { passive: false });
speedButton.addEventListener('touchend', handleSpeedTouchEnd);

// ============================================================================
// EVENT LISTENERS - TIMELINE
// ============================================================================

durationBar.addEventListener('mousedown', (event) => {
    setupMouseDrag(moveEvent => updateAudioTime(getTimelinePosition(moveEvent.clientX).percentage));
});

durationBar.addEventListener('touchstart', (event) => {
    setupTouchDrag(moveEvent => updateAudioTime(getTimelinePosition(moveEvent.touches[0] && moveEvent.touches[0].clientX).percentage));
});

document.addEventListener('touchstart', () => {
    isTouchHoverActive = true;
    clearTimelineHover();
}, { passive: true });

durationBar.addEventListener('click', (event) => {
    updateAudioTime(getTimelinePosition(event.clientX).percentage);
});

durationBar.addEventListener('mousemove', (event) => {
    if (!isTouchHoverActive) showTimelineHover(event.clientX);
});

durationBar.addEventListener('mouseleave', () => {
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
    volumeSlider.value = audioElement.volume;
    updateVolumeBar();
    waitForAudioReady();
});

// ============================================================================
// INITIALIZATION CALL
// ============================================================================

initializeAudioPlayer();
setupMediaSession();

 

