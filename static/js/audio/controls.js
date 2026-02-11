/* Code by Sergio00166 */

// ============================================================================
// LOOP MODE MANAGEMENT
// ============================================================================

function updateLoopButton() {
    if (loopMode === 0) {
        loopButton.style.opacity = 0.4;
        loopIcons[0].style.display = "block";
        loopIcons[1].style.display = "none";
    } else if (loopMode === 1) {
        loopButton.style.opacity = 1;
        loopIcons[0].style.display = "block";
        loopIcons[1].style.display = "none";
    } else {
        loopButton.style.opacity = 1;
        loopIcons[0].style.display = "none";
        loopIcons[1].style.display = "block";
    }
    localStorage.setItem("audioLoop", loopMode);
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
    localStorage.setItem("audioShuffle", JSON.stringify(isShuffled));
    updateShuffleButton();
}

// ============================================================================
// VOLUME CONTROL
// ============================================================================

function updateVolumeBar() {
    const volumePercent = volumeSlider.value * 100;
    if (audio.muted)
        volumeSlider.style.background = "#e1e1e1";
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
            volumeIcons[i].style.display = "block";
        else
            volumeIcons[i].style.display = "none";
    }
}

function handleVolumeChange(event) {
    if (audio.muted) {
        audio.muted = false;
        localStorage.setItem("audioMuted", "false");
    }
    audio.volume = event.target.value;
    localStorage.setItem("audioVolume", audio.volume);
    updateVolumeIcon();
    updateVolumeBar();
}

function toggleMuteState() {
    audio.muted = !audio.muted;
    localStorage.setItem("audioMuted", audio.muted);
    updateVolumeIcon();
    updateVolumeBar();
}

function handleVolumeKeyboardChange() {
    volumeSlider.value = audio.volume;
    localStorage.setItem("audioVolume", audio.volume);
    updateVolumeIcon();
    updateVolumeBar();
}

// ============================================================================
// PLAYBACK CONTROL
// ============================================================================

function pauseAudio() {
    audio.pause();
    playIcons[1].style.display = "none";
    playIcons[0].style.display = "block";
}

function playAudio() {
    audio.play().catch(()=>{});
    playIcons[0].style.display = "none";
    playIcons[1].style.display = "block";
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
            playIcons[1].style.display = "none";
            playIcons[0].style.display = "block";
            break;

    }
}

// ============================================================================
// NAVIGATION
// ============================================================================

function navigateToPrevious() {
    if (isShuffled && randomLink)
        window.history.go(-1);

    else if (previousLink)
        previousLink.click();
}

function navigateToNext() {
    if (isShuffled && randomLink) {
        window.history.forward();
        setTimeout(() => randomLink.click(), 250);
    }
    else if (nextLink)
        nextLink.click();
}

function download() {
    downloadLink.click();
}

// ============================================================================
// TIME FORMATTING & DISPLAY
// ============================================================================

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
    const remainingSeconds = Math.floor(seconds % 60).toString().padStart(2, "0");
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
    progress.style.width = (audio.currentTime / audio.duration) * 100 + "%";
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
    hoverInfo.style.display = "block";
    hoverInfo.style.bottom = `${height + 4}px`;

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

function setupMouseDrag(handlerMove) {
    const endDrag = () => document.removeEventListener("mousemove", handlerMove);
    document.addEventListener("mousemove", handlerMove);
    document.addEventListener("mouseup", endDrag, { once: true });
}

function setupTouchDrag(handlerMove) {
    const endDrag = () => document.removeEventListener("touchmove", handlerMove);
    document.addEventListener("touchmove", handlerMove, { passive: true });
    document.addEventListener("touchend", endDrag, { once: true });
}

 