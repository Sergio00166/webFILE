/* Code by Sergio00166 */

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const MOUSE_CONTROL_DELAY = 1500;
const TOUCH_CONTROL_DELAY = 2500;
const TIME_CHANGE_DELAY = 750;
const DOUBLE_TOUCH_DELAY = 400;
const ANIMATION_START_DELAY = 400;

// ============================================================================
// DOM ELEMENTS - CONTROLS
// ============================================================================

const volumeControl = document.querySelector('.volume');
const currentTimeDisplay = document.querySelector('.current-time');
const durationDisplay = document.querySelector('.duration');
const bufferDisplay = document.querySelector('.buffer');
const totalDurationDisplay = document.querySelector('.total-duration');
const timeContainerDisplay = document.querySelector('.time-container');
const currentDurationDisplay = document.querySelector('.current-duration');
const controlsContainer = document.querySelector('.controls');
const volumeSlider = document.getElementById('volume-bar');
const mainStateDisplay = document.querySelector('.main-state');
const hoverTimeDisplay = document.querySelector('.hover-time');
const hoverDurationDisplay = document.querySelector('.hover-duration');
const settingsMenu = document.querySelector('.setting-menu');
const settingsButton = document.getElementById('settings');
const menuButtonElements = document.querySelectorAll('.setting-menu li');
const loadingSpinner = document.querySelector('.custom-loader');

// ============================================================================
// DOM ELEMENTS - SELECTORS
// ============================================================================

const subtitleSelector = document.getElementById('s0');
const audioTracksSelector = document.getElementById('s1');
const playbackSpeedSelector = document.getElementById('s2');

// ============================================================================
// DOM ELEMENTS - ICONS & STATES
// ============================================================================

const volumeMuteIcon = document.querySelector('.volume img:nth-child(1)');
const volumeUnmuteIcon = document.querySelector('.volume img:nth-child(2)');
const playIcon = document.querySelector('.play-pause img:nth-child(1)');
const pauseIcon = document.querySelector('.play-pause img:nth-child(2)');
const mainStatePlayIcon = document.querySelector('.main-state img:nth-child(1)');
const mainStateVolumeIcon = document.querySelector('.vol_val_st');
const mainStatePauseIcon = document.querySelector('.main-state img:nth-child(2)');
const mainStateMuteIcon = document.querySelector('.main-state img:nth-child(3)');
const mainStateUnmuteIcon = document.querySelector('.main-state img:nth-child(4)');
const mainStateForwardIcon = document.querySelector('.main-state img:nth-child(5)');
const mainStateBackIcon = document.querySelector('.main-state img:nth-child(6)');
const volumeFullIcon = document.querySelector('.volume img:nth-child(2)');
const volumeLowIcon = document.querySelector('.volume img:nth-child(4)');
const volumeMediumIcon = document.querySelector('.volume img:nth-child(3)');
const volumeNoIcon = document.querySelector('.volume img:nth-child(5)');

// ============================================================================
// DOM ELEMENTS - NAVIGATION & MEDIA
// ============================================================================

const downloadListItem = document.getElementById('liD');
const previousLink = document.getElementById('prev');
const nextLink = document.getElementById('next');
const subtitleCanvas = document.querySelector('canvas');
const touchInteractionBox = document.getElementById('touch-box');
const videoElement = document.querySelector('video');
const videoContainerElement = document.querySelector('.video-container');
const playbackModeDisplay = document.getElementById('mode');
const downloadVideoLink = document.getElementById("download_video");
const downloadSubtitlesLink = document.getElementById("download_subs");

// ============================================================================
// STATE VARIABLES
// ============================================================================

let savedPlaybackSpeed = localStorage.getItem('videoSpeed');
let savedVolumeValue = localStorage.getItem('videoVolume');
let currentPlaybackMode = localStorage.getItem('videoMode');
let savedMutedState = localStorage.getItem('videoMuted');
let legacySubtitlesEnabled = localStorage.getItem('subsLegacy');

let pressTimer;
let assSubtitleWorker;
let settingsButtonPressed = false;
let isCursorOnControls = false;
let isMouseOnSelect = false;
let isPressing = false;
let pressHasTriggered = false;
let previousVideoTime = 0;
let touchInteractionActive;
let controlsHideTimeout;
let volumeHideTimeout;
let touchActionTimeout;
let cursorHideTimeout;
let selectedSubtitleIndex = 0;
let lastTouchTimestamp = 0;
let touchHoverActive = false;

// ============================================================================
// INITIALIZATION
// ============================================================================

function initializeVideoPlayer() {
    // Initialize volume
    if (savedVolumeValue === null) savedVolumeValue = 1;
    savedVolumeValue = parseFloat(savedVolumeValue);
    videoElement.volume = savedVolumeValue;

    // Initialize legacy subtitles
    if (legacySubtitlesEnabled != null) {
        if (legacySubtitlesEnabled == 'true') {
            legacySubtitlesEnabled = true;
            settingsButton.classList.add('lmbsl');
        } else {
            legacySubtitlesEnabled = false;
        }
    } else {
        legacySubtitlesEnabled = false;
    }

    // Initialize muted state
    if (savedMutedState != null) {
        videoElement.muted = (savedMutedState == 'true');
    } else {
        videoElement.muted = false;
    }

    updateVideoIcon();

    // Initialize subtitle selection
    for (let i = 0; i < subtitleSelector.options.length; i++) {
        if (subtitleSelector.options[i].text === localStorage.getItem('videoSubs')) {
            selectedSubtitleIndex = i;
            break;
        }
    }
    subtitleSelector.selectedIndex = selectedSubtitleIndex;
    selectedSubtitleIndex = selectedSubtitleIndex - 1;
    changeSubtitles(selectedSubtitleIndex);

    // Initialize playback speed
    if (savedPlaybackSpeed != null) {
        videoElement.playbackRate = parseFloat(savedPlaybackSpeed);
        for (let i = 0; i < playbackSpeedSelector.options.length; i++) {
            if (playbackSpeedSelector.options[i].value === savedPlaybackSpeed) {
                playbackSpeedSelector.selectedIndex = i;
                break;
            }
        }
    } else {
        playbackSpeedSelector.selectedIndex = 3;
    }

    // Initialize playback mode
    if (currentPlaybackMode != null) {
        currentPlaybackMode = parseInt(currentPlaybackMode);
        playbackModeDisplay.innerHTML = ['1', '»', '&orarr;'][currentPlaybackMode] || '1';
    } else {
        currentPlaybackMode = 0;
    }
}

function waitForVideoReady() {
    if (isNaN(videoElement.duration) || videoElement.duration === 0) {
        return setTimeout(waitForVideoReady, 25);
    }
    
    playVideo();
    if (videoElement.paused) pauseVideo();
    
    totalDurationDisplay.innerHTML = formatDuration(videoElement.duration);
    videoElement.ontimeupdate = updateProgressBar;
    videoElement.onended = handleVideoEnded;
    
    setupTimelineChapters();
    loadAudioTracks();
    fixVideoAspectRatio();
}

// ============================================================================
// SUBTITLE MANAGEMENT
// ============================================================================

async function createAssSubtitleWorker(subtitleUrl) {
    const response = await fetch(subtitleUrl);
    if (!response.ok) {
        alert('Cannot load subtitle [normal mode]');
        return;
    }
    
    return new JASSUB({
        video: videoElement,
        canvas: subtitleCanvas,
        subContent: await response.text(),
        workerUrl: '/?static=jassub/worker.js',
        wasmUrl: '/?static=jassub/worker.wasm',
        useLocalFonts: true,
        fallbackFont: 'liberation sans',
        availableFonts: {
            'liberation sans': '/?static=jassub/default.woff2'
        }
    });
}

function loadWebVttSubtitles(subtitleUrl) {
    const trackElement = document.createElement('track');
    trackElement.kind = 'subtitles';
    trackElement.src = subtitleUrl;
    trackElement.default = true;
    trackElement.onerror = () => {
        alert('Cannot load subtitle [legacy mode]');
    };
    
    videoElement.appendChild(trackElement);
    trackElement.mode = 'showing';
    
    // Firefox compatibility fix
    videoElement.textTracks[0].mode = 'showing';
}

async function changeSubtitles(subtitleIndex) {
    const existingTrack = videoElement.querySelector('track[kind="subtitles"]');
    subtitleCanvas.getContext('2d').clearRect(0, 0, subtitleCanvas.width, subtitleCanvas.height);
    
    if (assSubtitleWorker) {
        assSubtitleWorker.destroy();
    }
    
    if (existingTrack) {
        existingTrack.track.mode = 'disabled';
        existingTrack.remove();
    }
    
    if (subtitleIndex > -1) {
        const subtitleUrl = window.location.pathname + '?subs=' + subtitleIndex;
        if (legacySubtitlesEnabled) {
            loadWebVttSubtitles(subtitleUrl + 'legacy');
        } else {
            assSubtitleWorker = await createAssSubtitleWorker(subtitleUrl);
        }
    }
}

// ============================================================================
// VIDEO LAYOUT & ASPECT RATIO
// ============================================================================

function fixVideoAspectRatio() {
    if (videoElement.videoWidth <= 0 || videoElement.videoHeight <= 0) {
        setTimeout(fixVideoAspectRatio, 25);
    } else {
        if (videoElement.videoWidth < videoElement.videoHeight) {
            const videoContainerStyle = videoContainerElement.style;
            videoContainerStyle.marginTop = '0 !important';
            videoContainerStyle.paddingBottom = '0 !important';
        }
        scaleVideoToFit();
    }
}

function scaleVideoToFit() {
    const containerWidth = videoContainerElement.offsetWidth;
    const containerHeight = videoContainerElement.offsetHeight;
    const videoWidth = videoElement.videoWidth;
    const videoHeight = videoElement.videoHeight;
    const scale = Math.min(containerWidth / videoWidth, containerHeight / videoHeight);
    
    videoElement.style.width = (videoWidth * scale) + 'px';
    videoElement.style.height = (videoHeight * scale) + 'px';
}

// ============================================================================
// PLAYBACK CONTROL
// ============================================================================

function navigateToNext() {
    nextLink.click();
}

function navigateToPrevious() {
    previousLink.click();
}

function changePlaybackMode() {
    const playbackModes = ['1', '»', '&orarr;'];
    currentPlaybackMode = (currentPlaybackMode + 1) % 3;
    playbackModeDisplay.innerHTML = playbackModes[currentPlaybackMode];
    localStorage.setItem('videoMode', currentPlaybackMode);
}

function togglePlayPauseState() {
    videoElement.paused ? playVideo() : pauseVideo();
}

function playVideo() {
    videoElement.play().catch(() => {});
    pauseIcon.style.display = 'none';
    playIcon.style.display = 'block';
    showMainStateAnimation('play');
    hideControlsWithDelay(MOUSE_CONTROL_DELAY);
}

function pauseVideo() {
    videoElement.pause();
    controlsContainer.classList.add('show');
    showMainStateAnimation('pause');
    pauseIcon.style.display = 'block';
    playIcon.style.display = 'none';
    updateVideoIcon();
    
    if (videoElement.ended) {
        currentTimeDisplay.style.width = '100%';
    }
}

function handleVideoEnded() {
    if (currentPlaybackMode === 1) {
        navigateToNext();
    } else if (currentPlaybackMode === 2) {
        playVideo();
    } else {
        pauseVideo();
    }
}

// ============================================================================
// PROGRESS BAR & TIME DISPLAY
// ============================================================================

function updateProgressBar() {
    currentTimeDisplay.style.width = (videoElement.currentTime / videoElement.duration) * 100 + '%';
    currentDurationDisplay.innerHTML = formatDuration(videoElement.currentTime);
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
// VOLUME CONTROL
// ============================================================================

function toggleMuteState() {
    volumeSlider.classList.remove('show');
    videoElement.muted = !videoElement.muted;
    
    if (videoElement.muted) {
        updateVideoIcon();
        showMainStateAnimation('mute');
    } else {
        updateVideoIcon();
        showMainStateAnimation('unmute');
    }
    
    timeContainerDisplay.style.display = 'block';
    localStorage.setItem('videoMuted', videoElement.muted);
}

function saveVolumeToStorage() {
    localStorage.setItem('videoVolume', videoElement.volume.toString());
}

function updateVolumeSlider() {
    const volumePercent = volumeSlider.value * 100;
    volumeSlider.style.background = `linear-gradient(to right, #007aff ${volumePercent}%, #e1e1e1 ${volumePercent}%)`;
}

function handleVolumeChange(event) {
    videoElement.volume = event.target.value;
    updateVolumeSlider();
    saveVolumeToStorage();
    updateVideoIcon();
}

// ============================================================================
// CONTROLS VISIBILITY
// ============================================================================

function hideControlsWithDelay(delay) {
    clearTimeout(controlsHideTimeout);
    controlsHideTimeout = setTimeout(() => {
        if (!videoElement.paused) {
            if (isCursorOnControls) return;
            
            controlsContainer.classList.remove('show');
            settingsMenu.classList.remove('show');
            
            for (let i = 0; i < menuButtonElements.length; i++) {
                menuButtonElements[i].style.display = 'block';
            }
            
            document.activeElement.blur();
        }
    }, delay);
}

function showCursor() {
    clearTimeout(cursorHideTimeout);
    document.body.style.cursor = 'auto';
    
    if (!videoElement.paused) {
        cursorHideTimeout = setTimeout(function() {
            if (!videoElement.paused) {
                document.body.style.cursor = 'none';
            }
        }, MOUSE_CONTROL_DELAY);
    }
}

// ============================================================================
// FULLSCREEN & ORIENTATION
// ============================================================================

function toggleFullscreenMode() {
    if (!document.fullscreenElement) {
        videoContainerElement.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
}

videoContainerElement.addEventListener('fullscreenchange', () => {
    videoContainerElement.classList.toggle('fullscreen', document.fullscreenElement);
    
    if (videoElement.videoWidth >= videoElement.videoHeight) {
        screen.orientation.lock('landscape').catch(() => {});
    } else {
        screen.orientation.lock('portrait').catch(() => {});
    }
});

// ============================================================================
// TIMELINE & CHAPTERS
// ============================================================================

function getChapterNameAtTime(timeInSeconds) {
    for (let i = 0; i < chapters.length; i++) {
        if (timeInSeconds >= chapters[i].start_time) {
            try {
                if (timeInSeconds < chapters[i + 1].start_time) {
                    return chapters[i].title;
                }
            } catch {
                return chapters[i].title;
            }
        }
    }
}

function getTimelinePosition(clientX) {
    const { x, width, height } = durationDisplay.getBoundingClientRect();
    const position = Math.min(Math.max(0, clientX - x), width);
    return { 
        percentage: position / width, 
        position: position, 
        height: height 
    };
}

function updateVideoTime(percentage) {
    videoElement.currentTime = percentage * videoElement.duration;
    updateProgressBar();
}

function setupTimelineChapters() {
    const videoDuration = videoElement.duration;
    const chapterContainer = document.querySelector('.chapter-container');
    
    // Sort times and add the initial time (0 seconds)
    const chapterData = [...chapters.map(item => item.start_time), videoDuration];
    
    // Create sections within the div
    chapterData.slice(0, -1).forEach((time, index) => {
        const startPercent = Math.min((time / videoDuration) * 100, 100);
        const chapterSection = document.createElement('div');
        chapterSection.classList.add('chapter');
        chapterSection.style.left = `${startPercent}%`;
        chapterContainer.appendChild(chapterSection);
    });
}

// ============================================================================
// TIMELINE INTERACTION
// ============================================================================

function showTimelineHover(clientX) {
    const { percentage, position, height } = getTimelinePosition(clientX);
    hoverTimeDisplay.style.width = `${percentage * 100}%`;
    
    const hoverTime = percentage * videoElement.duration;
    const timeString = formatDuration(hoverTime);
    const chapterName = getChapterNameAtTime(hoverTime);
    
    hoverDurationDisplay.innerHTML = chapterName ? `${timeString}<br>${chapterName}` : timeString;
    hoverDurationDisplay.style.display = 'block';
    hoverDurationDisplay.style.bottom = `${height + 8}px`;
    
    const barRect = durationDisplay.getBoundingClientRect();
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
    hoverTimeDisplay.style.width = '0';
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
    document.addEventListener('touchend', endDrag, { once: true, passive: true });
}

// ============================================================================
// MAIN STATE ANIMATIONS
// ============================================================================

let animationTimeout;
function showMainStateAnimation(animationMode) {
    clearTimeout(animationTimeout);

    const allStateIcons = [
        mainStatePlayIcon, 
        mainStatePauseIcon, 
        mainStateMuteIcon, 
        mainStateUnmuteIcon, 
        mainStateBackIcon, 
        mainStateForwardIcon, 
        mainStateVolumeIcon
    ];
    
    allStateIcons.forEach(icon => icon.style.display = 'none');

    switch (animationMode) {
        case 'play':
            mainStatePlayIcon.style.display = 'block';
            mainStateDisplay.classList.add('show');
            break;
        case 'pause':
            mainStatePauseIcon.style.display = 'block';
            mainStateDisplay.classList.add('show');
            break;
        case 'mute':
            mainStateMuteIcon.style.display = 'block';
            mainStateDisplay.classList.add('show');
            break;
        case 'unmute':
            mainStateUnmuteIcon.style.display = 'block';
            mainStateDisplay.classList.add('show');
            break;
        case 'back':
            mainStateBackIcon.style.display = 'block';
            mainStateDisplay.classList.add('show');
            break;
        case 'fordward':
            mainStateForwardIcon.style.display = 'block';
            mainStateDisplay.classList.add('show');
            break;
        case 'show_vol':
            mainStateVolumeIcon.innerText = Math.round(videoElement.volume * 100) + '%';
            mainStateVolumeIcon.style.display = 'block';
            mainStateDisplay.classList.add('show');
            break;
        default:
            mainStateDisplay.classList.remove('show');
            return;
    }
    
    animationTimeout = setTimeout(showMainStateAnimation, 400);
}

// ============================================================================
// VIDEO ICON MANAGEMENT
// ============================================================================

function updateVideoIcon() {
    if (!videoElement.muted) {
        if (videoElement.volume == 0.0) {
            volumeMuteIcon.style.display = 'none';
            volumeFullIcon.style.display = 'none';
            volumeMediumIcon.style.display = 'none';
            volumeLowIcon.style.display = 'none';
            volumeNoIcon.style.display = 'block';
        } else if (videoElement.volume > 0.67) {
            volumeMuteIcon.style.display = 'none';
            volumeFullIcon.style.display = 'block';
            volumeMediumIcon.style.display = 'none';
            volumeLowIcon.style.display = 'none';
            volumeNoIcon.style.display = 'none';
        } else if (videoElement.volume > 0.33) {
            volumeMuteIcon.style.display = 'none';
            volumeFullIcon.style.display = 'none';
            volumeMediumIcon.style.display = 'block';
            volumeLowIcon.style.display = 'none';
            volumeNoIcon.style.display = 'none';
        } else if (videoElement.volume > 0) {
            volumeMuteIcon.style.display = 'none';
            volumeFullIcon.style.display = 'none';
            volumeMediumIcon.style.display = 'none';
            volumeLowIcon.style.display = 'block';
            volumeNoIcon.style.display = 'none';
        }
    } else {
        volumeMuteIcon.style.display = 'block';
        volumeFullIcon.style.display = 'none';
        volumeMediumIcon.style.display = 'none';
        volumeLowIcon.style.display = 'none';
        volumeNoIcon.style.display = 'none';
    }
}

// ============================================================================
// AUDIO TRACKS MANAGEMENT
// ============================================================================

function loadAudioTracks() {
    try {
        const savedAudioTrack = localStorage.getItem('videoAudio');
        const audioTracks = videoElement.audioTracks;
        
        for (let i = 0; i < audioTracks.length; i++) {
            const track = audioTracks[i];
            const option = document.createElement('option');
            option.value = i;
            
            const trackName = (track.label || track.language || 'Track ' + (i + 1));
            option.textContent = trackName;
            audioTracksSelector.appendChild(option);
            
            if (trackName === savedAudioTrack) {
                audioTracksSelector.selectedIndex = i;
                changeAudioTrack(i);
            } else {
                audioTracksSelector.selectedIndex = 0;
            }
        }
    } catch (error) {
        // Audio tracks not supported
    }
}

function changeAudioTrack(selectedIndex) {
    if (!isNaN(selectedIndex)) {
        previousVideoTime = videoElement.currentTime;
        
        for (let i = 0; i < videoElement.audioTracks.length; i++) {
            videoElement.audioTracks[i].enabled = (i === selectedIndex);
        }
        
        videoElement.currentTime = previousVideoTime;
    }
}

// ============================================================================
// TOUCH INTERACTIONS
// ============================================================================

function handleDoubleTouch(event) {
    event.preventDefault();
    clearTimeout(touchActionTimeout);
    
    if (touchInteractionActive) {
        touchInteractionActive = false;
        return;
    }

    const now = Date.now();
    const touchInterval = now - lastTouchTimestamp;
    const touchBoxRect = touchInteractionBox.getBoundingClientRect();

    if (touchInterval < DOUBLE_TOUCH_DELAY) {
        const touchX = event.changedTouches[0].clientX;
        const centerX = touchBoxRect.left + (touchBoxRect.width / 2);
        const isLeftSide = touchX < centerX;

        if (isLeftSide) {
            videoElement.currentTime -= 5;
            showMainStateAnimation('back');
        } else {
            videoElement.currentTime += 5;
            showMainStateAnimation('fordward');
        }
        
        updateProgressBar();
        controlsContainer.classList.add('show');
        hideControlsWithDelay(TIME_CHANGE_DELAY);
    } else {
        touchActionTimeout = setTimeout(togglePlayPauseState, ANIMATION_START_DELAY);
    }
    
    lastTouchTimestamp = now;
}

// ============================================================================
// LEGACY SUBTITLE TOGGLE
// ============================================================================

async function toggleLegacySubtitles() {
    settingsButtonPressed = true;
    
    if (settingsButton.classList.contains('lmbsl')) {
        legacySubtitlesEnabled = false;
        settingsButton.classList.remove('lmbsl');
    } else {
        legacySubtitlesEnabled = true;
        settingsButton.classList.add('lmbsl');
    }
    
    localStorage.setItem('subsLegacy', legacySubtitlesEnabled);
    await changeSubtitles(selectedSubtitleIndex);
}

function startPressTimer() {
    if (isPressing || pressHasTriggered) return;
    
    isPressing = true;
    pressTimer = setTimeout(() => {
        toggleLegacySubtitles();
        pressHasTriggered = true;
    }, 600);
}

function cancelPressTimer() {
    clearTimeout(pressTimer);
    pressTimer = null;
    isPressing = false;
    pressHasTriggered = false;
}

// ============================================================================
// SETTINGS MENU
// ============================================================================

function toggleSettingsMenu() {
    if (settingsButtonPressed) {
        settingsButtonPressed = false;
    } else {
        settingsMenu.classList.toggle('show');
        isCursorOnControls = !isCursorOnControls;
    }
}

// ============================================================================
// KEYBOARD HELPERS
// ============================================================================

function handleVolumeKeyboardChange() {
    volumeSlider.value = videoElement.volume;
    updateVolumeSlider();
    updateVideoIcon();
    saveVolumeToStorage();
    showMainStateAnimation('show_vol');
}

function handleTimeChangeKeyboard(mode) {
    controlsContainer.classList.add('show');
    hideControlsWithDelay(TIME_CHANGE_DELAY);
    updateProgressBar();
    showMainStateAnimation(mode);
}

// ============================================================================
// EVENT LISTENERS - WINDOW & VIDEO
// ============================================================================

window.addEventListener('pageshow', () => {
    volumeSlider.value = videoElement.volume;
    updateVolumeSlider();
    waitForVideoReady();
});

window.addEventListener('resize', scaleVideoToFit);
window.addEventListener('fullscreenchange', scaleVideoToFit);

videoElement.addEventListener('play', playVideo);
videoElement.addEventListener('pause', pauseVideo);
videoElement.addEventListener('waiting', () => {
    loadingSpinner.style.display = 'block';
});
videoElement.addEventListener('playing', () => {
    loadingSpinner.style.display = 'none';
});

// ============================================================================
// EVENT LISTENERS - VIDEO CONTAINER
// ============================================================================

videoContainerElement.addEventListener('mouseleave', () => {
    clearTimeout(cursorHideTimeout);
    document.body.style.cursor = 'auto';
    hideControlsWithDelay(50);
});

videoContainerElement.addEventListener('mousemove', (event) => {
    controlsContainer.classList.add('show');
    showCursor();
    hideControlsWithDelay(MOUSE_CONTROL_DELAY);
});

videoContainerElement.addEventListener('focusin', (event) => {
    controlsContainer.classList.add('show');
    hideControlsWithDelay(MOUSE_CONTROL_DELAY);
});

videoContainerElement.addEventListener('touchmove', () => {
    touchInteractionActive = true;
    controlsContainer.classList.add('show');
    hideControlsWithDelay(TOUCH_CONTROL_DELAY);
}, { passive: false });

// ============================================================================
// EVENT LISTENERS - CONTROLS
// ============================================================================

controlsContainer.addEventListener('click', () => {
    controlsContainer.classList.add('show');
    showCursor();
    hideControlsWithDelay(MOUSE_CONTROL_DELAY);
});

// ============================================================================
// EVENT LISTENERS - VOLUME
// ============================================================================

volumeControl.addEventListener('mouseenter', () => {
    clearTimeout(volumeHideTimeout);
    if (!videoElement.muted) {
        timeContainerDisplay.style.display = 'none';
    }
    videoElement.muted ? volumeSlider.classList.remove('show') : volumeSlider.classList.add('show');
});

volumeControl.addEventListener('mouseleave', () => {
    clearTimeout(volumeHideTimeout);
    volumeSlider.classList.remove('show');
    volumeHideTimeout = setTimeout(() => {
        timeContainerDisplay.style.display = 'block';
    }, 100);
});

volumeSlider.addEventListener('input', (event) => {
    handleVolumeChange(event);
});

// ============================================================================
// EVENT LISTENERS - SETTINGS
// ============================================================================

settingsButton.addEventListener('click', (event) => {
    if (settingsButtonPressed) {
        event.preventDefault();
        settingsButtonPressed = false;
    } else {
        toggleSettingsMenu();
    }
});

settingsButton.addEventListener('touchend', (event) => {
    if (settingsButtonPressed) {
        event.preventDefault();
        settingsButtonPressed = false;
    }
    toggleSettingsMenu();
});

// Mouse events for legacy subtitle toggle
settingsButton.addEventListener('mousedown', (event) => {
    event.preventDefault();
    startPressTimer();
});

settingsButton.addEventListener('mouseup', cancelPressTimer);
settingsButton.addEventListener('mouseleave', cancelPressTimer);

// Touch events for legacy subtitle toggle
settingsButton.addEventListener('touchstart', (event) => {
    event.preventDefault();
    startPressTimer();
}, { passive: false });

settingsButton.addEventListener('touchend', cancelPressTimer);
settingsButton.addEventListener('touchcancel', cancelPressTimer);

// ============================================================================
// EVENT LISTENERS - TRACK SELECTION
// ============================================================================

audioTracksSelector.addEventListener('change', function() {
    const selectedIndex = parseInt(this.value, 10);
    changeAudioTrack(selectedIndex);
    const trackText = audioTracksSelector[selectedIndex].text;
    localStorage.setItem('videoAudio', trackText);
    toggleSettingsMenu();
});

subtitleSelector.addEventListener('change', async function() {
    selectedSubtitleIndex = parseInt(this.value);
    
    if (selectedSubtitleIndex == -1) {
        localStorage.removeItem('videoSubs');
    } else {
        const subtitleText = subtitleSelector.options[selectedSubtitleIndex + 1].text;
        localStorage.setItem('videoSubs', subtitleText);
    }
    
    await changeSubtitles(selectedSubtitleIndex);
    toggleSettingsMenu();
});

playbackSpeedSelector.addEventListener('change', function() {
    videoElement.playbackRate = parseFloat(this.value);
    localStorage.setItem('videoSpeed', videoElement.playbackRate);
    toggleSettingsMenu();
});

// ============================================================================
// EVENT LISTENERS - TOUCH INTERACTION
// ============================================================================

touchInteractionBox.addEventListener('touchend', handleDoubleTouch);
touchInteractionBox.addEventListener('click', (event) => {
    event.preventDefault();
    togglePlayPauseState();
    showCursor();
});

// ============================================================================
// EVENT LISTENERS - SELECT ELEMENTS
// ============================================================================

[subtitleSelector, audioTracksSelector, playbackSpeedSelector].forEach(selectElement => {
    selectElement.addEventListener('mouseenter', () => {
        isMouseOnSelect = true;
        selectElement.parentElement.style.outline = "none";
    });
    
    selectElement.addEventListener('mouseleave', () => {
        isMouseOnSelect = false;
    });
    
    selectElement.addEventListener('focus', () => {
        if (isMouseOnSelect) return;
        selectElement.parentElement.style = "";
    });
});

// ============================================================================
// EVENT LISTENERS - DOWNLOAD
// ============================================================================

downloadListItem.addEventListener("click", () => {
    const subtitlesHref = downloadSubtitlesLink.href;
    
    if (!subtitlesHref || subtitlesHref !== "#") {
        alert("The video has external subtitles (.mks) it may need to be combined with the video manually");
        downloadSubtitlesLink.click();
    }
    
    downloadVideoLink.click();
    setTimeout(toggleSettingsMenu, 100);
});

downloadListItem.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        downloadListItem.click();
    }
});

// ============================================================================
// EVENT LISTENERS - TIMELINE
// ============================================================================

durationDisplay.addEventListener('mousedown', (event) => {
    setupMouseDrag(moveEvent => updateVideoTime(getTimelinePosition(moveEvent.clientX).percentage));
});

durationDisplay.addEventListener('touchstart', (event) => {
    setupTouchDrag(moveEvent => updateVideoTime(getTimelinePosition(moveEvent.touches[0] && moveEvent.touches[0].clientX).percentage));
});

document.addEventListener('touchstart', () => {
    touchHoverActive = true;
    clearTimelineHover();
}, { passive: true });

durationDisplay.addEventListener('mousemove', (event) => {
    if (!touchHoverActive) showTimelineHover(event.clientX);
});

durationDisplay.addEventListener('mouseleave', () => {
    touchHoverActive = false;
    clearTimelineHover();
});

durationDisplay.addEventListener('click', (event) => {
    updateVideoTime(getTimelinePosition(event.clientX).percentage);
});

// ============================================================================
// EVENT LISTENERS - KEYBOARD
// ============================================================================

document.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    
    if (event.key.match(/[0-9]/gi)) {
        videoElement.currentTime = (videoElement.duration / 100) * (parseInt(event.key) * 10);
        currentTimeDisplay.style.width = parseInt(event.key) * 10 + '%';
        return;
    }
    
    switch (event.key.toLowerCase()) {
        case ' ':
            if (document.activeElement === document.body) {
                event.preventDefault();
                if (event.repeat) break;
                videoElement.paused ? playVideo() : pauseVideo();
            }
            break;
        case 'arrowright':
            videoElement.currentTime += 2;
            handleTimeChangeKeyboard('fordward');
            break;
        case 'arrowleft':
            videoElement.currentTime -= 2;
            handleTimeChangeKeyboard('back');
            break;
        case 'arrowup':
            videoElement.volume = Math.min(videoElement.volume + 0.02, 1);
            handleVolumeKeyboardChange();
            break;
        case 'arrowdown':
            videoElement.volume = Math.max(videoElement.volume - 0.02, 0);
            handleVolumeKeyboardChange();
            break;
        case 'f':
            toggleFullscreenMode();
            break;
        case 'p':
            navigateToPrevious();
            break;
        case 'n':
            navigateToNext();
            break;
        case 'l':
            changePlaybackMode();
            break;
        case 'm':
            toggleMuteState();
            break;
        default:
            break;
    }
});

// ============================================================================
// INITIALIZATION CALL
// ============================================================================

initializeVideoPlayer();

 
