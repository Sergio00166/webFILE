/* Code by Sergio00166 */

function showLoader() {
    document.getElementById("loader").style.display = "";
    document.querySelector(".list-group").style.display = "none";
}

function changeURL(mode) {
    var url = window.location.href;
    var urlObj = new URL(url);
    urlObj.searchParams.set("sort", mode);
    window.history.replaceState({}, document.title, urlObj.href);
    window.location.reload();
}

let selectMode = false;
const selectedElements = {};

function toggleSelectMode() {
    selectMode = !selectMode;
    const buttonText = selectMode ? 'CANCEL' : 'SELECT';
    document.getElementById('selectBtn').textContent = buttonText;
    document.getElementById('delBtn').disabled = !selectMode;
    document.getElementById('copyBtn').disabled = !selectMode;
    document.getElementById('moveBtn').disabled = !selectMode;
    document.getElementById('renBtn').disabled = !selectMode;
    document.getElementById('invertBtn').disabled = !selectMode;
    if (!selectMode) {
        deselectAll();
    }
}

function deselectAll() {
    document.querySelectorAll('.filename.selected').forEach(div => {
        div.classList.remove('selected');
        delete selectedElements[div.id];
    });
}

function selectDiv(divId) {
    if (selectMode) {
        const div = document.getElementById(divId);
        if (div) {
            if (selectedElements[divId]) {
                delete selectedElements[divId];
                div.classList.remove('selected');
            } else {
                selectedElements[divId] = div;
                div.classList.add('selected');
            }
        }
    }
}

function handleDivClick(div) {
    if (selectMode) {
        selectDiv(div.id);
    } else {
        const url = div.getAttribute('data-value');
        if (url) {
            if (div.hasAttribute('dir')) {
                window.location.href = url;
            } else {
                window.open(url, '_blank');
            }
        }
    }
}

function downloadURL(downloadUrl) {
    const tempLink = document.createElement('a');
    tempLink.href = downloadUrl;
    tempLink.download = "";
    tempLink.style.display = 'none';
    document.body.appendChild(tempLink);
    tempLink.click();
    document.body.removeChild(tempLink);
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function executeDownloads() {
    if (selectMode) {
        for (const id in selectedElements) {
            const div = selectedElements[id];
            var url = div.getAttribute('data-value');
            if (url) {
                if (div.hasAttribute('dir')) {
                    if (!url.endsWith("/")) {
                        url += "/";
                    }
                    mode = '?tar';
                } else {
                    mode = '?raw';
                }
                downloadURL(url + mode);
                await delay(100);
            }
        }
    } else {
        var url = new URL(window.location.href).pathname;
        if (url == "/" || url == "") {
            url = '';
        }
        if (!url.endsWith("/")) {
            url += "/";
        }
        const newURL = url + '?tar';
        downloadURL(newURL);
    }
}

async function executeDeletes() {
    if ((selectMode) && (Object.keys(selectedElements).length > 0)) {
        msg = null;
        const sure = confirm("Are you sure to delete?");
        if (sure) {
            for (const id in selectedElements) {
                const div = selectedElements[id];
                const url = div.getAttribute('data-value');
                if (url) {
                    const response = await fetch(
                        url, {
                            method: 'DELETE'
                        }
                    );
                    if (response.status === 403) {
                        msg = 'You dont have permission to do that';
                    } else if (response.status === 404) {
                        msg = 'That file/folder does not exist';
                    } else if (response.status === 500) {
                        msg = 'Something went wrong on the server.';
                    }
                    await delay(100);
                }
            }
            if (msg !== null) {
                alert(msg);
            }
            window.location.reload();
        }
    }
}

function invertSelection() {
    if (selectMode) {
        const allDivs = document.querySelectorAll('.filename');
        allDivs.forEach(div => {
            const id = div.id;
            if (selectedElements[id]) {
                delete selectedElements[id];
                div.classList.remove('selected');
            } else {
                selectedElements[id] = div;
                div.classList.add('selected');
            }
        });
    }
}

// Bind click handling to divs
document.addEventListener('DOMContentLoaded', () => {
    const container = document.querySelector('div.container');
    container.addEventListener('click', (event) => {
        const div = event.target.closest('div.filename');
        if (div) {
            handleDivClick(div);
        }
    });
});

function set_cp_temp(list) {
    if (selectMode) {
        toggleSelectMode();
    }
    localStorage.setItem('copy', JSON.stringify(list));
}

function set_mv_temp(list) {
    if (selectMode) {
        toggleSelectMode();
    }
    localStorage.setItem('move', JSON.stringify(list));
}

function clearAllMvCp() {
    localStorage.removeItem('move');
    localStorage.removeItem('copy');
}

function getURLlist() {
    list = [];
    for (const id in selectedElements) {
        const div = selectedElements[id];
        const url = div.getAttribute('data-value');
        if (url) {
            list.push(url);
        }
    }
    return list;
}


function copyFiles() {
    clearAllMvCp();
    if ((selectMode) && (Object.keys(selectedElements).length > 0)) {
        list = getURLlist();
        if (list != []) {
            set_cp_temp(list);
        }
    }
}

function moveFiles() {
    clearAllMvCp();
    if ((selectMode) && (Object.keys(selectedElements).length > 0)) {
        list = getURLlist();
        if (list != []) {
            set_mv_temp(list);
        }
    }
}

function renameFiles() {
    if ((selectMode) && (Object.keys(selectedElements).length > 0)) {
        const items = getURLlist();
        for (var item of items) {
            item = item.endsWith('/') ? item.slice(0, -1) : item;
            name = item.split('/').pop();
            var dest = prompt('New Name for ' + name);
            if (dest === null) {
                break;
            }
            dest = item.substring(0, item.lastIndexOf("/")) + "/" + dest;
            const success = sendRequest(item, dest, "MOVE");
            if (!success) break;
        }
        clearAllMvCp();
        window.location.reload();
    }
}

function sendRequest(path, destination, method) {
    const xhr = new XMLHttpRequest();
    xhr.open(method, path, false);
    if (destination) {
        destination = decodeURIComponent(destination);
        xhr.setRequestHeader("Destination", destination);
    }
    xhr.send();
    if (xhr.status !== 200) {
        let msg;
        if (xhr.status === 403) {
            msg = 'You don’t have permission to do that';
        } else if (xhr.status === 404) {
            msg = 'That file/folder does not exist';
        } else if (xhr.status === 500) {
            msg = 'Something went wrong on the server.';
        } else if (xhr.status === 409) {
            msg = 'It already exists';
        } else if (xhr.status === 507) {
            msg = 'Not enough free space';
        } else {
            msg = 'Something went wrong';
        }
        alert(msg);
        return false;
    }
    return true;
}

function pasteFiles() {
    const cpList = JSON.parse(localStorage.getItem('copy')) || [];
    const mvList = JSON.parse(localStorage.getItem('move')) || [];
    var destUrl = window.location.pathname;
    destUrl = destUrl.endsWith('/') ? destUrl.slice(0, -1) : destUrl;
    if (destUrl === "") {
        destUrl += "/";
    }
    let toPaste = cpList;
    let mode = "COPY";
    if (toPaste.length === 0) {
        toPaste = mvList;
        mode = "MOVE";
    } // Chech if empty
    if (toPaste.length === 0) {
        return;
    }
    showLoader(); // Show loading screen

    setTimeout(() => {
        for (var path of toPaste) {
            path = path.endsWith('/') ? path.slice(0, -1) : path
            const dest = destUrl + "/" + path.split('/').pop();
            const success = sendRequest(path, dest, mode);
            if (!success) {
                break;
            }
        }
        clearAllMvCp();
        window.location.reload();
    }, 250);
}

function mkdir() {
    var dest = prompt('Create dir');
    if (dest === null) {
        return;
    }
    var url = window.location.pathname;
    url = url.endsWith('/') ? url.slice(0, -1) : url;
    const success = sendRequest(url + "/" + dest, null, "MKCOL");
    if (success) {
        window.location.reload();
    }
}


// Upload functions

function openFileMenu(selectDirectory = false) {
    const input = document.createElement("input");

    if (selectDirectory) {
        input.webkitdirectory = true;
    } else {
        input.multiple = true;
    }
    input.type = "file";

    input.addEventListener("change", function() {
        if (input.files.length > 0) {
            let confirmUpload;
            if (!selectDirectory) {
                confirmUpload = confirm(`Upload ${input.files.length} item(s)?`);
            }
            if (selectDirectory || confirmUpload) {
                uploadFiles(input.files, selectDirectory);
            }
        }
    });
    input.click();
}

function uploadFiles(files, isDirectory = false) {
    const formData = new FormData();
    for (const file of files) {
        formData.append("upload", file);
    }
    const uploadEndpoint = isDirectory ? "?updir" : "?upfile";
    showLoader(); // Show loading screen
    fetch(uploadEndpoint, {
        method: "POST",
        body: formData
    }).then(response => {
        if (!response.ok) {
            let msg;
            switch (response.status) {
                case 403:
                    msg = "You don’t have permission to do that.";
                    break;
                case 500:
                    msg = "Something went wrong on the server.";
                    break;
                case 409:
                    msg = "It already exists.";
                    break;
                case 507:
                    msg = "Not enough free space.";
                    break;
                default:
                    msg = "Something went wrong.";
            }
            alert(msg);
        }
    }).catch(() => { alert("Fatal Error") });
	window.location.reload();
}

function enableDragAndDropUpload(dropArea, selectDirectory = false) {
    dropArea.addEventListener("dragover", function(e) {
        e.preventDefault();
    });
    dropArea.addEventListener("drop", function(e) {
        e.preventDefault();
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const confirmUpload = confirm(`Upload ${files.length} item(s)?`);
            if (confirmUpload) {
                uploadFiles(files, selectDirectory); // Upload files after confirmation
            }
        }
    });
}

// Upload actions
function upfile() { openFileMenu(); }
function updir() { openFileMenu(true); }
enableDragAndDropUpload(document);
