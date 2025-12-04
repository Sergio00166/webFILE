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

const basePath = (location.pathname.replace(/\/$/, "") || "") + "/";
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

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function setUrlKey(name, value = "") {
    const url = new URL(window.location.href);
    url.searchParams.set(name, value);
    let keys = url.searchParams.toString();
    location.search = keys.replace(/=&/g, "&").replace(/=$/g, "");
}

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
    const currentPath = basePath + window.location.search;

    if (currentPath !== "/") {
        const encodedPath = encodeURIComponent(currentPath);
        window.location.href = `/srv/login/?redirect=${encodedPath}`;
    } else {
        window.location.href = "/srv/login";
    }
}

function logout() {
    fetch("/srv/logout", {method: "GET"})
    .then(() => window.location.reload())
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
// ITEM INTERACTION
// ============================================================================

function handleItemClick(fileItem) {
    if (isSelectModeActive) {
        selectItem(fileItem);
    } else {
        const itemURL = getItemURL(fileItem);
        if (fileItem.hasAttribute("isdir")) location.href = itemURL;
        else window.open(itemURL, "_blank");
    }
}

// ============================================================================
// DOWNLOAD MANAGEMENT
// ============================================================================

function downloadURL(url) {
    const downloadLink = document.createElement("a");
    downloadLink.href = url;
    downloadLink.download = "";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
}

async function executeDownloads() {
    if (isSelectModeActive && selectedItems.size > 0) {
        for (const fileItem of selectedItems) {
            const itemURL = getItemURL(fileItem);
            if (!itemURL) continue;

            downloadURL(itemURL + "?get=file");
            await delay(100);
        }
    } else {
        downloadURL(basePath + "?get=file");
    }
}

// ============================================================================
// DELETE OPERATIONS
// ============================================================================

async function executeDeletes() {
    if (!isSelectModeActive || !selectedItems.size) return;
    if (!confirm("Are you sure to delete?")) return;

    let errorMessage = null;

    for (const fileItem of selectedItems) {
        const itemURL = getItemURL(fileItem);
        const response = await fetch(itemURL, { method: "DELETE" });

        if (response.ok) {
            await delay(100);
            continue;
        }
        switch (response.status) {
            case 403:
                errorMessage = "You dont have permission to do that";
                break;
            case 404:
                errorMessage = "That file/folder does not exist";
                break;
            default:
                errorMessage = "Something went wrong on the server";
                break;
        }
        await delay(100);
    }
    if (errorMessage) alert(errorMessage);
    location.reload();
}

// ============================================================================
// HTTP REQUEST HANDLING
// ============================================================================

async function sendHTTPRequest(path, destination, method) {
    try {
        const requestOptions = { method };
        if (destination)
            requestOptions.headers = {
                Destination: decodeURIComponent(destination)
            };
        const response = await fetch(path, requestOptions);
        if (!response.ok) throw response.status;
        return true;

    } catch (statusCode) {
        const errorMessages = {
            403: "You don't have permission to do that",
            404: "That file/folder does not exist",
            409: "It already exists",
            507: "Not enough free space"
        };
        alert(errorMessages[statusCode] || "Something went wrong");
        return false;
    }
}

// ============================================================================
// RENAME OPERATIONS
// ============================================================================

async function renameSelectedFiles() {
    if (!isSelectModeActive || !selectedItems.size) return;

    for (const itemURL of getSelectedURLs()) {
        const cleanURL = itemURL.replace(/\/$/, "");
        const fileName = decodeURIComponent(cleanURL.split("/").pop());
        const newFileName = prompt("New Name for " + fileName);

        if (!newFileName) break;
        const encodedNewName = encodeURIComponent(newFileName);
        const destinationPath = cleanURL.substring(0, cleanURL.lastIndexOf("/")) + "/" + encodedNewName;
        if (!await sendHTTPRequest(cleanURL, destinationPath, "MOVE")) break;
    }
    clearAllCopyMoveOperations();
    location.reload();
}

// ============================================================================
// PASTE OPERATIONS
// ============================================================================

async function pasteFiles() {
    const copyList = JSON.parse(localStorage.getItem("copy") || "[]");
    const moveList = JSON.parse(localStorage.getItem("move") || "[]");
    let pasteOperation = {};

    if (copyList.length)
        pasteOperation = { list: copyList, mode: "COPY" };
    else if (moveList.length)
        pasteOperation = { list: moveList, mode: "MOVE" };

    if (!pasteOperation.list) return;
    showLoader();
    await delay(250);

    for (let i = 0; i < pasteOperation.list.length; i++) {
        const sourcePath = pasteOperation.list[i].replace(/\/$/, "");
        const destinationPath = basePath + sourcePath.split("/").pop();
        if (!await sendHTTPRequest(sourcePath, destinationPath, pasteOperation.mode)) break;
    }
    clearAllCopyMoveOperations();
    location.reload();
}

// ============================================================================
// DIRECTORY CREATION
// ============================================================================

async function createDirectory() {
    const directoryName = prompt("Create dir");
    if (!directoryName) return;
    const encodedName = encodeURIComponent(directoryName);
    const success = await sendHTTPRequest(basePath + encodedName, null, "MKCOL");
    if (success) location.reload();
}

// ============================================================================
// FILE UPLOAD MANAGEMENT
// ============================================================================

async function createDirectoryStructure(files) {
    const directories = new Set();

    for (const file of files) {
        const pathParts = file.webkitRelativePath.split("/");
        for (let i = 1; i < pathParts.length; i++) {
            const directoryPath = pathParts.slice(0, i).join("/");
            directories.add(directoryPath);
        }
    }
    for (const directory of directories) {
        const directoryURL = basePath + encodePath(directory);
        const response = await fetch(directoryURL, { method: "MKCOL" });
        if (!response.ok) throw response.status;
    }
}

function uploadFileWithProgress(file, uploadURL, progressCallback) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadURL);

        xhr.upload.onprogress = event => {
            if (event.lengthComputable && progressCallback)
                progressCallback(event.loaded, event.total);
        };
        xhr.onload = ()=>{
            if (xhr.status >= 200 && xhr.status < 300)
                resolve();
            else
                reject(xhr.status);
        };
        xhr.onerror = () => reject("Connection Error");
        xhr.send(file);
    });
}

async function uploadFiles(files, isDirectory) {
    showLoader();
    let totalBytes = 0;
    let uploadedBytes = 0;

    for (let file of files) totalBytes += file.size;
    if (isDirectory) await createDirectoryStructure(files);

    for (let i = 0; i < files.length; i++) {
        let file = files[i];
        let filePath;

        if (isDirectory)
            filePath = file.webkitRelativePath;
        else
            filePath = file.name;

        filePath = basePath + encodePath(filePath);
        try {
            await uploadFileWithProgress(file, filePath, (loaded, total) => {
                let totalUploaded = uploadedBytes + loaded;
                let percent = (totalUploaded / totalBytes) * 100;
                progressBar.textContent = percent.toFixed(2) + "%";
            });
            uploadedBytes += file.size;

        } catch (statusCode) {
            const errorMessages = {
                400: "Invalid upload data",
                403: "You don't have permission to do that",
                409: "It already exists",
                507: "Not enough free space",
                500: "Server Error"
            };
            alert(errorMessages[statusCode] || "Upload Error");
            break;  // stop uploading more files on error
        }
    }
    location.reload();
}

// ============================================================================
// UPLOAD ENTRYPOINTS
// ============================================================================

function openFileUploadMenu(selectDirectory = false) {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.multiple = !selectDirectory;

    if (selectDirectory)
        fileInput.setAttribute("webkitdirectory", true);

    fileInput.onchange = ()=>{
        const msg = "Upload " + fileInput.files.length + " item(s)?";
        if (fileInput.files.length && (selectDirectory || confirm(msg)))
            uploadFiles(fileInput.files, selectDirectory);
    };
    fileInput.click();
}

function enableDragAndDropUpload(dropArea) {
    dropArea.addEventListener("dragover", event => {
        event.preventDefault();
    });
    dropArea.addEventListener("drop", event => {
        event.preventDefault();
        const files = Array.prototype.slice.call(event.dataTransfer.files);

        const msg = "¿Upload " + files.length + " item(s)?";
        if (files.length && confirm(msg)) uploadFiles(files);
    });
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
            else
                window.location.href = "..";
            break;

        case "backspace":
            window.location.href = "..";
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
        case "h":
            window.location.href = "/";
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

// ============================================================================
// INITIALIZATION
// ============================================================================

enableDragAndDropUpload(document);

 