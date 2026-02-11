/* Code by Sergio00166 */

// ============================================================================
// KEYBOARD SHORTCUTS
// ============================================================================

document.addEventListener("mouseup", event => {
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

document.addEventListener("keydown", event => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    if (event.key.match(/[0-9]/gi)) {
        audio.currentTime = (audio.duration / 100) * (parseInt(event.key) * 10);
        return;
    }
    let delta = 1;

    switch (event.key.toLowerCase()) {
        case " ":
            if (document.activeElement === document.body) {
                event.preventDefault();
                if (event.repeat) break;
                togglePlayPauseState();
            }
            break;

        case "arrowleft": delta -= 2;
        case "arrowright":
            audio.currentTime += delta * 2;
            break;

        case "arrowdown": delta -= 2;
        case "arrowup":
            const tmp = audio.volume + (delta * 0.02);
            audio.volume = Math.min(Math.max(tmp, 0), 1);
            handleVolumeKeyboardChange();
            break;

        case "m":
            toggleMuteState();
            break;
        case "s":
            toggleShuffleMode();
            break;
        case "l":
            cycleLoopMode();
            break;
        case "n":
            navigateToNext();
            break;
        case "p":
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
    if ("mediaSession" in navigator) {
        navigator.mediaSession.setActionHandler("previoustrack", navigateToPrevious);
        navigator.mediaSession.setActionHandler("nexttrack", navigateToNext);
    }
}

// ============================================================================
// EVENT LISTENERS - BASE
// ============================================================================

audio.addEventListener("ended", handleAudioEnded);
audio.addEventListener("play", playAudio);
audio.addEventListener("pause", pauseAudio);

volumeSlider.addEventListener("input", handleVolumeChange);
volumeSlider.addEventListener("keydown", e => e.preventDefault());

// ============================================================================
// EVENT LISTENERS - SPEED
// ============================================================================

function updateSpeed() {
    speedButton.textContent = speedValues[speedIndex] + "x";
}

speedButton.addEventListener("click", ()=>{
    speedIndex = (speedIndex + 1) % speedValues.length;
    audio.playbackRate = speedValues[speedIndex];
    localStorage.setItem("audioSpeed", speedValues[speedIndex]);
    updateSpeed();
});

speedButton.addEventListener("touchstart", event => {
    event.preventDefault();
    speedButtonStartY = event.touches[0].clientY;
}, { passive: false });

speedButton.addEventListener("touchend", event => {
    const speedButtonEndY = event.changedTouches[0].clientY;
    const speedButtonDeltaY = speedButtonEndY - speedButtonStartY;

    if (speedButtonDeltaY > 10 && speedIndex < speedValues.length - 1)
        speedIndex++;
    else if (speedButtonDeltaY < -10 && speedIndex > 0)
        speedIndex--;
    else if (Math.abs(speedButtonDeltaY) < 10)
        speedButton.click();

    audio.playbackRate = speedValues[speedIndex];
    localStorage.setItem("audioSpeed", speedValues[speedIndex]);
    updateSpeed();
});

speedButton.addEventListener("wheel", event => {
    event.preventDefault();

    if (event.deltaY < 0 && speedIndex < speedValues.length - 1)
        speedIndex++;
    else if (event.deltaY > 0 && speedIndex > 0)
        speedIndex--;

    audio.playbackRate = speedValues[speedIndex];
    localStorage.setItem("audioSpeed", speedValues[speedIndex]);
    updateSpeed();

}, { passive: false });

// ============================================================================
// EVENT LISTENERS - TIMELINE
// ============================================================================

seekBar.addEventListener("mousedown", event => {
    setupMouseDrag(moveEvent => updateAudioTime(
        getTimelinePosition(moveEvent.clientX).percentage)
    );
});

seekBar.addEventListener("touchstart", event => {
    setupTouchDrag(moveEvent => updateAudioTime(
        getTimelinePosition(moveEvent.touches[0] && moveEvent.touches[0].clientX).percentage)
    );
},{ passive: true });

document.addEventListener("touchstart", ()=>{
    isTouchHoverActive = true;
    clearTimelineHover();
},{ passive: true });

seekBar.addEventListener("click", event => {
    updateAudioTime(getTimelinePosition(event.clientX).percentage);
});

seekBar.addEventListener("mousemove", event => {
    if (!isTouchHoverActive) showTimelineHover(event.clientX);
});

seekBar.addEventListener("mouseleave", ()=>{
    isTouchHoverActive = false;
    clearTimelineHover();
});

 