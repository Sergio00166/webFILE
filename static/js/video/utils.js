/* Code by Sergio00166 */

// ============================================================================
// SUBTITLE WORKERS
// ============================================================================

async function createAssSubtitleWorker(subtitleUrl) {
    const response = await fetch(subtitleUrl);
    if (!response.ok) {
        alert("Cannot load subtitle [normal mode]");
        return;
    }
    return new JASSUB({
        video: video,
        canvas: subtitleCanvas,
        subContent: await response.text(),
        workerUrl: "/srv/static/jassub/worker.js",
        wasmUrl: "/srv/static/jassub/worker.wasm",
        useLocalFonts: true,
        fallbackFont: "liberation sans",
        availableFonts: {
            "liberation sans": "/srv/static/jassub/default.woff2"
        }
    });
}

function loadWebVttSubtitles(subtitleUrl) {
    const trackElement = document.createElement("track");
    trackElement.kind = "subtitles";
    trackElement.src = subtitleUrl;
    trackElement.default = true;
    trackElement.onerror = ()=>{
        alert("Cannot load subtitle [legacy mode]");
    };
    video.appendChild(trackElement);
    trackElement.mode = "showing";
    video.textTracks[0].mode = "showing";
}

// ============================================================================
// TRACK MANAGEMENT
// ============================================================================

async function changeSubtitles(subtitleIndex) {
    const existingTrack = video.querySelector("track[kind='subtitles']");
    subtitleCanvas.getContext("2d").clearRect(0, 0, subtitleCanvas.width, subtitleCanvas.height);

    if (assSubtitleWorker)
        assSubtitleWorker.destroy();

    if (existingTrack) {
        existingTrack.track.mode = "disabled";
        existingTrack.remove();
    }
    if (subtitleIndex > -1) {
        const mode = legacySubtitles && "subs_vtt" || "subs_ssa";
        const subtitleUrl = `${window.location.pathname}?get=${mode}&id=${subtitleIndex}`;

        if (legacySubtitles)
            loadWebVttSubtitles(subtitleUrl);
        else
            assSubtitleWorker = await createAssSubtitleWorker(subtitleUrl);
    }
}

async function toggleLegacySubtitles() {
    legacySubtitles = !legacySubtitles;
    localStorage.setItem("subsLegacy", legacySubtitles);
    await changeSubtitles(subtitleIndex);
    updateLegacyDisplay();
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
// FULLSCREEN & ORIENTATION
// ============================================================================

function toggleFullscreenMode() {
    if (!document.fullscreenElement)
        videoContainer.requestFullscreen();
    else
        document.exitFullscreen();
}

videoContainer.addEventListener("fullscreenchange", ()=>{
    if (document.fullscreenElement) {
        fullscreenIcons[0].style.display = "none";
        fullscreenIcons[1].style.display = "block";
    } else {
        fullscreenIcons[0].style.display = "block";
        fullscreenIcons[1].style.display = "none";
    }
    if (video.videoWidth >= video.videoHeight)
        screen.orientation.lock("landscape").catch(()=>{});
    else
        screen.orientation.lock("portrait").catch(()=>{});
});

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
    mainStateIcons.forEach(icon => icon.style.display = "none");
    mainStateVolume.style.display = "none";

    if (animationMode === "show_vol") {
        mainStateVolume.innerText = Math.round(video.volume * 100) + "%";
        mainStateVolume.style.display = "block";
        mainState.classList.add("show");
    } else {
        const idx = animationMap[animationMode];
        if (idx !== undefined) {
            mainStateIcons[idx].style.display = "block";
            mainState.classList.add("show");
        } else {
            mainState.classList.remove("show");
            return;
        }
    }
    animationTimeout = setTimeout(showMainStateAnimation, 400);
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
            videoContainerStyle.marginTop = "0 !important";
            videoContainerStyle.paddingBottom = "0 !important";
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

    video.style.width = (videoWidth * scale) + "px";
    video.style.height = (videoHeight * scale) + "px";

    // Align settings menu with buttons
    if (window.innerWidth <= 500) {
        const buttonRect = settingsButton.getBoundingClientRect();
        const buttonTop = buttonRect.top + window.scrollY;
        settingsMenu.style.top = (buttonTop + buttonRect.height + 12) + "px";
    } else {
        settingsMenu.style.top = "";
    }
}

// ============================================================================
// ICONS MANAGEMENT
// ============================================================================

function updateLoopButton() {
    if (loopMode === 0) {
        loopIcons[0].style.opacity = 0.4;
        loopIcons[0].style.display = "block";
        loopIcons[1].style.display = "none";
    } else if (loopMode === 1) {
        loopIcons[0].style.opacity = 1;
        loopIcons[0].style.display = "block";
        loopIcons[1].style.display = "none";
    } else {
        loopIcons[0].style.display = "none";
        loopIcons[1].style.display = "block";
    }
    localStorage.setItem("videoLoop", loopMode);
}

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
            volumeIcons[i].style.display = "block";
        else
            volumeIcons[i].style.display = "none";
    }
}

 