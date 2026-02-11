/* Code by Sergio00166 */
/*
    All paths are (and must be) encoded by default, also the items dataset
    Except the Destination Header THAT MUST BE NOT ENCODED.
    Base path variable (base) ends with "/" always.
*/

// ============================================================================
// DOM ELEMENTS - BUTTONS
// ============================================================================

const selectButton = document.getElementById("selectBtn");
const deleteButton = document.getElementById("delBtn");
const copyButton = document.getElementById("copyBtn");
const moveButton = document.getElementById("moveBtn");
const renameButton = document.getElementById("renBtn");
const invertButton = document.getElementById("invertBtn");

// ============================================================================
// DOM ELEMENTS - UI COMPONENTS
// ============================================================================

const progressBar = document.getElementById("progress");
const sidebar = document.getElementById("sidebar");
const loader = document.getElementById("loader");
const mainContainer = document.getElementById("main-container");
const listGroup = document.getElementById("list-group");
const loginButton = document.getElementById("login");
const pathBar = document.getElementById("path-bar");

// ============================================================================
// DOM ELEMENTS - SORTING
// ============================================================================

const sortByName = document.getElementById("sortName");
const sortBySize = document.getElementById("sortSize");
const sortByDate = document.getElementById("sortDate");

// ============================================================================
// GLOBAL VARIABLES
// ============================================================================

const selectedItems = new Set();
let isSelectModeActive = false;

// ============================================================================
// MANAGEMENT FUNCTIONS
// ============================================================================

function updateButtonStates() {
    invertButton.disabled = !isSelectModeActive;
    copyButton.disabled =   !isSelectModeActive;
    moveButton.disabled =   !isSelectModeActive;
    renameButton.disabled = !isSelectModeActive;
    deleteButton.disabled = !isSelectModeActive;
}

function toggleSidebar() {
    sidebar.classList.toggle("open");
}

function showLoader() {
    loader.style.display = "";
    pathBar.style.display = "none";
    mainContainer.style.display = "none";
}

function hideLoader() {
    loader.style.display = "none";
    pathBar.style.display = "";
    mainContainer.style.display = "";
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function encodePath(path) {
    return path.split("/").map(encodeURIComponent).join("/");
}
function delay(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

// ============================================================================
// FILE OPERATIONS - COPY & MOVE
// ============================================================================

function copySelectedFiles() {
    performStorageOperation("copy", getSelectedURLs());
}
function moveSelectedFiles() {
    performStorageOperation("move", getSelectedURLs());
}
function clearAllCopyMoveOperations() {
    ["copy", "move"].forEach(key => localStorage.removeItem(key));
}

function performStorageOperation(operationKey, fileList) {
    if (isSelectModeActive) toggleSelectMode();
    if (fileList && fileList.length)
        localStorage.setItem(operationKey, JSON.stringify(fileList));
}

function getItemURL(fileItem) {
    const nameElement = fileItem.querySelector("pre");
    const rawName = nameElement.textContent.trim();
    const encodedName = encodeURIComponent(rawName);

    let url = basePath + encodedName;
    if (fileItem.hasAttribute("isdir")) url += "/";
    return url;
}

function getSelectedURLs() {
    return Array.from(selectedItems)
        .map(fileItem => getItemURL(fileItem))
        .filter(Boolean);
}

// ============================================================================
// SESSION REDIRECTERS AND FUNCTIONS
// ============================================================================

function login() {
    if (basePath !== "/") {
        const encodedPath = encodeURIComponent(basePath);
        window.location.href = `/srv/login/?redirect=${encodedPath}`;
    } else {
        window.location.href = "/srv/login";
    }
}
function logout() {
    fetch("/srv/logout", {method: "GET"})
    .then(() => location.reload());
}

// ============================================================================
// SELECTION MODE MANAGEMENT
// ============================================================================

function toggleSelectMode() {
    isSelectModeActive = !isSelectModeActive;
    if (!isSelectModeActive) deselectAllItems();

    if (selectButton) {
        if (isSelectModeActive)
            selectButton.textContent = "❌ Cancel";
        else
            selectButton.textContent = "✅ Enable";
    }
    updateButtonStates();
}

function deselectAllItems() {
    selectedItems.forEach(fileItem => fileItem.classList.remove("selected"));
    selectedItems.clear();
}

function selectItem(fileItem) {
    if (selectedItems.has(fileItem)) {
        fileItem.classList.remove("selected");
        selectedItems.delete(fileItem);
    } else {
        fileItem.classList.add("selected");
        selectedItems.add(fileItem);
    }
}

function invertSelection() {
    if (!isSelectModeActive) return;
    const items = listGroup.children;

    for (let i = 0; i < items.length; i++)
        selectItem(items[i]);
}

// ============================================================================
// MAIN INTERACTION
// ============================================================================

function handleItemClick(fileItem) {
    if (isSelectModeActive) {
        selectItem(fileItem);
    } else {
        const itemURL = getItemURL(fileItem);

        if (fileItem.hasAttribute("isdir")) {
            history.pushState({}, "", itemURL);
            renderFolder();
        } else {
            window.open(itemURL, "_blank");
        }
    }
}
function goBack(toRoot = false) {
    if (basePath === "/") return;
    path = basePath.slice(0, -1);
    if (toRoot) path = "/";

    const lastSlash = path.lastIndexOf("/");
    path = path.slice(0, lastSlash);
    history.pushState({}, "", path + "/");
    renderFolder();
}

// ============================================================================
// KEYBOARD NAVIGATION
// ============================================================================

function moveFocus(direction) {
    const items = Array.from(listGroup.children);
    if (items.length === 0) return;
    let currentIndex = items.indexOf(document.activeElement);

    if (direction === -Infinity)
        currentIndex = 0;
    else if (direction === Infinity)
        currentIndex = items.length - 1;
    else
        currentIndex = (currentIndex + direction + items.length) % items.length;

    items[currentIndex].focus();
}

// ============================================================================
// EVENT LISTENERS - NAVIGATION & ACTIONS
// ============================================================================

listGroup.addEventListener("click", event => {
    const clickedItem = event.target.closest("#list-group > button");
    if (!clickedItem) return;
    handleItemClick(clickedItem);
});

listGroup.addEventListener("keydown", event => {
    if (event.key === " ") event.preventDefault();
});

document.addEventListener("keydown", event => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    let delta = 1;

    switch (event.key.toLowerCase()) {
        case "arrowup": delta -= 2;
        case "arrowdown":
            event.preventDefault();
            moveFocus(delta);
            break;

        case "home": delta -= 2;
        case "end":
            event.preventDefault();
            moveFocus(delta * Infinity);
            break;

        case "arrowleft": delta -= 2;
        case "arrowright":
            event.preventDefault();
            if (event.shiftKey) {
                listGroup.scrollLeft += delta * 24;
                break;
            }
            if (delta > 0 || isSelectModeActive)
                document.activeElement.click();
            else goBack();
            break;

        case "backspace":
            goBack();
            break;
        case "h":
            goHome();
            break;
        case "a":
            invertSelection();
            break;
        case "d":
            executeDownloads();
            break;
        case "c":
            copySelectedFiles();
            break;
        case "x":
            moveSelectedFiles();
            break;
        case "v":
            pasteFiles();
            break;
        case "u":
            openFileUploadMenu(event.shiftKey && true);
            break;
        case "s":
            toggleSelectMode();
            break;
        case "r":
            renameSelectedFiles();
            break;
        case "delete":
            executeDeletes();
            break;
        case "m":
            createDirectory();
            break;
        case "l":
            loginButton.click();
            break;
        case "1":
            sortByName.click();
            break;
        case "2":
            sortBySize.click();
            break;
        case "3":
            sortByDate.click();
            break;
    }
});

 