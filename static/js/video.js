/* Code by Sergio00166 */

const mouse_ctrl_delay = 1500;
const touch_ctrl_delay = 2500;
const timechange_delay = 750;
const doubleTouch_delay = 400;
const animation_st_delay = 400;

const volume = document.querySelector('.volume');
const currentTime = document.querySelector('.current-time');
const duration = document.querySelector('.duration');
const buffer = document.querySelector('.buffer');
const totalDuration = document.querySelector('.total-duration');
const timeContainer = document.querySelector('.time-container');
const currentDuration = document.querySelector('.current-duration');
const controls = document.querySelector('.controls');
const volumeBar = document.getElementById('volume-bar');
const mainState = document.querySelector('.main-state');
const hoverTime = document.querySelector('.hover-time');
const hoverDuration = document.querySelector('.hover-duration');
const settingMenu = document.querySelector('.setting-menu');
const settingsBtn = document.getElementById('settings');
const menuButtons = document.querySelectorAll('.setting-menu li');
const loader = document.querySelector('.custom-loader');
const subtitleSelect = document.getElementById('s0');
const audioTracksSelect = document.getElementById('s1');
const speedSelect = document.getElementById('s2');
const sh_mute = document.querySelector('.volume img:nth-child(1)');
const sh_unmute = document.querySelector('.volume img:nth-child(2)');
const sh_pause = document.querySelector('.play-pause img:nth-child(1)');
const sh_play = document.querySelector('.play-pause img:nth-child(2)');
const sh_play_st = document.querySelector('.main-state img:nth-child(1)');
const sh_volume_st = document.querySelector('.vol_val_st');
const sh_pause_st = document.querySelector('.main-state img:nth-child(2)');
const sh_mute_st = document.querySelector('.main-state img:nth-child(3)');
const sh_unmute_st = document.querySelector('.main-state img:nth-child(4)');
const sh_fordward_st = document.querySelector('.main-state img:nth-child(5)');
const sh_back_st = document.querySelector('.main-state img:nth-child(6)');
const sh_fulla = document.querySelector('.volume img:nth-child(2)');
const sh_lowa = document.querySelector('.volume img:nth-child(4)');
const sh_meda = document.querySelector('.volume img:nth-child(3)');
const sh_noa = document.querySelector('.volume img:nth-child(5)');
const liD = document.getElementById('liD');
const prevLink = document.getElementById('prev');
const nextLink = document.getElementById('next');
const canvas = document.querySelector('canvas');
const touchBox = document.getElementById('touch-box');
const video = document.querySelector('video');
const videoContainer = document.querySelector('.video-container');
const mode = document.getElementById('mode');
const download_video = document.getElementById("download_video");
const download_subs = document.getElementById("download_subs");

var savedPlaybackSpeed = localStorage.getItem('videoSpeed');
var savedVolumeValue = localStorage.getItem('videoVolume');
var playbackMode = localStorage.getItem('videoMode');
var savedMutedState = localStorage.getItem('videoMuted');
var legacySubtitlesEnabled = localStorage.getItem('subsLegacy');

let pressTimer;
let assSubtitleWorker;
var settingsButtonPressed = false;
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


/* Inicialitate everything */

if (savedVolumeValue === null) savedVolumeValue = 1;
savedVolumeValue = parseFloat(savedVolumeValue);
video.volume = savedVolumeValue;

if (legacySubtitlesEnabled != null) {
    if (legacySubtitlesEnabled == 'true') {
        legacySubtitlesEnabled = true;
        settingsBtn.classList.add('lmbsl');
    } else legacySubtitlesEnabled = false;
} else legacySubtitlesEnabled = false;

if (savedMutedState != null) video.muted = (savedMutedState == 'true')
else video.muted = false;

handleVideoIcon();

for (var i = 0; i < subtitleSelect.options.length; i++) {
    if (subtitleSelect.options[i].text ===
        localStorage.getItem('videoSubs')) {
        selectedSubtitleIndex = i;  break;
    }
}
subtitleSelect.selectedIndex = selectedSubtitleIndex;
selectedSubtitleIndex = selectedSubtitleIndex - 1;
changeSubs(selectedSubtitleIndex);

if (savedPlaybackSpeed != null) {
    video.playbackRate = parseFloat(savedPlaybackSpeed);
    for (let i = 0; i < speedSelect.options.length; i++) {
        if (speedSelect.options[i].value === savedPlaybackSpeed) {
            speedSelect.selectedIndex = i;
            break;
        }
    }
} else speedSelect.selectedIndex = 3;

if (playbackMode != null) {
    playbackMode = parseInt(playbackMode);
    mode.innerHTML = ['1', '»', '&orarr;'][playbackMode] || '1';
} else playbackMode = 0;

window.addEventListener('pageshow', () => {
    volumeBar.value = video.volume;
    updateVolumeBar();
    (function wait4ready() {
        if (isNaN(video.duration) || video.duration === 0) {
            return setTimeout(wait4ready, 25);
        }
        play(); if (video.paused) pause();
        totalDuration.innerHTML = showDuration(video.duration);
        video.ontimeupdate = handleProgressBar;
        video.onended = handleVideoEnded;
        split_timeline_chapters(); // Set chapters
        loadTracks(); // Set all audio tracks info
        fix_aspect_ratio(); // Fix the aspect ratio
    })();
});


/* Video helpers zone */

async function create_ass_worker(url) {
    const response = await fetch(url);
    if (!response.ok) {
        alert('Cannot load subtitle [normal mode]');
        return;
    }
    return new JASSUB({
        video: video,
        canvas: canvas,
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

function webvtt_subs(url) {
    var track = document.createElement('track');
    track.kind = 'subtitles';
    track.src = url;
    track.default = true;
    track.onerror = ()=>{
        alert('Cannot load subtitle [legacy mode]');
    }
    video.appendChild(track);
    track.mode = 'showing';
    // Firefox you are a joke
    video.textTracks[0].mode = 'showing';
}

async function changeSubs(value) {
    var existingTrack = video.querySelector('track[kind="subtitles"]');
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    if (assSubtitleWorker) assSubtitleWorker.destroy();
    if (existingTrack) {
        existingTrack.track.mode = 'disabled';
        existingTrack.remove();
    }
    if (value > -1) {
        url = window.location.pathname + '?subs=' + value;
        if (legacySubtitlesEnabled) webvtt_subs(url + 'legacy');
        else assSubtitleWorker = await create_ass_worker(url);
    }
}

function fix_aspect_ratio() {
    if (video.videoWidth <= 0 || video.videoHeight <= 0) {
        setTimeout(fix_aspect_ratio, 25);
    } else {
        if (video.videoWidth < video.videoHeight) {
            var vCont = videoContainer.style;
            vCont.marginTop = '0 !important';
            vCont.paddingBottom = '0 !important';
        }
        scaleVideo();
    }
}

function scaleVideo() {
    const cw = videoContainer.offsetWidth;
    const ch = videoContainer.offsetHeight;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const scale = Math.min(cw / vw, ch / vh);
    video.style.width = (vw * scale) + 'px';
    video.style.height = (vh * scale) + 'px';
}


/* Main functions zone */

function next() { nextLink.click(); }
function prev() { prevLink.click(); }

function chMode() {
    const modes = ['1', '»', '&orarr;'];
    playbackMode = (playbackMode + 1) % 3;
    mode.innerHTML = modes[playbackMode];
    localStorage.setItem('videoMode', playbackMode);
}

function toggleMainState() {
    video.paused ? play() : pause();
}

function handleSettingMenu() {
    if (settingsButtonPressed) settingsButtonPressed = false;
    else {
        settingMenu.classList.toggle('show');
        isCursorOnControls = !isCursorOnControls;
    }
}

function saveVolume() {
    localStorage.setItem('videoVolume', 
        video.volume.toString()
    );
}

function handleVideoEnded() {
    if (playbackMode === 1) next();
    else if (playbackMode === 2) play();
    else  pause();
}

function showCursor() {
    clearTimeout(cursorHideTimeout);
    document.body.style.cursor = 'auto';
    if (!video.paused) {
        cursorHideTimeout = setTimeout(function() {
            if (!video.paused) document.body.style.cursor = 'none';
        }, mouse_ctrl_delay);
    }
}

function play() {
    video.play().catch(()=>{});
    sh_pause.style.display = 'none';
    sh_play.style.display = 'block';
    show_main_animation('play');
    hideControls(mouse_ctrl_delay);
}

function pause() {
    video.pause();
    controls.classList.add('show');
    show_main_animation('pause');
    sh_pause.style.display = 'block';
    sh_play.style.display = 'none';
    handleVideoIcon();
    if (video.ended) currentTime.style.width = 100 + '%';
}

function handleProgressBar() {
    currentTime.style.width = (video.currentTime / video.duration) * 100 + '%';
    currentDuration.innerHTML = showDuration(video.currentTime);
}

function showDuration(time) {
    const hours = Math.floor(time / 60 ** 2);
    const min = Math.floor((time / 60) % 60);
    const sec = Math.floor(time % 60);
    if (hours > 0) return `${formatter(hours)}:${formatter(min)}:${formatter(sec)}`;
    else return `${formatter(min)}:${formatter(sec)}`;
}

function formatter(number) {
    return new Intl.NumberFormat({}, {
        minimumIntegerDigits: 2
    }).format(number);
}

function toggleMuteUnmute() {
    volumeBar.classList.remove('show');
    video.muted = !video.muted;
    if (video.muted) {
        handleVideoIcon();
        show_main_animation('mute');
    } else {
        handleVideoIcon();
        show_main_animation('unmute');
    }
    timeContainer.style.display = 'block';
    localStorage.setItem('videoMuted', video.muted);
}

function hideControls(delay) {
    clearTimeout(controlsHideTimeout);
    controlsHideTimeout = setTimeout(() => {
        if (!video.paused) {
            if (isCursorOnControls) return;
            controls.classList.remove('show');
            settingMenu.classList.remove('show');
            for (let i = 0; i < menuButtons.length; i++) {
                menuButtons[i].style.display = 'block';
            }
            document.activeElement.blur();
        }
    }, delay);
}

function updateVolumeBar() {
    const percent = volumeBar.value * 100;
    volumeBar.style.background = `linear-gradient(to right, #007aff ${percent}%, #e1e1e1 ${percent}%)`;
}

function handleVolume(e) {
    video.volume = e.target.value;
    updateVolumeBar();
    saveVolume();
    handleVideoIcon();
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        videoContainer.requestFullscreen();
    } else document.exitFullscreen();
}

function getchptname(timeInSeconds) {
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

const getPct = clientX => {
    const { x, width, height } = duration.getBoundingClientRect();
    const pos = Math.min(Math.max(0, clientX - x), width);
    return { pct: pos / width, pos, height };
};

function updateTime(pct) {
    video.currentTime = pct * video.duration;
    handleProgressBar(); // Update all
}


// Time bar control funcs

function showHover(clientX) {
    const { pct, pos, height } = getPct(clientX);
    hoverTime.style.width = `${pct * 100}%`;
    const hovtime = pct * video.duration;
    const timeStr = showDuration(hovtime);
    const chapter = getchptname(hovtime);
    hoverDuration.innerHTML = chapter ? `${timeStr}<br>${chapter}` : timeStr;
    hoverDuration.style.display = 'block';
    hoverDuration.style.bottom = `${height + 8}px`;
    const barRect = duration.getBoundingClientRect();
    const tooltipWidth = hoverDuration.offsetWidth;
    let left = pos - tooltipWidth / 2;
    if (left < 0) left = 0;
    if (left + tooltipWidth > barRect.width) left = barRect.width - tooltipWidth;
    hoverDuration.style.left = `${left}px`;
    hoverDuration.style.visibility = tooltipWidth ? 'visible' : 'hidden';
}

function clearHover() {
    hoverTime.style.width = '0';
    hoverDuration.style.display = 'none';
}

function drag(handlerMove) {
    const end = () => document.removeEventListener('mousemove', handlerMove);
    document.addEventListener('mousemove', handlerMove);
    document.addEventListener('mouseup', end, { once: true });
}

function touchDrag(handlerMove) {
    const end = () => document.removeEventListener('touchmove', handlerMove);
    document.addEventListener('touchmove', handlerMove, { passive: true });
    document.addEventListener('touchend', end, { once: true, passive: true });
}

let anim_timeout;
function show_main_animation(mode) {
    clearTimeout(anim_timeout);

    [sh_play_st, sh_pause_st, sh_mute_st, sh_unmute_st, sh_back_st, sh_fordward_st, sh_volume_st].forEach(el => el.style.display = 'none');

    switch (mode) {
        case 'play':
            sh_play_st.style.display = 'block';
            mainState.classList.add('show');
            break;
        case 'pause':
            sh_pause_st.style.display = 'block';
            mainState.classList.add('show');
            break;
        case 'mute':
            sh_mute_st.style.display = 'block';
            mainState.classList.add('show');
            break;
        case 'unmute':
            sh_unmute_st.style.display = 'block';
            mainState.classList.add('show');
            break;
        case 'back':
            sh_back_st.style.display = 'block';
            mainState.classList.add('show');
            break;
        case 'fordward':
            sh_fordward_st.style.display = 'block';
            mainState.classList.add('show');
            break;
        case 'show_vol':
            sh_volume_st.innerText = Math.round(video.volume * 100) + '%';
            sh_volume_st.style.display = 'block';
            mainState.classList.add('show');
            break;
        default:
            mainState.classList.remove('show');
            return;
    }
    anim_timeout = setTimeout(show_main_animation, 400);
}

function handleVideoIcon() {
    if (!video.muted) {
        if (video.volume == 0.0) {
            sh_mute.style.display = 'none';
            sh_fulla.style.display = 'none';
            sh_meda.style.display = 'none';
            sh_lowa.style.display = 'none';
            sh_noa.style.display = 'block';
        } else if (video.volume > 0.67) {
            sh_mute.style.display = 'none';
            sh_fulla.style.display = 'block';
            sh_meda.style.display = 'none';
            sh_lowa.style.display = 'none';
            sh_noa.style.display = 'none';
        } else if (video.volume > 0.33) {
            sh_mute.style.display = 'none';
            sh_fulla.style.display = 'none';
            sh_meda.style.display = 'block';
            sh_lowa.style.display = 'none';
            sh_noa.style.display = 'none';
        } else if (video.volume > 0) {
            sh_mute.style.display = 'none';
            sh_fulla.style.display = 'none';
            sh_meda.style.display = 'none';
            sh_lowa.style.display = 'block';
            sh_noa.style.display = 'none';
        }
    } else {
        sh_mute.style.display = 'block';
        sh_fulla.style.display = 'none';
        sh_meda.style.display = 'none';
        sh_lowa.style.display = 'none';
        sh_noa.style.display = 'none';
    }
}

function loadTracks() {
    try {
        saved = localStorage.getItem('videoAudio');
        audioTracks = video.audioTracks;
        for (let i = 0; i < audioTracks.length; i++) {
            const track = audioTracks[i];
            const option = document.createElement('option');
            option.value = i;
            subs_name = (track.label || track.language || 'Track ' + (i + 1));
            option.textContent = subs_name;
            audioTracksSelect.appendChild(option);
            if (subs_name === saved) {
                audioTracksSelect.selectedIndex = i;
                changeTrack(i);
            } else audioTracksSelect.selectedIndex = 0;
        }
    } catch {}
}

function changeTrack(selectedIndex) {
    if (!isNaN(selectedIndex)) {
        previousVideoTime = video.currentTime;
        for (let i = 0; i < audioTracks.length; i++) {
            audioTracks[i].enabled = (i === selectedIndex);
        }
        video.currentTime = previousVideoTime;
    }
}

function split_timeline_chapters() {
    const divLength = video.duration;
    const container = document.querySelector('.chapter-container');
    // Sort times and add the initial time (0 seconds)
    chptdata = [...chapters.map(item => item.start_time), divLength];
    // Create sections within the div
    chptdata.slice(0, -1).forEach((time, index) => {
        const nextTime = chptdata[index + 1];
        const startPercent = Math.min((time / divLength) * 100, 100)
        const section = document.createElement('div');
        section.classList.add('chapter');
        section.style.left = `${startPercent}%`;
        container.appendChild(section);
    });
}

function double_touch(e) {
    e.preventDefault();
    clearTimeout(touchActionTimeout);
    if (touchInteractionActive){ touchInteractionActive = false; return; }

    const now = Date.now();
    const touchInterval = now - lastTouchTimestamp;
    const divRect = touchBox.getBoundingClientRect();

    if (touchInterval < doubleTouch_delay) {
        const touchX = e.changedTouches[0].clientX;
        const centerX = divRect.left + (divRect.width / 2);
        const p = touchX < centerX;

        if (p) {
            video.currentTime -= 5;
            show_main_animation('back');
        } else {
            video.currentTime += 5;
            show_main_animation('fordward');
        }
        handleProgressBar();
        controls.classList.add('show');
        hideControls(timechange_delay);

    } else touchActionTimeout = setTimeout(toggleMainState, animation_st_delay);
    lastTouchTimestamp = now;
}


// Legacy subtitle toggle

async function addrmMLcl() {
    settingsButtonPressed = true;
    if (settingsBtn.classList.contains('lmbsl')) {
        legacySubtitlesEnabled = false;
        settingsBtn.classList.remove('lmbsl');
    } else {
        legacySubtitlesEnabled = true;
        settingsBtn.classList.add('lmbsl');
    }
    localStorage.setItem('subsLegacy', legacySubtitlesEnabled);
    await changeSubs(selectedSubtitleIndex);
}

function startPressTimer() {
    if (isPressing || pressHasTriggered) return;
    isPressing = true;
    pressTimer = setTimeout(() => {
        addrmMLcl();
        pressHasTriggered = true;
    }, 600);
}

function cancelPressTimer() {
    clearTimeout(pressTimer);
    pressTimer = null;
    isPressing = false;
    pressHasTriggered = false;
}

// Mouse events
settingsBtn.addEventListener('mousedown', (e) => {
    e.preventDefault();
    startPressTimer();
});

settingsBtn.addEventListener('mouseup', cancelPressTimer);
settingsBtn.addEventListener('mouseleave', cancelPressTimer);

// Touch events
settingsBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    startPressTimer();
}, { passive: false });

settingsBtn.addEventListener('touchend', cancelPressTimer);
settingsBtn.addEventListener('touchcancel', cancelPressTimer);


/* Event listeners */

// Window events
window.addEventListener('resize', scaleVideo);
window.addEventListener('fullscreenchange', scaleVideo);

// Video events
video.addEventListener('play', play);
video.addEventListener('pause', pause);
video.addEventListener('waiting', () => {
    loader.style.display = 'block';
});
video.addEventListener('playing', () => {
    loader.style.display = 'none';
});

// Video container events
videoContainer.addEventListener('mouseleave', () => {
    clearTimeout(cursorHideTimeout);
    document.body.style.cursor = 'auto';
    hideControls(50);
});
videoContainer.addEventListener('mousemove', (e) => {
    controls.classList.add('show');
    showCursor();
    hideControls(mouse_ctrl_delay);
});

videoContainer.addEventListener('focusin', (e) => {
    controls.classList.add('show');
    hideControls(mouse_ctrl_delay);
});

videoContainer.addEventListener('fullscreenchange', () => {
    videoContainer.classList.toggle('fullscreen', document.fullscreenElement);
    if (video.videoWidth >= video.videoHeight) {
        screen.orientation.lock('landscape').catch(() => {});
    } else screen.orientation.lock('portrait').catch(() => {});
});

videoContainer.addEventListener('touchmove', () => {
    touchInteractionActive = true;
    controls.classList.add('show');
    hideControls(touch_ctrl_delay);
}, { passive: false });

// Controls events
controls.addEventListener('click', () => {
    controls.classList.add('show');
    showCursor();
    hideControls(mouse_ctrl_delay);
});

// Volume events
volume.addEventListener('mouseenter', () => {
    clearTimeout(volumeHideTimeout);
    if (!video.muted) timeContainer.style.display = 'none';
    video.muted ? volumeBar.classList.remove('show') : volumeBar.classList.add('show');
});
volume.addEventListener('mouseleave', () => {
    clearTimeout(volumeHideTimeout);
    volumeBar.classList.remove('show');
    volumeHideTimeout = setTimeout(()=>{ timeContainer.style.display = 'block'; }, 100);
});
volumeBar.addEventListener('input', (e) => {
    handleVolume(e);
});

// Settings events
settingsBtn.addEventListener('click', (e) => {
    if (settingsButtonPressed) {
        e.preventDefault();
        settingsButtonPressed = false;
    } else handleSettingMenu();
});
settingsBtn.addEventListener('touchend', (e) => {
    if (settingsButtonPressed) {
        e.preventDefault();
        settingsButtonPressed = false;
    } handleSettingMenu();
});

// Track selection events
audioTracksSelect.addEventListener('change', function() {
    selectedIndex = parseInt(this.value, 10);
    changeTrack(selectedIndex);
    text = audioTracksSelect[selectedIndex].text;
    localStorage.setItem('videoAudio', text);
    handleSettingMenu();
});
subtitleSelect.addEventListener('change', async function() {
    selectedSubtitleIndex = parseInt(this.value);
    if (selectedSubtitleIndex == -1) localStorage.removeItem('videoSubs');
    else {
        text = subtitleSelect.options[selectedSubtitleIndex + 1].text;
        localStorage.setItem('videoSubs', text);
    }
    await changeSubs(selectedSubtitleIndex);
    handleSettingMenu();
});
speedSelect.addEventListener('change', function() {
    video.playbackRate = parseFloat(this.value);
    localStorage.setItem('videoSpeed', video.playbackRate);
    handleSettingMenu();
});

// Touch interaction events
touchBox.addEventListener('touchend', double_touch);
touchBox.addEventListener('click', (e) => {
    e.preventDefault();
    toggleMainState();
    showCursor();
});


// Fix outline when clicking
[s0, s1, s2].forEach(el => {
    el.addEventListener('mouseenter', ()=> {
        isMouseOnSelect = true;
        el.parentElement.style.outline="none";
    });
    el.addEventListener('mouseleave', ()=> {
        isMouseOnSelect = false;
    });
    el.addEventListener('focus', ()=> {
        if (isMouseOnSelect) return;
        el.parentElement.style="";
    });
});


// Download events
liD.addEventListener("click", () => {
    const subs_href = download_subs.href; 
    if (!subs_href || subs_href !== "#") { 
        alert("The video has external subtitles (.mks) it may need to be combined with the video manually");
        download_subs.click();
    }
    download_video.click();
    setTimeout(handleSettingMenu, 100);
});
liD.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        liD.click();
    }
});

/* Keyboard events */

duration.addEventListener('mousedown', e =>
    drag(eMove => updateTime(getPct(eMove.clientX).pct))
);
duration.addEventListener('touchstart', e =>
    touchDrag(eMove => updateTime(getPct(eMove.touches[0] && eMove.touches[0].clientX).pct))
);
document.addEventListener('touchstart', () => { touchHoverActive = true; clearHover(); }, { passive: true });
duration.addEventListener('mousemove', e => { if (!touchHoverActive) showHover(e.clientX); });
duration.addEventListener('mouseleave', () => { touchHoverActive = false; clearHover(); });
duration.addEventListener('click', e => updateTime(getPct(e.clientX).pct));
document.addEventListener('keydown', handleShorthand);


function handleShorthand(e) {
    if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
    
    if (e.key.match(/[0-9]/gi)) {
        video.currentTime = (video.duration / 100) * (parseInt(e.key) * 10);
        currentTime.style.width = parseInt(e.key) * 10 + '%';
        return;
    }
    switch (e.key.toLowerCase()) {
        case ' ':
            if (document.activeElement === document.body) {
                e.preventDefault();
                if (e.repeat) break;
                video.paused ? play() : pause();
            } break;
        case 'f':
            toggleFullscreen();
            break;
        case 'arrowright':
            video.currentTime += 2;
            chgtime_kdb_helper('fordward');
            break;
        case 'arrowleft':
            video.currentTime -= 2;
            chgtime_kdb_helper('back');
            break;
        case 'p':
            prev();
            break;
        case 'n':
            next();
            break;
        case 'l':
            chMode();
            break;
        case 'm':
            toggleMuteUnmute();
            break;
        case 'arrowup': 
            video.volume = Math.min(video.volume + 0.02, 1);
            volume_kbd_helper();
            break;
        case 'arrowdown':
            video.volume = Math.max(video.volume - 0.02, 0);
            volume_kbd_helper();
            break;
        default:
            break;
    }
}

function volume_kbd_helper() {
    volumeBar.value = video.volume;
    updateVolumeBar();
    handleVideoIcon();
    saveVolume();
    show_main_animation('show_vol');
}
function chgtime_kdb_helper(mode) {
    controls.classList.add('show');
    hideControls(timechange_delay);
    handleProgressBar();
    show_main_animation(mode);
}

 
