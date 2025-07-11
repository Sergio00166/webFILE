/* Code by Sergio00166 */
/*
All paths are (and must be) encoded by default, also the items dataset
Except the Destination Header THAT MUST BE NOT ENCODED.
*/

const buttons = {
    select: document.getElementById('selectBtn'),
    del: document.getElementById('delBtn'),
    copy: document.getElementById('copyBtn'),
    move: document.getElementById('moveBtn'),
    ren: document.getElementById('renBtn'),
    invert: document.getElementById('invertBtn'),
};
const base = location.pathname.replace(/\/$/, '') || '/';

const selected = new Map();
let selectMode = true;
toggleSelectMode();


function copyFiles() {
    storageOp('copy', getURLlist());
}
function moveFiles() {
    storageOp('move', getURLlist());
}
function clearAllMvCp() {
    ['copy', 'move'].forEach(function (k) { localStorage.removeItem(k); });
}

function encodePath(path) {
    return path.split('/').map(encodeURIComponent).join('/');
}
function delay(ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
}

function showLoader() {
    var loader = document.getElementById('loader');
    if (loader) loader.style.display = '';
    var list = document.getElementsByClassName('list-group');
    if (list.length) list[0].style.display = 'none';
}

function changeURL(mode) {
    var url = new URL(window.location.href);
    url.searchParams.set('sort', mode);
    history.replaceState({}, document.title, url);
    location.reload();
}

function toggleSelectMode() {
    selectMode = !selectMode;
    buttons.select.textContent = selectMode ? 'CANCEL' : 'SELECT';
    Object.keys(buttons).forEach(function (k) {
        if (k !== 'select') buttons[k].disabled = !selectMode;
    });
    if (!selectMode) deselectAll();
}

function deselectAll() {
    selected.forEach(function (div, id) {
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
    if (selectMode) return selectDiv(div);
    var url = div.dataset.value;
    if (!url) return;
    if (div.hasAttribute('isdir')) location.href = url;
    else window.open(url, '_blank');
}

enableDelegation();

function enableDelegation() {
    var container = document.querySelector('div.container');
    if (!container) return;

    container.addEventListener('click', function (e) {
        var d = e.target.closest('.filename');
        if (d) handleDivClick(d);
    });

    container.addEventListener('keydown', function (e) {
        if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('.filename')) {
            e.preventDefault();
            handleDivClick(e.target.closest('.filename'));
        }
    });
}

function downloadURL(url) {
    var a = document.createElement('a');
    a.href = url;
    a.download = '';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
}

async function executeDownloads() {
    if (selectMode) {
        for (var div of selected.values()) {
            var url = div.dataset.value;
            if (!url) continue;
            var suffix = div.hasAttribute('isdir') ? "?tar" : "?raw";
            downloadURL(url + suffix);
            await delay(100);
        }
    } else downloadURL(base + '?tar');
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
        .map(function (div) { return div.dataset.value; })
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
            403: 'You don’t have permission to do that',
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
        var dest = base + '/' + p.split('/').pop();
        if (!await sendRequest(p, dest, toPaste.mode)) break;
    }
    clearAllMvCp();
    location.reload();
}

async function mkdir() {
    var name = prompt('Create dir');
    if (!name) return;
    name = encodeURIComponent(name);
    if (await sendRequest(base+'/'+name, null, 'MKCOL')) location.reload();
}

function openFileMenu(selectDir) {
    var inp = document.createElement('input');
    inp.type = 'file';
    inp.multiple = !selectDir;
    if (selectDir) inp.setAttribute('webkitdirectory', true);

    inp.onchange = function () {
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
        var path = base+"/"+encodePath(dir);
        var r = await fetch(path, { method: 'MKCOL' });
        if (!r.ok) throw r.status;
    }
}

async function uploadFiles(files, isDir) {
    showLoader();
    if (isDir) await createFolders(files);

    for (var i = 0; i < files.length; i++) {
        var f = files[i];
        var path = isDir ? f.webkitRelativePath : f.name;
        path = base+"/"+encodePath(path);

        try {
            var r = await fetch(path, { method: 'PUT', body: f });
            if (!r.ok) throw r.status;
        } catch (status) {
            var msgs = {
                403: 'You don’t have permission to do that',
                409: 'It already exists',
                507: 'Not enough free space'
            };
            alert(msgs[status] || 'Server error');
            break;
        }
    }
   location.reload();
}

function enableDragAndDropUpload(dropArea, selectDirectory) {
    dropArea.addEventListener("dragover", function (e) { e.preventDefault(); });
    dropArea.addEventListener("drop", function (e) {
        e.preventDefault();
        var files = Array.prototype.slice.call(e.dataTransfer.files);
        if (files.length && confirm('¿Upload ' + files.length + ' item(s)?')) {
            uploadFiles(files, selectDirectory);
        }
    });
}
enableDragAndDropUpload(document);

function moveFocus(direction) {
    var container = document.querySelector('.container');
    var items = Array.prototype.filter.call(container.children, function (el) {
        return !el.classList.contains('backdir');
    });
    if (items.length === 0) return;
    var active = document.activeElement;
    var index = items.indexOf(active);
    index = (index + direction + items.length) % items.length;
    items[index].focus();
}

function toggleMenu() {
    var controls = document.querySelector('.controls');
    if (controls) controls.classList.toggle('open');
}

document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;

    switch (e.key.toLowerCase()) {
        case 'arrowdown':
            e.preventDefault();
            moveFocus(1);
            break;
        case 'arrowup':
            e.preventDefault();
            moveFocus(-1);
            break;
        case 'arrowright':
            document.activeElement.click();
            break;
        case 'arrowleft': {
            var active = document.activeElement;
            var backdir = document.querySelector('.backdir');
            if (selectMode) active.click();
            else if (backdir) backdir.click();
            break;
        }
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
        case 'l': var el = document.getElementById('login'); if (el) el.click(); break;
        case '1': var el1 = document.getElementById('sortName'); if (el1) el1.click(); break;
        case '2': var el2 = document.getElementById('sortSize'); if (el2) el2.click(); break;
        case '3': var el3 = document.getElementById('sortDate'); if (el3) el3.click(); break;
    }
});

