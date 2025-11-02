/* Code by Sergio00166 */

const minmax = (val, low, top) => Math.min(Math.max(val, low), top);

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

const settingsMenu = document.getElementById('setting-menu');
const mainMenu = document.getElementById('main-menu');
const subsSubmenu = document.getElementById('subs-submenu');
const audioSubmenu = document.getElementById('audio-submenu');
const speedSubmenu = document.getElementById('speed-submenu');
const menuLegacyText = document.getElementById('menuLegacyText');
const menuSubsText = document.getElementById('menuSubsText');
const menuSpeedText = document.getElementById('menuSpeedText');
const menuAudioText = document.getElementById('menuAudioText');

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
const video = document.querySelector('video');
const videoContainer = document.getElementById('video-container');
const modeBtn = document.getElementById('mode');
const downloadVideoLink = document.getElementById("download_video");
const downloadSubtitlesLink = document.getElementById("download_subs");
const chapterContainer = document.getElementById('chapter-container');

// ============================================================================
// STATE VARIABLES
// ============================================================================

let chapters;
let loopMode = 0;
let legacySubtitles = false;
let assSubtitleWorker;
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
let subtitleIndex = -1;
let lastTouchTimestamp = 0;
let touchHoverActive = false;

// ============================================================================
// INITIALIZATION
// ============================================================================
function initializeVideoPlayer() {
    const savedSpeed      = localStorage.getItem('videoSpeed');
    const savedVolume     = localStorage.getItem('videoVolume');
    const savedMuted      = localStorage.getItem('videoMuted');
    const savedLoopMode   = localStorage.getItem('videoLoop');
    const savedLegacySubs = localStorage.getItem('subsLegacy');

    video.muted = savedMuted === 'true';
    video.volume = parseFloat(savedVolume || 1);
    volumeSlider.value = video.volume;
    video.playbackRate = parseFloat(savedSpeed || '1');
    loopMode = parseInt(savedLoopMode || '0');
    legacySubtitles = savedLegacySubs === 'true';
    modeBtn.innerHTML = ['1', '»', '&orarr;'][loopMode] || '1';

    updateVolumeSlider();
    updateVolumeIcon();
    updateSpeedDisplay();
    updateLegacyDisplay();

    const isGecko = navigator.userAgent.includes('Gecko') &&
                   !navigator.userAgent.includes('like Gecko');

    if (isGecko) document.body.dataset.fx = 'no';
    else         document.body.dataset.fx = 'yes';

    loadSubtitleTracks();
    waitForVideoReady();
}

async function waitForVideoReady() {
    if (isNaN(video.duration) || video.duration === 0)
        return setTimeout(waitForVideoReady, 25);

    playVideo();
    if (video.paused) pauseVideo();

    totalTime.innerHTML = formatDuration(video.duration);
    video.ontimeupdate = updateProgressBar;
    video.onended = handleVideoEnded;

    loadAudioTracks();
    fixVideoAspectRatio();
    await setupTimelineChapters();
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
    video.textTracks[0].mode = 'showing';
}

async function changeSubtitles(subtitleIndex) {
    const existingTrack = video.querySelector('track[kind="subtitles"]');
    subtitleCanvas.getContext('2d').clearRect(0, 0, subtitleCanvas.width, subtitleCanvas.height);

    if (assSubtitleWorker)
        assSubtitleWorker.destroy();

    if (existingTrack) {
        existingTrack.track.mode = 'disabled';
        existingTrack.remove();
    }
    if (subtitleIndex > -1) {
        const subtitleUrl = window.location.pathname + '?subs=' + subtitleIndex;
        if (legacySubtitles)
            loadWebVttSubtitles(subtitleUrl + 'legacy');
        else
            assSubtitleWorker = await createAssSubtitleWorker(subtitleUrl);
    }
}

// ============================================================================
// SUBTITLE UTILS
// ============================================================================

async function toggleLegacySubtitles() {
    legacySubtitles = !legacySubtitles;
    localStorage.setItem('subsLegacy', legacySubtitles);
    await changeSubtitles(subtitleIndex);
    updateLegacyDisplay();
}

async function loadSubtitleTracks() {
    const subsContent = subsSubmenu.querySelector('.menu-content');
    const subtitleList = await fetch('?tracks').then(res => res.json());
    const savedSubtitle = localStorage.getItem('videoSubs');

    for (let i = 0; i < subtitleList.length; i++) {
        const trackName = subtitleList[i];
        const button = document.createElement('button');
        button.textContent = trackName;
        subsContent.appendChild(button);

        if (trackName === savedSubtitle) {
            changeSubtitles(i);
            subtitleIndex = i;
        }
    }
    updateSubtitleDisplay();
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

    // Align settings menu with buttons
    if (window.innerWidth <= 500) {
        const buttonRect = settingsButton.getBoundingClientRect();
        const buttonTop = buttonRect.top + window.scrollY;
        settingsMenu.style.top = (buttonTop + buttonRect.height + 8) + 'px';
    } else {
        settingsMenu.style.top = '';
    }
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
    loopMode = (loopMode + 1) % 3;
    modeBtn.innerHTML = playbackModes[loopMode];
    localStorage.setItem('videoLoop', loopMode);
}

function togglePlayPauseState() {
    if (video.paused)
        playVideo();
    else
        pauseVideo();
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
    switch (loopMode) {
        case 1:
            navigateToNext();
            break;
        case 2:
            playVideo();
            break;
        default:
            pauseVideo();
            break;
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
        }
    }, delay);
}

function showCursor() {
    clearTimeout(cursorHideTimeout);
    document.body.style.cursor = 'auto';
    if (video.paused) return;

    cursorHideTimeout = setTimeout(()=>{
        if (video.paused) return;
        document.body.style.cursor = 'none';
    }, MOUSE_CONTROL_DELAY);
}

// ============================================================================
// FULLSCREEN & ORIENTATION
// ============================================================================

function toggleFullscreenMode() {
    if (!document.fullscreenElement)
        videoContainer.requestFullscreen();
    else
        document.exitFullscreen();
}

videoContainer.addEventListener('fullscreenchange', ()=>{
    if (document.fullscreenElement) {
        fullscreenIcons[0].style.display = 'none';
        fullscreenIcons[1].style.display = 'block';
    } else {
        fullscreenIcons[0].style.display = 'block';
        fullscreenIcons[1].style.display = 'none';
    }
    if (video.videoWidth >= video.videoHeight)
        screen.orientation.lock('landscape').catch(()=>{});
    else
        screen.orientation.lock('portrait').catch(()=>{});
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

async function setupTimelineChapters() {
    chapters = await fetch('?chapters').then(res => res.json());
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

    if (chapterName)
        hoverInfo.innerHTML = `${timeString}<br>${chapterName}`;
    else
        hoverInfo.innerHTML = timeString;

    hoverInfo.style.display = 'block';
    hoverInfo.style.bottom = `${height + 8}px`;

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
// VOLE ICON MANAGEMENT
// ============================================================================

function updateVolumeIcon() {
    let index;
    if (video.muted)
       index = 0; // mute
    else if (video.volume === 0)
        index = 4; // no volume
    else if (video.volume > 0.67)
        index = 1; // full
    else if (video.volume > 0.33)
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

// ============================================================================
// AUDIO TRACKS MANAGEMENT
// ============================================================================

function loadAudioTracks() {
    const savedAudioTrack = localStorage.getItem('videoAudio');
    const audioContent = audioSubmenu.querySelector('.menu-content');
    const audioTracks = video.audioTracks;
    if (!audioTracks) return;

    for (let i = 0; i < audioTracks.length; i++) {
        const track = audioTracks[i];
        const button = document.createElement('button');
        
        const trackName = (track.label || track.language || 'Track ' + (i + 1));
        button.textContent = trackName;
        audioContent.appendChild(button);

        if (trackName === savedAudioTrack)
            changeAudioTrack(i);
    }
    updateAudioDisplay();
}

function changeAudioTrack(selectedIndex) {
    const tracks = video.audioTracks;
    if (!tracks) return;

    previousVideoTime = video.currentTime;
    for (let i = 0; i < tracks.length; i++)
        video.audioTracks[i].enabled = (i === selectedIndex);

    video.currentTime = previousVideoTime;
    updateAudioDisplay();
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
// MAIN MENU VALUE UPDATERs
// ============================================================================

function updateSubtitleDisplay() {
    if (subtitleIndex === -1) {
        menuSubsText.textContent = 'None';
    } else {
        const subtitleOptions = subsSubmenu.querySelectorAll('.menu-content button');
        const buttonIndex = subtitleIndex + 1;
        if (buttonIndex < subtitleOptions.length)
            menuSubsText.textContent = subtitleOptions[buttonIndex].textContent;
    }
}

function updateSpeedDisplay() {
    menuSpeedText.textContent = video.playbackRate + 'x';
}

function updateLegacyDisplay() {
    if (legacySubtitles)
        menuLegacyText.textContent = 'ON';
    else
        menuLegacyText.textContent = 'OFF';
}

function updateAudioDisplay() {
    const tracks = video.audioTracks;
    if (!tracks || tracks.length < 1) return;

    for (let i = 0; i < tracks.length; i++) {
        if (tracks[i].enabled) {
            const trackName = tracks[i].label || tracks[i].language || 'Track ' + (i + 1);
            menuAudioText.textContent = trackName;
            break;
        }
    }
}

// ============================================================================
// SETTINGS MENU
// ============================================================================

function toggleSettingsMenu() {
    settingsMenu.classList.toggle('show');
    isCursorOnControls = !isCursorOnControls;
    if (settingsMenu.classList.contains('show'))
        showMainMenu();
}

function showMainMenu() {
    mainMenu.style.display = 'block';
    subsSubmenu.style.display = 'none';
    audioSubmenu.style.display = 'none';
    speedSubmenu.style.display = 'none';
}

function showSubmenu(submenuId) {
    mainMenu.style.display = 'none';
    subsSubmenu.style.display = 'none';
    audioSubmenu.style.display = 'none';
    speedSubmenu.style.display = 'none';
    
    document.getElementById(submenuId).style.display = 'block';
}

function handleMenuSelection(element) {
    const submenu = element.closest('[id$="-submenu"]');
    
    if (submenu) {
        const buttons = Array.from(submenu.querySelectorAll('.menu-content button'));
        const index = buttons.indexOf(element);
        
        if (submenu.id === 'subs-submenu') {
            subtitleIndex = index-1;
            updateSubtitleDisplay();
            changeSubtitles(subtitleIndex);
            const subtitleText = element.textContent;

            if (subtitleIndex === -1)
                localStorage.removeItem('videoSubs');
            else
                localStorage.setItem('videoSubs', subtitleText);

        } else if (submenu.id === 'audio-submenu') {
            changeAudioTrack(index);
            const trackText = element.textContent;
            localStorage.setItem('videoAudio', trackText);

        } else if (submenu.id === 'speed-submenu') {
            const speedText = element.textContent;
            const menuSpeedText = parseFloat(speedText.replace('x', ''));
            video.playbackRate = menuSpeedText;
            updateSpeedDisplay();
            localStorage.setItem('videoSpeed', video.playbackRate);
        }
        showMainMenu();
    }
}

// ============================================================================
// SOME HELPERS
// ============================================================================

function handleVolumeKeyboardChange() {
    volumeSlider.value = video.volume;
    updateVolumeSlider();
    updateVolumeIcon();
    saveVolumeToStorage();
    showMainStateAnimation('show_vol');
}

function handleTimeChangeKeyboard(delta) {
    let mode = 'fordward';
    if (delta < 0) mode = 'back';
    controlsContainer.classList.add('show');
    hideControlsWithDelay(TIME_CHANGE_DELAY);
    updateProgressBar();
    showMainStateAnimation(mode);
}

function download() {
    if (downloadSubtitlesLink.href !== "#") {
        alert("The video has external subtitles (.mks) it may need to be combined with the video manually");
        downloadSubtitlesLink.click();
    }
    downloadVideoLink.click();
}

// ============================================================================
// EVENT LISTENERS - WINDOW & VIDEO
// ============================================================================

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
},{ passive: false });

controlsContainer.addEventListener('touchend', event => {
    if (event.target === controlsContainer)
        handleDoubleTouch(event);
    else
        showControls(TOUCH_CONTROL_DELAY);
},{ passive: false });

controlsContainer.addEventListener('click', event => {
    if (event.target === controlsContainer)
        togglePlayPauseState();

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
    if (video.muted)
        volumeSlider.classList.remove('show');
    else
        volumeSlider.classList.add('show');
});

volumeControl.addEventListener('mouseleave', ()=>{
    clearTimeout(volumeHideTimeout);
    volumeSlider.classList.remove('show');
});

volumeSlider.addEventListener('input', handleVolumeChange);
volumeSlider.addEventListener('keydown', e => e.preventDefault());

// ============================================================================
// EVENT LISTENERS - MENU NAVIGATION
// ============================================================================

mainMenu.addEventListener('click', event => {
    const target = event.target.closest('button[data-submenu]');
    if (target) {
        const submenuTarget = target.getAttribute('data-submenu');
        showSubmenu(submenuTarget + '-submenu');
    }
});

document.querySelectorAll('.back-button').forEach(button => {
    button.addEventListener('click', showMainMenu);
});

[subsSubmenu, audioSubmenu, speedSubmenu].forEach(submenu => {
    submenu.addEventListener('click', event => {
        const target = event.target.closest('.menu-content button');
        if (target) handleMenuSelection(target);
    });
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
    if (settingsMenu.contains(event.target)) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    if (event.key.match(/[0-9]/gi)) {
        video.currentTime = (video.duration / 100) * (parseInt(event.key) * 10);
        progress.style.width = parseInt(event.key) * 10 + '%';
        return;
    }
    let delta = 1;

    switch (event.key.toLowerCase()) {
        case ' ':
            if (document.activeElement === document.body) {
                event.preventDefault();
                if (event.repeat) break;
                if (video.paused) playVideo();
                else pauseVideo();
            }
            break;

        case 'arrowleft': delta -= 2;
        case 'arrowright':
            video.currentTime += delta * 2;
            handleTimeChangeKeyboard(delta);
            break;

        case 'arrowdown': delta -= 2;
        case 'arrowup':
            video.volume = minmax(
                video.volume + (delta * 0.02), 0, 1
            );
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

window.addEventListener('pageshow', initializeVideoPlayer);

 
