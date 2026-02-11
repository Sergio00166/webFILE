/* Code by Sergio00166 */

// ============================================================================
// PLAYBACK CONTROL
// ============================================================================

function navigateToNext() {
    if (nextLink)
        nextLink.click();
}
function navigateToPrevious() {
    if (previousLink)
        previousLink.click();
}

function togglePlayPauseState() {
    if (video.paused)
        playVideo();
    else
        pauseVideo();
}

function playVideo() {
    video.play().catch(()=>{});
    playIcons [0].style.display = "none";
    playIcons [1].style.display = "block";
    showMainStateAnimation("play");
    hideControlsWithDelay(MOUSE_CONTROL_DELAY);
}

function pauseVideo() {
    video.pause();
    controlsContainer.classList.add("show");
    showMainStateAnimation("pause");
    playIcons [0].style.display = "block";
    playIcons [1].style.display = "none";
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
// LOOP MODE MANAGEMENT
// ============================================================================

function cycleLoopMode() {
    loopMode = (loopMode + 1) % 3;
    updateLoopButton();
}

// ============================================================================
// VOLUME CONTROL
// ============================================================================

function toggleMuteState() {
    volumeSlider.classList.remove("show");
    video.muted = !video.muted;

    if (video.muted) {
        updateVolumeIcon();
        showMainStateAnimation("mute");
    } else {
        updateVolumeIcon();
        showMainStateAnimation("unmute");
    }
    localStorage.setItem("videoMuted", video.muted);
}

function saveVolumeToStorage() {
    localStorage.setItem("videoVolume", video.volume.toString());
}

function updateVolumeSlider() {
    const volumePercent = volumeSlider.value * 100;
    volumeSlider.style.background = `linear-gradient(to right, #007aff ${volumePercent}%, #e1e1e1 ${volumePercent}%)`;
}

// ============================================================================
// CONTROLS VISIBILITY
// ============================================================================

function hideControlsWithDelay(delay) {
    clearTimeout(controlsHideTimeout);

    if (settingsMenu.classList.contains("show"))
        delay += EXTRA_SETTINGS_DELAY;

    controlsHideTimeout = setTimeout(()=>{
        if (!video.paused) {
            controlsContainer.classList.remove("show");
            settingsMenu.classList.remove("show");
            document.activeElement.blur();
        }
    }, delay);
}

function showCursor() {
    clearTimeout(cursorHideTimeout);
    document.body.style.cursor = "auto";
    if (video.paused) return;

    cursorHideTimeout = setTimeout(()=>{
        if (video.paused) return;
        document.body.style.cursor = "none";
    }, MOUSE_CONTROL_DELAY);
}

// ============================================================================
// PROGRESS BAR & TIME DISPLAY
// ============================================================================

function updateProgressBar() {
    progress.style.width = (video.currentTime / video.duration) * 100 + "%";
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

    hoverInfo.style.display = "block";
    hoverInfo.style.bottom = `${height + 9}px`;

    const barRect = seekBar.getBoundingClientRect();
    const tooltipWidth = hoverInfo.offsetWidth;
    let leftPosition = position - tooltipWidth / 2;

    if (leftPosition < 0) leftPosition = 0;
    if (leftPosition + tooltipWidth > barRect.width)
        leftPosition = barRect.width - tooltipWidth;

    hoverInfo.style.left = `${leftPosition}px`;

    if (tooltipWidth)
        hoverInfo.style.visibility = "visible";
    else
        hoverInfo.style.visibility = "hidden";
}

function clearTimelineHover() {
    hoverTime.style.width = "0";
    hoverInfo.style.display = "none";
}

// ============================================================================
// MAIN MENU VALUE UPDATERs
// ============================================================================

function updateSubtitleDisplay() {
    if (subtitleIndex === -1) {
        menuSubsText.textContent = "None";
    } else {
        const subtitleOptions = subsSubmenu.querySelectorAll(".menu-content button");
        const buttonIndex = subtitleIndex + 1;
        if (buttonIndex < subtitleOptions.length)
            menuSubsText.textContent = subtitleOptions[buttonIndex].textContent;
    }
}

function updateSpeedDisplay() {
    menuSpeedText.textContent = video.playbackRate + "x";
}

function updateLegacyDisplay() {
    if (legacySubtitles)
        menuLegacyText.textContent = "ON";
    else
        menuLegacyText.textContent = "OFF";
}

function updateAudioDisplay() {
    const tracks = video.audioTracks;
    if (!tracks || tracks.length < 1) return;

    for (let i = 0; i < tracks.length; i++) {
        if (tracks[i].enabled) {
            const trackName = tracks[i].label || tracks[i].language || "Track " + (i + 1);
            menuAudioText.textContent = trackName;
            break;
        }
    }
}

// ============================================================================
// SETTINGS MENU
// ============================================================================

function toggleSettingsMenu() {
    settingsMenu.classList.toggle("show");
    if (settingsMenu.classList.contains("show"))
        showMainMenu();
}

function showMainMenu() {
    mainMenu.style.display = "block";
    subsSubmenu.style.display = "none";
    audioSubmenu.style.display = "none";
    speedSubmenu.style.display = "none";
}

function showSubmenu(submenuId) {
    mainMenu.style.display = "none";
    subsSubmenu.style.display = "none";
    audioSubmenu.style.display = "none";
    speedSubmenu.style.display = "none";

    document.getElementById(submenuId).style.display = "block";
}

function handleMenuSelection(element) {
    const submenu = element.closest("[id$='-submenu']");

    if (submenu) {
        const buttons = Array.from(submenu.querySelectorAll(".menu-content button"));
        const index = buttons.indexOf(element);

        if (submenu.id === "subs-submenu") {
            subtitleIndex = index-1;
            updateSubtitleDisplay();
            changeSubtitles(subtitleIndex);
            const subtitleText = element.textContent;

            if (subtitleIndex === -1)
                localStorage.removeItem("videoSubs");
            else
                localStorage.setItem("videoSubs", subtitleText);

        } else if (submenu.id === "audio-submenu") {
            changeAudioTrack(index);
            const trackText = element.textContent;
            localStorage.setItem("videoAudio", trackText);

        } else if (submenu.id === "speed-submenu") {
            const speedText = element.textContent;
            const menuSpeedText = parseFloat(speedText.replace("x", ""));
            video.playbackRate = menuSpeedText;
            updateSpeedDisplay();
            localStorage.setItem("videoSpeed", video.playbackRate);
        }
        showMainMenu();
    }
}

 