/* Code by Sergio00166 /*
/*
All paths are (and must be) encoded by default, also the items dataset
Except the Destination Header THAT MUST BE NOT ENCODED.
Base path variable (base) ends with '/' always.
*/

const selectBtn   = document.getElementById('selectBtn');
const delBtn      = document.getElementById('delBtn');
const copyBtn     = document.getElementById('copyBtn');
const moveBtn     = document.getElementById('moveBtn');
const renBtn      = document.getElementById('renBtn');
const invertBtn   = document.getElementById('invertBtn');
const progress    = document.getElementById('progress');
const sidebar     = document.getElementById('sidebar');
const loader      = document.getElementById('loader');
const mainContainer = document.querySelector('.main-container');
const listGroup   = document.querySelector('.list-group');
const backdir     = document.getElementById('backdir');
const login       = document.getElementById('login');
const sortName    = document.getElementById('sortName');
const sortSize    = document.getElementById('sortSize');
const sortDate    = document.getElementById('sortDate');
const body        = document.body;

const base = (location.pathname.replace(/\/$/, '') || '') + '/';
const selected = new Map();
let selectMode = false;


function updateButtonStates() {
    invertBtn.disabled = !selectMode;
    copyBtn.disabled   = !selectMode;
    moveBtn.disabled   = !selectMode;
    renBtn.disabled    = !selectMode;
    delBtn.disabled    = !selectMode;
}
function toggleSidebar() {
    sidebar.classList.toggle('open');
}
function encodePath(path) {
    return path.split('/').map(encodeURIComponent).join('/');
}
function delay(ms) {
    return new Promise(r => setTimeout(r, ms));
}

function copyFiles() {
    storageOp('copy', getURLlist());
}
function moveFiles() {
    storageOp('move', getURLlist());
}
function clearAllMvCp() {
    ['copy', 'move'].forEach(k => localStorage.removeItem(k));
}

function showLoader() {
    if (loader) loader.style.display = '';
    if (mainContainer) mainContainer.style.display = 'none';
}

function changeURL(mode) {
    var url = new URL(window.location.href);
    url.searchParams.set('sort', mode);
    history.replaceState({}, document.title, url);
    location.reload();
}

function toggleSelectMode() {
    selectMode = !selectMode;
    if (selectBtn) {
        selectBtn.textContent = selectMode ? '❌ Cancel' : '✅ Enable';
    }
    updateButtonStates();
    if (!selectMode) deselectAll();
}

function deselectAll() {
    selected.forEach((div, id) => {
        div.classList.remove('selected');
    });
    selected.clear();
}

function selectDiv(div) {
    var id = div.id;
    if (selected.has(id)) {
        div.classList.remove('selected');
        selected.delete(id);
    } else {
        div.classList.add('selected');
        selected.set(id, div);
    }
}

function handleDivClick(div) {
    if (selectMode) selectDiv(div);
    else {
        var url = div.dataset.value;
        if (!url) return;
        if (div.hasAttribute('isdir')) location.href = url;
        else window.open(url, '_blank');
    }
}

function downloadURL(url) {
    var a = document.createElement('a');
    a.href = url;
    a.download = '';
    a.style.display = 'none';
    body.appendChild(a);
    a.click();
    a.remove();
}

async function executeDownloads() {
    if (selectMode && selected.size > 0) {
        for (var div of selected.values()) {
            var url = div.dataset.value;
            if (!url) continue;
            var suffix = div.hasAttribute('isdir') ? '?tar' : '?raw';
            downloadURL(url + suffix);
            await delay(100);
        }
    } else downloadURL(base+'?tar');
}

async function executeDeletes() {
    if (!selectMode || !selected.size) return;
    if (!confirm('Are you sure to delete?')) return;
    var msg = null;
    for (var div of selected.values()) {
        var res = await fetch(div.dataset.value, { method: 'DELETE' });
        if (!res.ok) {
            msg = res.status === 403 ? 'You dont have permission to do that' :
                  res.status === 404 ? 'That file/folder does not exist' :
                  'Something went wrong on the server.';
        }
        await delay(100);
    }
    if (msg) alert(msg);
    location.reload();
}

function invertSelection() {
    if (!selectMode) return;
    var elements = document.getElementsByClassName('filename');
    for (var i = 0; i < elements.length; i++) {
        selectDiv(elements[i]);
    }
}

function storageOp(key, list) {
    if (selectMode) toggleSelectMode();
    if (list && list.length) localStorage.setItem(key, JSON.stringify(list));
}

function getURLlist() {
    return Array.from(selected.values())
        .map(div => div.dataset.value)
        .filter(Boolean);
}

async function sendRequest(path, dest, method) {
    try {
        const opts = { method };
        if (dest) opts.headers = { 
            Destination: decodeURIComponent(dest)
        };
        const res = await fetch(path, opts);
        if (!res.ok) throw res.status;
        return true;
    } catch (status) {
        const msgs = {
            403: 'You don\'t have permission to do that',
            404: 'That file/folder does not exist',
            409: 'It already exists',
            507: 'Not enough free space'
        };
        alert(msgs[status] || 'Something went wrong');
        return false;
    }
}

async function renameFiles() {
    if (!selectMode || !selected.size) return;
    for (var item of getURLlist()) {
        var url = item.replace(/\/$/, '');
        var name = decodeURIComponent(url.split('/').pop());
        var destName = prompt('New Name for ' + name);
        if (!destName) break;
        destName = encodeURIComponent(destName);
        var dest = url.substring(0, url.lastIndexOf('/'))+'/'+destName;
        if (!await sendRequest(url, dest, 'MOVE')) break;
    }
    clearAllMvCp();
    location.reload();
}

async function pasteFiles() {
    var cp = JSON.parse(localStorage.getItem('copy') || '[]');
    var mv = JSON.parse(localStorage.getItem('move') || '[]');
    var toPaste = cp.length ? { list: cp, mode: 'COPY' } : mv.length ? { list: mv, mode: 'MOVE' } : {};
    if (!toPaste.list) return;
    showLoader();
    await delay(250);
    for (var i = 0; i < toPaste.list.length; i++) {
        var p = toPaste.list[i].replace(/\/$/, '');
        var dest = base + p.split('/').pop();
        if (!await sendRequest(p, dest, toPaste.mode)) break;
    }
    clearAllMvCp();
    location.reload();
}

async function mkdir() {
    var name = prompt('Create dir');
    if (!name) return;
    name = encodeURIComponent(name);
    if (await sendRequest(base + name, null, 'MKCOL')) location.reload();
}

function openFileMenu(selectDir) {
    var inp = document.createElement('input');
    inp.type = 'file';
    inp.multiple = !selectDir;
    if (selectDir) inp.setAttribute('webkitdirectory', true);

    inp.onchange = () => {
        if (inp.files.length && (selectDir || confirm('Upload '+inp.files.length+' item(s)?'))) {
            uploadFiles(inp.files, selectDir);
        }
    };
    inp.click();
}

async function createFolders(files) {
    const dirs = new Set();

    for (const f of files) {
        const parts = f.webkitRelativePath.split('/');
        for (let i = 1; i < parts.length; i++) {
            const dirPath = parts.slice(0, i).join('/');
            dirs.add(dirPath);
        }
    }
    for (const dir of dirs) {
        var path = base + encodePath(dir);
        var r = await fetch(path, { method: 'MKCOL' });
        if (!r.ok) throw r.status;
    }
}

function uploadFileWithProgress(file, url, onProgress) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', url);

        xhr.upload.onprogress = event => {
            if (event.lengthComputable && onProgress) {
                onProgress(event.loaded, event.total);
            }
        };
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve();
            } else reject(xhr.status);
        };
        xhr.onerror = () => { reject('Connection Error'); };
        xhr.send(file);
    });
}

async function uploadFiles(files, isDir) {
    showLoader();
    let totalBytes = 0;
    let uploadedBytes = 0;

    for (let f of files) totalBytes += f.size;
    if (isDir) await createFolders(files);

    for (let i = 0; i < files.length; i++) {
        let f = files[i];
        let path = isDir ? f.webkitRelativePath : f.name;
        path = base + encodePath(path);

        try {
            await uploadFileWithProgress(f, path, (loaded, total) => {
                let totalUploaded = uploadedBytes + loaded;
                let percent = (totalUploaded / totalBytes) * 100;
                progress.textContent = percent.toFixed(2) + '%';
            });
            uploadedBytes += f.size;

        } catch (status) {
            const msgs = {
                400: 'Invalid upload data',
                403: 'You don\'t have permission to do that',
                409: 'It already exists',
                507: 'Not enough free space',
                500: 'Server Error'
            };
            alert(msgs[status] || 'Connection Error');
            break;  // stop uploading more files on error
        }
    }
    location.reload();
}

function enableDragAndDropUpload(dropArea, selectDirectory) {
    dropArea.addEventListener('dragover', e => { e.preventDefault(); });
    dropArea.addEventListener('drop', e => {
        e.preventDefault();
        var files = Array.prototype.slice.call(e.dataTransfer.files);
        if (files.length && confirm('¿Upload ' + files.length + ' item(s)?')) {
            uploadFiles(files, selectDirectory);
        }
    });
} enableDragAndDropUpload(document);


function moveFocus(direction) {
    var items = Array.from(listGroup.children);
    if (items.length === 0) return;

    var index = items.indexOf(document.activeElement);
    if (direction === -Infinity) index = 0;
    else if (direction === Infinity) index = items.length - 1;
    else index = (index + direction + items.length) % items.length;

    items[index].focus();
}

listGroup.addEventListener('click', e => {
    const d = e.target.closest('.filename');
    if (d) handleDivClick(d);
});
listGroup.addEventListener('keydown', e => {
    const d = e.target.closest('.filename');
    if ((e.key === 'Enter' || e.key === ' ') && d) {
        e.preventDefault();
        handleDivClick(d);
    }
});
document.addEventListener('keydown', e => {
    const key = e.key.toLowerCase();
    const mod = e.shiftKey && (key === 'arrowleft' || key === 'arrowright');

    if ((e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) && !mod) return;

    switch (key) {
        case 'arrowdown':
        case 'arrowup':
            e.preventDefault();
            if (key=="arrowup") moveFocus(-1);
            else moveFocus(1);
            break;            
        case 'home':
        case 'end':
            e.preventDefault();
            if (key=="end") moveFocus(Infinity);
            else moveFocus(-Infinity);
            break;
        case 'arrowright':
            e.preventDefault();
            if (mod) listGroup.scrollTo({
                left: listGroup.scrollWidth, behavior: 'smooth' });
            else document.activeElement.click();
            break;
        case 'arrowleft':
            e.preventDefault();
            if (mod) listGroup.scrollTo({ left: 0, behavior: 'smooth' });
            else if (selectMode) document.activeElement.click();
            else window.location.href='..';
            break;
        case 'a': invertSelection(); break;
        case 'd': executeDownloads(); break;
        case 'c': copyFiles(); break;
        case 'x': moveFiles(); break;
        case 'p': pasteFiles(); break;
        case 'u': openFileMenu(); break;
        case 'f': openFileMenu(true); break;
        case 's': toggleSelectMode(); break;
        case 'n': renameFiles(); break;
        case 'r': executeDeletes(); break;
        case 'm': mkdir(); break;
        case 'l': login.click(); break;
        case 'i': window.location.href='/'; break;
        case '1': sortName.click(); break;
        case '2': sortSize.click(); break;
        case '3': sortDate.click(); break;
    }
});
