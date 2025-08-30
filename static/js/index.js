/* Code by Sergio00166 */
/*
All paths are (and must be) encoded by default, also the items dataset
Except the Destination Header THAT MUST BE NOT ENCODED.
Base path variable (base) ends with '/' always.
*/

// ============================================================================
// DOM ELEMENTS - BUTTONS
// ============================================================================

const selectButton = document.getElementById('selectBtn');
const deleteButton = document.getElementById('delBtn');
const copyButton = document.getElementById('copyBtn');
const moveButton = document.getElementById('moveBtn');
const renameButton = document.getElementById('renBtn');
const invertButton = document.getElementById('invertBtn');

// ============================================================================
// DOM ELEMENTS - UI COMPONENTS
// ============================================================================

const progressBar = document.getElementById('progress');
const sidebarElement = document.getElementById('sidebar');
const loaderElement = document.getElementById('loader');
const mainContainerElement = document.querySelector('.main-container');
const listGroupElement = document.querySelector('.list-group');
const backDirectoryButton = document.getElementById('backdir');
const loginButton = document.getElementById('login');

// ============================================================================
// DOM ELEMENTS - SORTING
// ============================================================================

const sortByNameButton = document.getElementById('sortName');
const sortBySizeButton = document.getElementById('sortSize');
const sortByDateButton = document.getElementById('sortDate');

// ============================================================================
// GLOBAL VARIABLES
// ============================================================================

const bodyElement = document.body;
const basePath = (location.pathname.replace(/\/$/, '') || '') + '/';
const selectedItems = new Map();
let isSelectModeActive = false;

// ============================================================================
// BUTTON STATE MANAGEMENT
// ============================================================================

function updateButtonStates() {
    invertButton.disabled = !isSelectModeActive;
    copyButton.disabled = !isSelectModeActive;
    moveButton.disabled = !isSelectModeActive;
    renameButton.disabled = !isSelectModeActive;
    deleteButton.disabled = !isSelectModeActive;
}

// ============================================================================
// SIDEBAR MANAGEMENT
// ============================================================================

function toggleSidebar() {
    sidebarElement.classList.toggle('open');
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function encodePath(path) {
    return path.split('/').map(encodeURIComponent).join('/');
}

function delay(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

// ============================================================================
// FILE OPERATIONS - COPY & MOVE
// ============================================================================

function copySelectedFiles() {
    performStorageOperation('copy', getSelectedURLs());
}

function moveSelectedFiles() {
    performStorageOperation('move', getSelectedURLs());
}

function clearAllCopyMoveOperations() {
    ['copy', 'move'].forEach(key => localStorage.removeItem(key));
}

function performStorageOperation(operationKey, fileList) {
    if (isSelectModeActive) toggleSelectMode();
    if (fileList && fileList.length) {
        localStorage.setItem(operationKey, JSON.stringify(fileList));
    }
}

function getSelectedURLs() {
    return Array.from(selectedItems.values())
        .map(div => div.dataset.value)
        .filter(Boolean);
}

// ============================================================================
// LOADER & UI MANAGEMENT
// ============================================================================

function showLoader() {
    if (loaderElement) loaderElement.style.display = '';
    if (mainContainerElement) mainContainerElement.style.display = 'none';
}

// ============================================================================
// URL & SORTING MANAGEMENT
// ============================================================================

function changeSortingMode(sortMode) {
    const currentURL = new URL(window.location.href);
    currentURL.searchParams.set('sort', sortMode);
    history.replaceState({}, document.title, currentURL);
    location.reload();
}

// ============================================================================
// SELECTION MODE MANAGEMENT
// ============================================================================

function toggleSelectMode() {
    isSelectModeActive = !isSelectModeActive;
    
    if (selectButton) {
        selectButton.textContent = isSelectModeActive ? '❌ Cancel' : '✅ Enable';
    }
    
    updateButtonStates();
    
    if (!isSelectModeActive) {
        deselectAllItems();
    }
}

function deselectAllItems() {
    selectedItems.forEach((div, id) => {
        div.classList.remove('selected');
    });
    selectedItems.clear();
}

function selectItem(div) {
    const itemId = div.id;
    
    if (selectedItems.has(itemId)) {
        div.classList.remove('selected');
        selectedItems.delete(itemId);
    } else {
        div.classList.add('selected');
        selectedItems.set(itemId, div);
    }
}

function invertSelection() {
    if (!isSelectModeActive) return;
    
    const filenameElements = document.getElementsByClassName('filename');
    for (let i = 0; i < filenameElements.length; i++) {
        selectItem(filenameElements[i]);
    }
}

// ============================================================================
// ITEM INTERACTION
// ============================================================================

function handleItemClick(div) {
    if (isSelectModeActive) {
        selectItem(div);
    } else {
        const itemURL = div.dataset.value;
        if (!itemURL) return;
        
        if (div.hasAttribute('isdir')) {
            location.href = itemURL;
        } else {
            window.open(itemURL, '_blank');
        }
    }
}

// ============================================================================
// DOWNLOAD MANAGEMENT
// ============================================================================

function downloadURL(url) {
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = '';
    downloadLink.style.display = 'none';
    bodyElement.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
}

async function executeDownloads() {
    if (isSelectModeActive && selectedItems.size > 0) {
        for (const div of selectedItems.values()) {
            const itemURL = div.dataset.value;
            if (!itemURL) continue;
            
            const suffix = div.hasAttribute('isdir') ? '?tar' : '?raw';
            downloadURL(itemURL + suffix);
            await delay(100);
        }
    } else {
        downloadURL(basePath + '?tar');
    }
}

// ============================================================================
// DELETE OPERATIONS
// ============================================================================

async function executeDeletes() {
    if (!isSelectModeActive || !selectedItems.size) return;
    
    if (!confirm('Are you sure to delete?')) return;
    
    let errorMessage = null;
    
    for (const div of selectedItems.values()) {
        const response = await fetch(div.dataset.value, { method: 'DELETE' });
        
        if (!response.ok) {
            errorMessage = response.status === 403 ? 'You dont have permission to do that' :
                          response.status === 404 ? 'That file/folder does not exist' :
                          'Something went wrong on the server.';
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
        
        if (destination) {
            requestOptions.headers = { 
                Destination: decodeURIComponent(destination)
            };
        }
        
        const response = await fetch(path, requestOptions);
        
        if (!response.ok) throw response.status;
        
        return true;
    } catch (statusCode) {
        const errorMessages = {
            403: 'You don\'t have permission to do that',
            404: 'That file/folder does not exist',
            409: 'It already exists',
            507: 'Not enough free space'
        };
        
        alert(errorMessages[statusCode] || 'Something went wrong');
        return false;
    }
}

// ============================================================================
// RENAME OPERATIONS
// ============================================================================

async function renameSelectedFiles() {
    if (!isSelectModeActive || !selectedItems.size) return;
    
    for (const itemURL of getSelectedURLs()) {
        const cleanURL = itemURL.replace(/\/$/, '');
        const fileName = decodeURIComponent(cleanURL.split('/').pop());
        const newFileName = prompt('New Name for ' + fileName);
        
        if (!newFileName) break;
        
        const encodedNewName = encodeURIComponent(newFileName);
        const destinationPath = cleanURL.substring(0, cleanURL.lastIndexOf('/')) + '/' + encodedNewName;
        
        if (!await sendHTTPRequest(cleanURL, destinationPath, 'MOVE')) break;
    }
    
    clearAllCopyMoveOperations();
    location.reload();
}

// ============================================================================
// PASTE OPERATIONS
// ============================================================================

async function pasteFiles() {
    const copyList = JSON.parse(localStorage.getItem('copy') || '[]');
    const moveList = JSON.parse(localStorage.getItem('move') || '[]');
    
    const pasteOperation = copyList.length ? 
        { list: copyList, mode: 'COPY' } : 
        moveList.length ? { list: moveList, mode: 'MOVE' } : {};
    
    if (!pasteOperation.list) return;
    
    showLoader();
    await delay(250);
    
    for (let i = 0; i < pasteOperation.list.length; i++) {
        const sourcePath = pasteOperation.list[i].replace(/\/$/, '');
        const destinationPath = basePath + sourcePath.split('/').pop();
        
        if (!await sendHTTPRequest(sourcePath, destinationPath, pasteOperation.mode)) break;
    }
    
    clearAllCopyMoveOperations();
    location.reload();
}

// ============================================================================
// DIRECTORY CREATION
// ============================================================================

async function createDirectory() {
    const directoryName = prompt('Create dir');
    if (!directoryName) return;
    
    const encodedName = encodeURIComponent(directoryName);
    const success = await sendHTTPRequest(basePath + encodedName, null, 'MKCOL');
    
    if (success) location.reload();
}

// ============================================================================
// FILE UPLOAD MANAGEMENT
// ============================================================================

function openFileUploadMenu(selectDirectory = false) {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = !selectDirectory;
    
    if (selectDirectory) {
        fileInput.setAttribute('webkitdirectory', true);
    }

    fileInput.onchange = () => {
        if (fileInput.files.length && (selectDirectory || confirm('Upload ' + fileInput.files.length + ' item(s)?'))) {
            uploadFiles(fileInput.files, selectDirectory);
        }
    };
    
    fileInput.click();
}

async function createDirectoryStructure(files) {
    const directories = new Set();

    for (const file of files) {
        const pathParts = file.webkitRelativePath.split('/');
        for (let i = 1; i < pathParts.length; i++) {
            const directoryPath = pathParts.slice(0, i).join('/');
            directories.add(directoryPath);
        }
    }
    
    for (const directory of directories) {
        const directoryURL = basePath + encodePath(directory);
        const response = await fetch(directoryURL, { method: 'MKCOL' });
        
        if (!response.ok) throw response.status;
    }
}

function uploadFileWithProgress(file, uploadURL, progressCallback) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadURL);

        xhr.upload.onprogress = event => {
            if (event.lengthComputable && progressCallback) {
                progressCallback(event.loaded, event.total);
            }
        };
        
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve();
            } else {
                reject(xhr.status);
            }
        };
        
        xhr.onerror = () => { reject('Connection Error'); };
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
        let filePath = isDirectory ? file.webkitRelativePath : file.name;
        filePath = basePath + encodePath(filePath);

        try {
            await uploadFileWithProgress(file, filePath, (loaded, total) => {
                let totalUploaded = uploadedBytes + loaded;
                let percent = (totalUploaded / totalBytes) * 100;
                progressBar.textContent = percent.toFixed(2) + '%';
            });
            
            uploadedBytes += file.size;

        } catch (statusCode) {
            const errorMessages = {
                400: 'Invalid upload data',
                403: 'You don\'t have permission to do that',
                409: 'It already exists',
                507: 'Not enough free space',
                500: 'Server Error'
            };
            
            alert(errorMessages[statusCode] || 'Connection Error');
            break;  // stop uploading more files on error
        }
    }
    
    location.reload();
}

// ============================================================================
// DRAG AND DROP UPLOAD
// ============================================================================

function enableDragAndDropUpload(dropArea, selectDirectory = false) {
    dropArea.addEventListener('dragover', event => { 
        event.preventDefault(); 
    });
    
    dropArea.addEventListener('drop', event => {
        event.preventDefault();
        const files = Array.prototype.slice.call(event.dataTransfer.files);
        
        if (files.length && confirm('¿Upload ' + files.length + ' item(s)?')) {
            uploadFiles(files, selectDirectory);
        }
    });
}

// ============================================================================
// KEYBOARD NAVIGATION
// ============================================================================

function moveFocus(direction) {
    const items = Array.from(listGroupElement.children);
    if (items.length === 0) return;

    let currentIndex = items.indexOf(document.activeElement);
    
    if (direction === -Infinity) {
        currentIndex = 0;
    } else if (direction === Infinity) {
        currentIndex = items.length - 1;
    } else {
        currentIndex = (currentIndex + direction + items.length) % items.length;
    }

    items[currentIndex].focus();
}

// ============================================================================
// EVENT LISTENERS - LIST GROUP
// ============================================================================

listGroupElement.addEventListener('click', event => {
    const clickedItem = event.target.closest('.filename');
    if (clickedItem) handleItemClick(clickedItem);
});

listGroupElement.addEventListener('keydown', event => {
    const focusedItem = event.target.closest('.filename');
    if ((event.key === 'Enter' || event.key === ' ') && focusedItem) {
        event.preventDefault();
        handleItemClick(focusedItem);
    }
});

// ============================================================================
// EVENT LISTENERS - KEYBOARD SHORTCUTS
// ============================================================================

document.addEventListener('keydown', event => {
    const key = event.key.toLowerCase();
    const isShiftArrow = event.shiftKey && (key === 'arrowleft' || key === 'arrowright');

    if ((event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) && !isShiftArrow) return;

    switch (key) {
        case 'arrowdown':
        case 'arrowup':
            event.preventDefault();
            if (key === "arrowup") moveFocus(-1);
            else moveFocus(1);
            break;            
        case 'home':
        case 'end':
            event.preventDefault();
            if (key === "end") moveFocus(Infinity);
            else moveFocus(-Infinity);
            break;
        case 'arrowright':
            event.preventDefault();
            if (isShiftArrow) {
                listGroupElement.scrollTo({
                    left: listGroupElement.scrollWidth, 
                    behavior: 'smooth' 
                });
            } else {
                document.activeElement.click();
            }
            break;
        case 'arrowleft':
            event.preventDefault();
            if (isShiftArrow) {
                listGroupElement.scrollTo({ 
                    left: 0, 
                    behavior: 'smooth' 
                });
            } else if (isSelectModeActive) {
                document.activeElement.click();
            } else {
                window.location.href = '..';
            }
            break;
        case 'a': 
            invertSelection(); 
            break;
        case 'd': 
            executeDownloads(); 
            break;
        case 'c': 
            copySelectedFiles(); 
            break;
        case 'x': 
            moveSelectedFiles(); 
            break;
        case 'p': 
            pasteFiles(); 
            break;
        case 'u': 
            openFileUploadMenu(); 
            break;
        case 'f': 
            openFileUploadMenu(true); 
            break;
        case 's': 
            toggleSelectMode(); 
            break;
        case 'n': 
            renameSelectedFiles(); 
            break;
        case 'r': 
            executeDeletes(); 
            break;
        case 'm': 
            createDirectory(); 
            break;
        case 'l': 
            loginButton.click(); 
            break;
        case 'i': 
            window.location.href = '/'; 
            break;
        case '1': 
            sortByNameButton.click(); 
            break;
        case '2': 
            sortBySizeButton.click(); 
            break;
        case '3': 
            sortByDateButton.click(); 
            break;
    }
});

// ============================================================================
// INITIALIZATION
// ============================================================================

enableDragAndDropUpload(document);

 
