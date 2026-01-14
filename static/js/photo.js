/* Code by Sergio00166 */

// ============================================================================
// DOM ELEMENTS - IMAGE VIEWER
// ============================================================================

const body = document.querySelector("body");
const img = document.getElementById("main-img");
const zoomIcon = document.getElementById("zoomIcon");
const downloadLink = document.getElementById("download-link");
const previousLink = document.getElementById("prev");
const nextLink = document.getElementById("next");

// ============================================================================
// VARIABLES AND CONFIG
// ============================================================================

let dispX = 0;
let dispY = 0;
let posX = 0;
let posY = 0;
let startX = 0;
let startY = 0;
let startPosX = 0;
let startPosY = 0;
let scale = 1;
let rotation = 0;
const kbdsteps = 40;
let isDown = false;
let pinchStartDist = 0;
let pinchStartScale = 1;
const smoothing = 0.25;

// ============================================================================
// UTILITIES
// ============================================================================

function getBestFitScale() {
    let iw = img.naturalWidth;
    let ih = img.naturalHeight;
    const cw = body.clientWidth;
    const ch = body.clientHeight;

    const rot = ((rotation % 360) + 360) % 360;
    if (rot === 90 || rot === 270) {
        const tmp = iw;
        iw = ih;
        ih = tmp;
    }
    const sx = cw / iw;
    const sy = ch / ih;
    return Math.min(sx, sy) * 0.975;
}

function animate() {
    dispX += (posX - dispX) * smoothing;
    dispY += (posY - dispY) * smoothing;
    applyTransform();
    requestAnimationFrame(animate);
}

function download() {
    downloadLink.click();
}
function navigateToNext() {
    nextLink.click();
}
function navigateToPrevious() {
    previousLink.click();
}

// ============================================================================
// HELPERS
// ============================================================================

function beginDrag(x, y) {
    isDown = true;
    startX = x;
    startY = y;
    startPosX = posX;
    startPosY = posY;
}

function moveDrag(x, y) {
    if (!isDown) return;
    posX = startPosX + (x - startX);
    posY = startPosY + (y - startY);
}

function applyTransform() {
    img.style.transform =
        `translate3d(${dispX}px, ${dispY}px, 0) scale(${scale}) rotate(${rotation}deg)`;
}

function rectCenter(r) {
    return {
        x: r.left + r.width / 2,
        y: r.top + r.height / 2
    };
}

// ============================================================================
// SCALING AND ZOOM
// ============================================================================

function setScale(newScale, opts) {
    let cx, cy, rect;
    if (!opts) opts = {};
    const oldScale = scale;
    
    if (newScale === oldScale) return;
    newScale = Math.max(newScale, 0.05);
    const factor = newScale / oldScale;

    if (opts.centerScreen) {
        cx = opts.centerScreen.x;
        cy = opts.centerScreen.y;
    } else {
        cx = body.clientWidth / 2;
        cy = body.clientHeight / 2;
    }
    if (opts.preRect) rect = opts.preRect;
    else rect = img.getBoundingClientRect();
    const center = rectCenter(rect);

    posX = posX + (1 - factor) * (cx - center.x);
    posY = posY + (1 - factor) * (cy - center.y);

    scale = newScale;
    dispX = posX;
    dispY = posY;
    applyTransform();
}

function zoomIn() {
    const preRect = img.getBoundingClientRect();
    setScale(scale * 1.25, {preRect: preRect});
}

function zoomOut() {
    const preRect = img.getBoundingClientRect();
    const ns = scale / 1.25;
    let newScale = ns;
    if (ns < 0.05) {newScale = 0.05;}
    setScale(newScale, {preRect: preRect});
}

function handlePinchTouch(e) {
    const t1 = e.touches[0];
    const t2 = e.touches[1];

    const dx = t2.clientX - t1.clientX;
    const dy = t2.clientY - t1.clientY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (!pinchStartDist) {
        pinchStartDist = dist;
        pinchStartScale = scale;
        return;
    }
    const factor = dist / pinchStartDist;
    const newScale = pinchStartScale * factor;

    const preRect = img.getBoundingClientRect();
    const center = {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2
    };
    setScale(newScale, {preRect: preRect, centerScreen: center});
}

function resetPinchState() {
    pinchStartDist = 0;
    pinchStartScale = scale;
}

// ============================================================================
// ROTATION AND VIEW
// ============================================================================

function resetView() {
    posX = 0;
    posY = 0;
    dispX = 0;
    dispY = 0;
    scale = getBestFitScale();
    applyTransform();
}

function rotateImg() {
    const preRect = img.getBoundingClientRect();
    const preCenter = rectCenter(preRect);
    const oldX = posX;
    const oldY = posY;

    posX = 0;
    posY = 0;
    dispX = 0;
    dispY = 0;
    applyTransform();
    rotation = (rotation + 90) % 360;

    const postRect = img.getBoundingClientRect();
    const postCenter = rectCenter(postRect);
    const shiftX = postCenter.x - preCenter.x;
    const shiftY = postCenter.y - preCenter.y;

    posX = oldX - shiftX;
    posY = oldY - shiftY;
    dispX = posX;
    dispY = posY;

    applyTransform();
    resetView();
}

// ============================================================================
// MOUSE LISTENERS
// ============================================================================

window.addEventListener("mouseup", () => {
    isDown = false;
});

window.addEventListener("mousedown", e => {
    beginDrag(e.clientX, e.clientY);
});

window.addEventListener("mousemove", e => {
    moveDrag(e.clientX, e.clientY);
});

document.addEventListener("wheel", e => {
    e.preventDefault();
    let newScale;
    const preRect = img.getBoundingClientRect();

    if (e.deltaY < 0) {
        newScale = scale * 1.25;
    } else {
        const ns = scale / 1.25;
        if (ns < 0.05) newScale = 0.05;
        else newScale = ns;
    }
    setScale(newScale, {preRect: preRect, centerScreen: {x: e.clientX, y: e.clientY} });
}, { passive: false });

// ============================================================================
// TOUCH LISTENERS
// ============================================================================

window.addEventListener("touchend", () => {
    isDown = false;
    resetPinchState();
});

window.addEventListener("touchstart", e => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    beginDrag(t.clientX, t.clientY);
});

window.addEventListener("touchmove", e => {
    switch (e.touches.length) {
        case 1:
            e.preventDefault();
            const t = e.touches[0];
            moveDrag(t.clientX, t.clientY);
            break;
        case 2:
            e.preventDefault();
            handlePinchTouch(e);
            break;
        default:
            break;
    }
}, { passive: false });

// ============================================================================
// KEYBOARD LISTENER
// ============================================================================

window.addEventListener("keydown", e => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    let delta = 1;

    switch (e.key) {
        case "ArrowDown": delta = -1;
        case "ArrowUp":
            e.preventDefault();
            posY += kbdsteps * delta;
            break;

        case "ArrowRight": delta = -1;
        case "ArrowLeft":
            e.preventDefault();
            posX += kbdsteps * delta;
            break;

        case "+":
            e.preventDefault();
            zoomIn();
            break;
        case "-":
            e.preventDefault();
            zoomOut();
            break;
        case " ": 
            e.preventDefault();
            resetView();
            break;

        case "r": rotateImg(); break;
        case "n": navigateToNext(); break;
        case "p": navigateToPrevious(); break;
        default: break;
    }
});

// ============================================================================
// INIT AND WINDOW EVENTS
// ============================================================================

window.addEventListener("pageshow", () => {
    function waitForImageReady() {
        if (!img.naturalWidth) {
            setTimeout(waitForImageReady, 25);
            return;
        }
        requestAnimationFrame(animate);
        resetView();
    }
    waitForImageReady();
});

window.addEventListener("resize", resetView);
zoomIcon.addEventListener("click", resetView);

 