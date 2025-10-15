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

const volumeControl = document.getElementById('volume');
const progress = document.getElementById('progress');
const seekBar = document.getElementById('seek-bar');
const totalTime = document.getElementById('total-time');
const currentTime = document.getElementById('current-time');
const controlsContainer = document.getElementById('controls');
const volumeSlider = document.getElementById('volume-bar');
const mainState = document.getElementById('main-state');
const hoverTime = document.getElementById('hover-time');
const hoverInfo = document.getElementById('hover-info');
const settingsButton = document.getElementById('settings');
const loadingSpinner = document.getElementById('custom-loader');

// ============================================================================
// DOM ELEMENTS - MENU
// ============================================================================

const subtitleSelector = document.querySelector('#subsMenu select');
const audioTracksSelector = document.querySelector('#audioMenu select');
const playbackSpeedSelector = document.querySelector('#speedMenu select');
const settingsMenu = document.getElementById('setting-menu');
const downloadButton = document.getElementById('download');

// ============================================================================
// DOM ELEMENTS - ICONS & STATES
// ============================================================================

const playIcons = Array.from(
    document.querySelectorAll('#play-pause img')
);
const fullscreenIcons = Array.from(
    document.querySelectorAll('#screenToggle img')
);
const mainStateIcons = Array.from(
    mainState.querySelectorAll('img')
);
const volumeIcons = Array.from(
    volume.querySelectorAll('img')
);
const mainStateVolume = document.querySelector('#state_volume');

// ============================================================================
// DOM ELEMENTS - NAVIGATION & MEDIA
// ============================================================================

const previousLink = document.getElementById('prev');
const nextLink = document.getElementById('next');
const subtitleCanvas = document.querySelector('canvas');
// Using controls background instead of separate touch box
const video = document.querySelector('video');
const videoContainer = document.getElementById('video-container');
const playbackMode = document.getElementById('mode');
const downloadVideoLink = document.getElementById("download_video");
const downloadSubtitlesLink = document.getElementById("download_subs");
const chapterContainer = document.getElementById('chapter-container');

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
    if (savedVolumeValue === null) savedVolumeValue = 1;
    savedVolumeValue = parseFloat(savedVolumeValue);
    video.volume = savedVolumeValue;

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
    if (savedMutedState != null) {
        video.muted = (savedMutedState == 'true');
    } else {
        video.muted = false;
    }
    updateVolumeIcon();

    for (let i = 0; i < subtitleSelector.options.length; i++) {
        if (subtitleSelector.options[i].text === localStorage.getItem('videoSubs')) {
            selectedSubtitleIndex = i;
            break;
        }
    }
    subtitleSelector.selectedIndex = selectedSubtitleIndex;
    selectedSubtitleIndex = selectedSubtitleIndex - 1;
    changeSubtitles(selectedSubtitleIndex);

    if (savedPlaybackSpeed != null) {
        video.playbackRate = parseFloat(savedPlaybackSpeed);
        for (let i = 0; i < playbackSpeedSelector.options.length; i++) {
            if (playbackSpeedSelector.options[i].value === savedPlaybackSpeed) {
                playbackSpeedSelector.selectedIndex = i;
                break;
            }
        }
    } else {
        playbackSpeedSelector.selectedIndex = 3;
    }
    if (currentPlaybackMode != null) {
        currentPlaybackMode = parseInt(currentPlaybackMode);
        playbackMode.innerHTML = ['1', '»', '&orarr;'][currentPlaybackMode] || '1';
    } else {
        currentPlaybackMode = 0;
    }
}

function waitForVideoReady() {
    if (isNaN(video.duration) || video.duration === 0) {
        return setTimeout(waitForVideoReady, 25);
    }
    playVideo();
    if (video.paused) pauseVideo();

    totalTime.innerHTML = formatDuration(video.duration);
    video.ontimeupdate = updateProgressBar;
    video.onended = handleVideoEnded;

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
        video: video,
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
    trackElement.onerror = ()=>{
        alert('Cannot load subtitle [legacy mode]');
    };
    video.appendChild(trackElement);
    trackElement.mode = 'showing';
    // Firefox compatibility fix
    video.textTracks[0].mode = 'showing';
}

async function changeSubtitles(subtitleIndex) {
    const existingTrack = video.querySelector('track[kind="subtitles"]');
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
    if (video.videoWidth <= 0 || video.videoHeight <= 0) {
        setTimeout(fixVideoAspectRatio, 25);
    } else {
        if (video.videoWidth < video.videoHeight) {
            const videoContainerStyle = videoContainer.style;
            videoContainerStyle.marginTop = '0 !important';
            videoContainerStyle.paddingBottom = '0 !important';
        }
        scaleVideoToFit();
    }
}

function scaleVideoToFit() {
    const containerWidth = videoContainer.offsetWidth;
    const containerHeight = videoContainer.offsetHeight;
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    const scale = Math.min(containerWidth / videoWidth, containerHeight / videoHeight);

    video.style.width = (videoWidth * scale) + 'px';
    video.style.height = (videoHeight * scale) + 'px';
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
    playbackMode.innerHTML = playbackModes[currentPlaybackMode];
    localStorage.setItem('videoMode', currentPlaybackMode);
}

function togglePlayPauseState() {
    if (video.paused) {
        playVideo();
    } else {
        pauseVideo();
    }
}

function playVideo() {
    video.play().catch(()=>{});
    playIcons [0].style.display = 'none';
    playIcons [1].style.display = 'block';
    showMainStateAnimation('play');
    hideControlsWithDelay(MOUSE_CONTROL_DELAY);
}

function pauseVideo() {
    video.pause();
    controlsContainer.classList.add('show');
    showMainStateAnimation('pause');
    playIcons [0].style.display = 'block';
    playIcons [1].style.display = 'none';
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
    progress.style.width = (video.currentTime / video.duration) * 100 + '%';
    currentTime.innerHTML = formatDuration(video.currentTime);
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
    video.muted = !video.muted;

    if (video.muted) {
        updateVolumeIcon();
        showMainStateAnimation('mute');
    } else {
        updateVolumeIcon();
        showMainStateAnimation('unmute');
    }
    localStorage.setItem('videoMuted', video.muted);
}

function saveVolumeToStorage() {
    localStorage.setItem('videoVolume', video.volume.toString());
}

function updateVolumeSlider() {
    const volumePercent = volumeSlider.value * 100;
    volumeSlider.style.background = `linear-gradient(to right, #007aff ${volumePercent}%, #e1e1e1 ${volumePercent}%)`;
}

function handleVolumeChange(event) {
    video.volume = event.target.value;
    updateVolumeSlider();
    saveVolumeToStorage();
    updateVolumeIcon();
}

// ============================================================================
// CONTROLS VISIBILITY
// ============================================================================

function hideControlsWithDelay(delay) {
    clearTimeout(controlsHideTimeout);
    controlsHideTimeout = setTimeout(()=>{
        if (!video.paused) {
            if (isCursorOnControls) return;
            controlsContainer.classList.remove('show');
            settingsMenu.classList.remove('show');
            document.activeElement.blur();

            subsMenu.style.display  = 'block';
            audioMenu.style.display = 'block';
            speedMenu.style.display = 'block';
            download.style.display  = 'block';
        }
    }, delay);
}

function showCursor() {
    clearTimeout(cursorHideTimeout);
    document.body.style.cursor = 'auto';

    if (!video.paused) {
        cursorHideTimeout = setTimeout(()=>{
            if (!video.paused) {
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
        videoContainer.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
}

videoContainer.addEventListener('fullscreenchange', ()=>{
    if (document.fullscreenElement) {
        fullscreenIcons[0].style.display = 'none';
        fullscreenIcons[1].style.display = 'block';
    } else {
        fullscreenIcons[0].style.display = 'block';
        fullscreenIcons[1].style.display = 'none';
    }
    if (video.videoWidth >= video.videoHeight) {
        screen.orientation.lock('landscape').catch(()=>{});
    } else {
        screen.orientation.lock('portrait').catch(()=>{});
    }
});

// ============================================================================
// TIMELINE & CHAPTERS
// ============================================================================

function getChapterNameAtTime(timeInSeconds) {
    for (let i = 0; i < chapters.length; i++) {
        const current = chapters[i];
        const next = chapters[i + 1];

        const hasStarted = timeInSeconds >= current.start_time;
        const beforeNext = !next || timeInSeconds < next.start_time;
        if (hasStarted && beforeNext) return current.title;
    }
}

function getTimelinePosition(clientX) {
    const { x, width, height } = seekBar.getBoundingClientRect();
    const position = Math.min(Math.max(0, clientX - x), width);
    return {
        percentage: position / width,
        position: position,
        height: height
    };
}

function updateVideoTime(percentage) {
    video.currentTime = percentage * video.duration;
    updateProgressBar();
}

function setupTimelineChapters() {
    const videoDuration = video.duration;
    const chapterData = [...chapters.map(item => item.start_time), videoDuration];

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
    hoverTime.style.width = `${percentage * 100}%`;

    const time = percentage * video.duration;
    const timeString = formatDuration(time);
    const chapterName = getChapterNameAtTime(time);

    if (chapterName) {
        hoverInfo.innerHTML = `${timeString}<br>${chapterName}`;
    } else {
        hoverInfo.innerHTML = timeString;
    }
    hoverInfo.style.display = 'block';
    hoverInfo.style.bottom = `${height + 8}px`;

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
    document.addEventListener('touchend', endDrag, { once: true, passive: true });
}

// ============================================================================
// MAIN STATE ANIMATIONS
// ============================================================================

const animationMap = {
    play: 0, pause: 1, mute: 2,
    unmute: 3, back: 4, fordward: 5
};
let animationTimeout;

function showMainStateAnimation(animationMode) {
    clearTimeout(animationTimeout);
    mainStateIcons.forEach(icon => icon.style.display = 'none');
    mainStateVolume.style.display = 'none';

    if (animationMode === 'show_vol') {
        mainStateVolume.innerText = Math.round(video.volume * 100) + '%';
        mainStateVolume.style.display = 'block';
        mainState.classList.add('show');
    } else {
        const idx = animationMap[animationMode];
        if (idx !== undefined) {
            mainStateIcons[idx].style.display = 'block';
            mainState.classList.add('show');
        } else {
            mainState.classList.remove('show');
            return;
        }
    }
    animationTimeout = setTimeout(showMainStateAnimation, 400);
}

// ============================================================================
// VIDEO ICON MANAGEMENT
// ============================================================================

function updateVolumeIcon() {
    let index;
    if (video.muted) {
        index = 0; // mute
    } else if (video.volume === 0) {
        index = 4; // no volume
    } else if (video.volume > 0.67) {
        index = 1; // full
    } else if (video.volume > 0.33) {
        index = 2; // medium
    } else {
        index = 3; // low
    }
    for (let i = 0; i < volumeIcons.length; i++) {
        if (i === index) {
            volumeIcons[i].style.display = 'block';
        } else {
            volumeIcons[i].style.display = 'none';
        }
    }
}

// ============================================================================
// AUDIO TRACKS MANAGEMENT
// ============================================================================

function loadAudioTracks() {
    const savedAudioTrack = localStorage.getItem('videoAudio');
    const audioTracks = video.audioTracks;
    if (!audioTracks) return;

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
}

function changeAudioTrack(selectedIndex) {
    const tracks = video.audioTracks;
    if (!tracks || !selectedIndex) return;

    previousVideoTime = video.currentTime;
    for (let i = 0; i < tracks.length; i++) {
        video.audioTracks[i].enabled = (i === selectedIndex);
    }
    video.currentTime = previousVideoTime;
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
    const touchBoxRect = controlsContainer.getBoundingClientRect();

    if (touchInterval < DOUBLE_TOUCH_DELAY) {
        const touchX = event.changedTouches[0].clientX;
        const centerX = touchBoxRect.left + (touchBoxRect.width / 2);
        const isLeftSide = touchX < centerX;

        if (isLeftSide) {
            video.currentTime -= 5;
            showMainStateAnimation('back');
        } else {
            video.currentTime += 5;
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
    pressTimer = setTimeout(()=>{
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
    volumeSlider.value = video.volume;
    updateVolumeSlider();
    updateVolumeIcon();
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

window.addEventListener('pageshow', ()=>{
    volumeSlider.value = video.volume;
    updateVolumeSlider();
    waitForVideoReady();
});

window.addEventListener('resize', scaleVideoToFit);
window.addEventListener('fullscreenchange', scaleVideoToFit);

video.addEventListener('play', playVideo);
video.addEventListener('pause', pauseVideo);
video.addEventListener('waiting', ()=>{
    loadingSpinner.style.display = 'block';
});
video.addEventListener('playing', ()=>{
    loadingSpinner.style.display = 'none';
});

// ============================================================================
// EVENT LISTENERS - SHOW/HIDE CONTROLS
// ============================================================================

videoContainer.addEventListener('mouseleave', ()=>{
    clearTimeout(cursorHideTimeout);
    document.body.style.cursor = 'auto';
    hideControlsWithDelay(50);
});

function showControls(delay, cursor=false) {
    if (cursor) showCursor();
    controlsContainer.classList.add('show');
    hideControlsWithDelay(delay);
}

videoContainer.addEventListener('touchmove', ()=>{
    touchInteractionActive = true;
    showControls(TOUCH_CONTROL_DELAY);
}, { passive: false });

controlsContainer.addEventListener('touchend', event => {
    if (event.target === controlsContainer) {
        handleDoubleTouch(event);
    } else {
        showControls(TOUCH_CONTROL_DELAY);
    }
}, { passive: false });

controlsContainer.addEventListener('click', event => {
    if (event.target === controlsContainer) {
        togglePlayPauseState();
    }
    showControls(MOUSE_CONTROL_DELAY,true);
});

videoContainer.addEventListener('mousemove', event => {
    showControls(MOUSE_CONTROL_DELAY,true);
});
videoContainer.addEventListener('focusin', event => {
    showControls(MOUSE_CONTROL_DELAY);
});

// ============================================================================
// EVENT LISTENERS - VOLUME
// ============================================================================

volumeControl.addEventListener('mouseenter', ()=>{
    clearTimeout(volumeHideTimeout);
    if (video.muted) {
        volumeSlider.classList.remove('show');
    } else {
        volumeSlider.classList.add('show');
    }
});

volumeControl.addEventListener('mouseleave', ()=>{
    clearTimeout(volumeHideTimeout);
    volumeSlider.classList.remove('show');
});

volumeSlider.addEventListener('input', handleVolumeChange);
volumeSlider.addEventListener('keydown', e => e.preventDefault());

// ============================================================================
// EVENT LISTENERS - SETTINGS
// ============================================================================

settingsButton.addEventListener('click', event => {
    if (settingsButtonPressed) {
        event.preventDefault();
        settingsButtonPressed = false;
    } else {
        toggleSettingsMenu();
    }
});

settingsButton.addEventListener('touchend', event => {
    if (settingsButtonPressed) {
        event.preventDefault();
        settingsButtonPressed = false;
    }
    toggleSettingsMenu();
});

// Mouse events for legacy subtitle toggle
settingsButton.addEventListener('mousedown', event => {
    event.preventDefault();
    startPressTimer();
});

settingsButton.addEventListener('mouseup', cancelPressTimer);
settingsButton.addEventListener('mouseleave', cancelPressTimer);

// Touch events for legacy subtitle toggle
settingsButton.addEventListener('touchstart', event => {
    event.preventDefault();
    startPressTimer();
}, { passive: false });

settingsButton.addEventListener('touchend', cancelPressTimer);
settingsButton.addEventListener('touchcancel', cancelPressTimer);

// ============================================================================
// EVENT LISTENERS - TRACK SELECTION
// ============================================================================

audioTracksSelector.addEventListener('change', event => {
    const selectedIndex = parseInt(event.target.value, 10);
    changeAudioTrack(selectedIndex);
    const trackText = audioTracksSelector[selectedIndex].text;
    localStorage.setItem('videoAudio', trackText);
    toggleSettingsMenu();
});

subtitleSelector.addEventListener('change', async event => {
    selectedSubtitleIndex = parseInt(event.target.value);

    if (selectedSubtitleIndex == -1) {
        localStorage.removeItem('videoSubs');
    } else {
        const subtitleText = subtitleSelector.options[selectedSubtitleIndex + 1].text;
        localStorage.setItem('videoSubs', subtitleText);
    }
    await changeSubtitles(selectedSubtitleIndex);
    toggleSettingsMenu();
});

playbackSpeedSelector.addEventListener('change', event => {
    video.playbackRate = parseFloat(event.target.value);
    localStorage.setItem('videoSpeed', video.playbackRate);
    toggleSettingsMenu();
});

// ============================================================================
// EVENT LISTENERS - SELECT ELEMENTS
// ============================================================================

[subtitleSelector, audioTracksSelector, playbackSpeedSelector]
.forEach(selectElement => {
    selectElement.addEventListener('mouseenter', ()=>{
        isMouseOnSelect = true;
        selectElement.parentElement.style.outline = "none";
    });
    selectElement.addEventListener('mouseleave', ()=>{
        isMouseOnSelect = false;
    });
    selectElement.addEventListener('focus', ()=>{
        if (isMouseOnSelect) return;
        selectElement.parentElement.style = "";
    });
});

// ============================================================================
// EVENT LISTENERS - DOWNLOAD
// ============================================================================

downloadButton.addEventListener("click", ()=>{
    const subtitlesHref = downloadSubtitlesLink.href;

    if (!subtitlesHref || subtitlesHref !== "#") {
        alert("The video has external subtitles (.mks) it may need to be combined with the video manually");
        downloadSubtitlesLink.click();
    }
    downloadVideoLink.click();
    setTimeout(toggleSettingsMenu, 100);
});

downloadButton.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        downloadButton.click();
    }
});

// ============================================================================
// EVENT LISTENERS - TIMELINE
// ============================================================================

seekBar.addEventListener('mousedown', event => {
    setupMouseDrag(moveEvent => updateVideoTime(getTimelinePosition(moveEvent.clientX).percentage));
});

seekBar.addEventListener('touchstart', event => {
    setupTouchDrag(moveEvent => updateVideoTime(
        getTimelinePosition(moveEvent.touches[0] && moveEvent.touches[0].clientX).percentage)
    );
});

document.addEventListener('touchstart', ()=>{
    touchHoverActive = true;
    clearTimelineHover();
},{ passive: true });

seekBar.addEventListener('mousemove', event => {
    if (!touchHoverActive) showTimelineHover(event.clientX);
});

seekBar.addEventListener('mouseleave', ()=>{
    touchHoverActive = false;
    clearTimelineHover();
});

seekBar.addEventListener('click', event => {
    updateVideoTime(getTimelinePosition(event.clientX).percentage);
});

// ============================================================================
// EVENT LISTENERS - KEYBOARD
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
        video.currentTime = (video.duration / 100) * (parseInt(event.key) * 10);
        progress.style.width = parseInt(event.key) * 10 + '%';
        return;
    }
    switch (event.key.toLowerCase()) {
        case ' ':
            if (document.activeElement === document.body) {
                event.preventDefault();
                if (event.repeat) break;
                if (video.paused) playVideo();
                else pauseVideo();
            }
            break;
        case 'arrowright':
            video.currentTime += 2;
            handleTimeChangeKeyboard('fordward');
            break;
        case 'arrowleft':
            video.currentTime -= 2;
            handleTimeChangeKeyboard('back');
            break;
        case 'arrowup':
            video.volume = Math.min(video.volume + 0.02, 1);
            handleVolumeKeyboardChange();
            break;
        case 'arrowdown':
            video.volume = Math.max(video.volume - 0.02, 0);
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

 
