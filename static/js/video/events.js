/* Code by Sergio00166 */

// ============================================================================
// EVENT LISTENERS - WINDOW & VIDEO
// ============================================================================

window.addEventListener("resize", scaleVideoToFit);
window.addEventListener("fullscreenchange", scaleVideoToFit);

video.addEventListener("play", playVideo);
video.addEventListener("pause", pauseVideo);

video.addEventListener("waiting", ()=>{
    loadingSpinner.style.display = "block";
});
video.addEventListener("playing", ()=>{
    loadingSpinner.style.display = "none";
});

// ============================================================================
// EVENT LISTENERS - SHOW/HIDE CONTROLS
// ============================================================================

videoContainer.addEventListener("mouseleave", ()=>{
    clearTimeout(cursorHideTimeout);
    document.body.style.cursor = "auto";
    hideControlsWithDelay(50);
});

function showControls(delay, cursor=false) {
    if (cursor) showCursor();
    controlsContainer.classList.add("show");
    hideControlsWithDelay(delay);
}

videoContainer.addEventListener("touchmove", ()=>{
    touchInteractionActive = true;
    showControls(TOUCH_CONTROL_DELAY);
},{ passive: false });

controlsContainer.addEventListener("touchend", event => {
    if (event.target === controlsContainer)
        handleDoubleTouch(event);
    else
        showControls(TOUCH_CONTROL_DELAY);
},{ passive: false });

controlsContainer.addEventListener("click", event => {
    if (event.target === controlsContainer)
        togglePlayPauseState();

    showControls(MOUSE_CONTROL_DELAY,true);
});

videoContainer.addEventListener("mousemove", event => {
    showControls(MOUSE_CONTROL_DELAY,true);
});
videoContainer.addEventListener("focusin", event => {
    showControls(MOUSE_CONTROL_DELAY);
});

// ============================================================================
// EVENT LISTENERS - VOLUME
// ============================================================================

volumeControl.addEventListener("mouseenter", ()=>{
    if (video.muted)
        volumeSlider.classList.remove("show");
    else
        volumeSlider.classList.add("show");
});

volumeControl.addEventListener("mouseleave", ()=>
    volumeSlider.classList.remove("show")
);

volumeSlider.addEventListener("input", event => {
    video.volume = event.target.value;
    updateVolumeSlider();
    saveVolumeToStorage();
    updateVolumeIcon();
});

volumeSlider.addEventListener("keydown", e => e.preventDefault());

// ============================================================================
// EVENT LISTENERS - MENU NAVIGATION
// ============================================================================

mainMenu.addEventListener("click", event => {
    const target = event.target.closest("button[data-submenu]");
    if (target) {
        const submenuTarget = target.getAttribute("data-submenu");
        showSubmenu(submenuTarget + "-submenu");
    }
});

document.querySelectorAll(".back-button").forEach(button => {
    button.addEventListener("click", showMainMenu);
});

[subsSubmenu, audioSubmenu, speedSubmenu].forEach(submenu => {
    submenu.addEventListener("click", event => {
        const target = event.target.closest(".menu-content button");
        if (target) handleMenuSelection(target);
    });
});

// ============================================================================
// EVENT LISTENERS - TIMELINE
// ============================================================================

function setupMouseDrag(handlerMove) {
    const endDrag = () => document.removeEventListener("mousemove", handlerMove);
    document.addEventListener("mousemove", handlerMove);
    document.addEventListener("mouseup", endDrag, { once: true });
}

function setupTouchDrag(handlerMove) {
    const endDrag = () => document.removeEventListener("touchmove", handlerMove);
    document.addEventListener("touchmove", handlerMove, { passive: true });
    document.addEventListener("touchend", endDrag, { once: true, passive: true });
}

seekBar.addEventListener("mousedown", event => {
    setupMouseDrag(moveEvent => updateVideoTime(
        getTimelinePosition(moveEvent.clientX).percentage)
    );
});

seekBar.addEventListener("touchstart", event => {
    setupTouchDrag(moveEvent => updateVideoTime(
        getTimelinePosition(moveEvent.touches[0] && moveEvent.touches[0].clientX).percentage)
    );
},{ passive: true });

document.addEventListener("touchstart", ()=>{
    touchHoverActive = true;
    clearTimelineHover();
},{ passive: true });

seekBar.addEventListener("click", event => {
    updateVideoTime(getTimelinePosition(event.clientX).percentage);
});

seekBar.addEventListener("mousemove", event => {
    if (!touchHoverActive) showTimelineHover(event.clientX);
});

seekBar.addEventListener("mouseleave", ()=>{
    touchHoverActive = false;
    clearTimelineHover();
});

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
            showMainStateAnimation("back");
        } else {
            video.currentTime += 5;
            showMainStateAnimation("fordward");
        }
        updateProgressBar();
        controlsContainer.classList.add("show");
        hideControlsWithDelay(TIME_CHANGE_DELAY);
    } else {
        touchActionTimeout = setTimeout(togglePlayPauseState, ANIMATION_START_DELAY);
    }
    lastTouchTimestamp = now;
}

// ============================================================================
// EVENT LISTENERS - KEYBOARD
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
    if (settingsMenu.contains(event.target)) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    if (event.key.match(/[0-9]/gi)) {
        video.currentTime = (video.duration / 100) * (parseInt(event.key) * 10);
        progress.style.width = parseInt(event.key) * 10 + "%";
        return;
    }
    let delta = 1;

    switch (event.key.toLowerCase()) {
        case " ":
            if (document.activeElement === document.body) {
                event.preventDefault();
                if (event.repeat) break;
                if (video.paused) playVideo();
                else pauseVideo();
            }
            break;

        case "arrowleft": delta -= 2;
        case "arrowright":
            video.currentTime += delta * 2;
            handleTimeChangeKeyboard(delta);
            break;

        case "arrowdown": delta -= 2;
        case "arrowup":
            const tmp = video.volume + (delta * 0.02);
            video.volume = Math.min(Math.max(tmp, 0), 1);
            handleVolumeKeyboardChange();
            break;

        case "f":
            toggleFullscreenMode();
            break;
        case "p":
            navigateToPrevious();
            break;
        case "n":
            navigateToNext();
            break;
        case "l":
            cycleLoopMode();
            break;
        case "m":
            toggleMuteState();
            break;
        default:
            break;
    }
});

// ============================================================================
// SOME HELPERS
// ============================================================================

function handleVolumeKeyboardChange() {
    volumeSlider.value = video.volume;
    updateVolumeSlider();
    updateVolumeIcon();
    saveVolumeToStorage();
    showMainStateAnimation("show_vol");
}

function handleTimeChangeKeyboard(delta) {
    let mode = "fordward";
    if (delta < 0) mode = "back";
    controlsContainer.classList.add("show");
    hideControlsWithDelay(TIME_CHANGE_DELAY);
    updateProgressBar();
    showMainStateAnimation(mode);
}

function download() {
    if (downloadSubtitlesLink) {
        alert("The video has external subtitles (.mks) it may need to be combined with the video manually");
        downloadSubtitlesLink.click();
    }
    downloadVideoLink.click();
}

 