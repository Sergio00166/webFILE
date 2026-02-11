/* Code by Sergio00166 */

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
    renderFolder();
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
    renderFolder();
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
    hideLoader();
    renderFolder();
}

// ============================================================================
// DIRECTORY CREATION
// ============================================================================

async function createDirectory() {
    const directoryName = prompt("Create dir");
    if (!directoryName) return;
    const encodedName = encodeURIComponent(directoryName);
    const success = await sendHTTPRequest(basePath + encodedName, null, "MKCOL");
    if (success) renderFolder();
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
    hideLoader();
    renderFolder();
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
// INITIALIZATION
// ============================================================================

enableDragAndDropUpload(document);

 