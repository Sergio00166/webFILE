/* Code by Sergio00166 */

const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

let selectMode = false;
const selected = new Map();

const buttons = {
    select: $('#selectBtn'),
    del: $('#delBtn'),
    copy: $('#copyBtn'),
    move: $('#moveBtn'),
    ren: $('#renBtn'),
    invert: $('#invertBtn'),
};

const showLoader = () => {
    $('#loader').style.display = '';
    $('.list-group').style.display = 'none';
};

const changeURL = mode => {
    const url = new URL(window.location.href);
    url.searchParams.set('sort', mode);
    history.replaceState({}, document.title, url);
    location.reload();
};

const toggleSelectMode = () => {
    selectMode = !selectMode;
    buttons.select.textContent = selectMode ? 'CANCEL' : 'SELECT';
    Object.values(buttons).slice(1).forEach(btn => btn.disabled = !selectMode);
    if (!selectMode) deselectAll();
};

const deselectAll = () => {
    selected.forEach((div, id) => div.classList.remove('selected'));
    selected.clear();
};

const selectDiv = div => {
    const id = div.id;
    if (selected.has(id)) {
        div.classList.remove('selected');
        selected.delete(id);
    } else {
        div.classList.add('selected');
        selected.set(id, div);
    }
};

const handleDivClick = div => {
    if (selectMode) return selectDiv(div);
    const url = div.dataset.value;
    if (!url) return;
    div.hasAttribute('isdir') ?
        location.href = url :
        window.open(url, '_blank');
};

enableDelegation();

function enableDelegation() {
    const container = $('div.container');
    container.addEventListener('click', e => {
        const d = e.target.closest('.filename');
        if (d) handleDivClick(d);
    });
    container.addEventListener('keydown', e => {
        if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('.filename')) {
            e.preventDefault();
            handleDivClick(e.target.closest('.filename'));
        }
    });
}

const delay = ms => new Promise(r => setTimeout(r, ms));

const downloadURL = url => {
    const a = document.createElement('a');
    a.href = url;
    a.download = '';
    a.style.display = 'none';
    document.body.append(a);
    a.click();
    a.remove();
};

async function executeDownloads() {
    if (selectMode) {
        for (const div of selected.values()) {
            let url = div.dataset.value;
            if (!url) continue;
            suffix = div.hasAttribute('isdir') ? "?tar" : "?raw";
            downloadURL(url + suffix);
            await delay(100);
        }
    } else {
        let path = new URL(location.href).pathname;
        downloadURL(path + '?tar');
    }
}

async function executeDeletes() {
    if (!selectMode || !selected.size) return;
    if (!confirm('Are you sure to delete?')) return;
    let msg = null;
    for (const div of selected.values()) {
        const res = await fetch(div.dataset.value, { method: 'DELETE' });
        if (![200, 204].includes(res.status)) {
            msg = res.status === 403 ? 'You dont have permission to do that' :
                res.status === 404 ? 'That file/folder does not exist' :
                'Something went wrong on the server.';
        }
        await delay(100);
    }
    if (msg) alert(msg);
    location.reload();
}

const invertSelection = () => {
    if (!selectMode) return;
    $$('.filename').forEach(div => selectDiv(div));
};

const storageOp = (key, list) => {
    if (selectMode) toggleSelectMode();
    if (list?.length) localStorage.setItem(key, JSON.stringify(list));
};

const getURLlist = () => Array.from(selected.values())
    .map(div => div.dataset.value).filter(Boolean);

const copyFiles = () => storageOp('copy', getURLlist());
const moveFiles = () => storageOp('move', getURLlist());
const clearAllMvCp = () => ['copy', 'move'].forEach(k => localStorage.removeItem(k));

async function sendRequest(path, dest, method) {
    try {
        const opts = { method };
        if (dest) opts.headers = { Destination: decodeURIComponent(dest) };
        const res = await fetch(path, opts);
        if (res.status !== 200) throw res.status;
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
    for (const item of getURLlist()) {
        const url = item.replace(/\/$/, '');
        const name = decodeURIComponent(url.split('/').pop());
        const destName = prompt(`New Name for ${name}`);
        if (!destName) break;
        const dest = `${url.substring(0, url.lastIndexOf('/'))}/${destName}`;
        if (!await sendRequest(url, dest, 'MOVE')) break;
    }
    clearAllMvCp();
    location.reload();
}

async function pasteFiles() {
    const cp = JSON.parse(localStorage.getItem('copy') || '[]');
    const mv = JSON.parse(localStorage.getItem('move') || '[]');
    const toPaste = cp.length ? { list: cp, mode: 'COPY' } : mv.length ? { list: mv, mode: 'MOVE' } : {};
    if (!toPaste.list) return;
    showLoader();
    await delay(250);
    const base = location.pathname.replace(/\/$/, '') || '/';
    for (const p of toPaste.list) {
        const path = p.replace(/\/$/, '');
        const dest = `${base}/${path.split('/').pop()}`;
        if (!await sendRequest(path, dest, toPaste.mode)) break;
    }
    clearAllMvCp();
    location.reload();
}

async function mkdir() {
    const name = prompt('Create dir');
    if (!name) return;
    const base = location.pathname.replace(/\/$/, '');
    if (await sendRequest(`${base}/${name}`, null, 'MKCOL')) location.reload();
}

function openFileMenu(selectDir = false) {
    const inp = Object.assign(document.createElement('input'), {
        type: 'file',
        multiple: !selectDir,
        ...(selectDir && { webkitdirectory: true })
    });
    inp.onchange = () => {
        if (inp.files.length && (selectDir || confirm(`Upload ${inp.files.length} item(s)?`))) uploadFiles(inp.files, selectDir);
    };
    inp.click();
}

function uploadFiles(files, isDir = false) {
    const fd = new FormData();
    Array.from(files).forEach(f => fd.append('upload', f));
    showLoader();
    fetch(isDir ? '?updir' : '?upfile', { method: 'POST', body: fd })
        .then(r => r.ok || Promise.reject(r.status))
        .catch(status => {
            const msgs = {
                403: 'You don’t have permission to do that',
                409: 'It already exists',
                507: 'Not enough free space'
            };
            alert(msgs[status] || 'Server error');
        })
        .finally(() => location.reload());
}

function enableDragAndDropUpload(dropArea, selectDirectory = false) {
    dropArea.addEventListener("dragover", e => e.preventDefault());
    dropArea.addEventListener("drop", e => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files);
        if(files.length && confirm(`¿Subir ${files.length} archivo(s)?`)) {
            uploadFiles(files, selectDirectory);
        }
    });
}
enableDragAndDropUpload(document);


/* Keyboard Shorthands */

function moveFocus(direction) {
    const container = $('.container');
    const items = Array.from(container.children)
        .filter(el => !el.classList.contains('backdir'));
    if (items.length == 0) return;
    const active = document.activeElement;
    let index = items.indexOf(active);
    index = (index + direction + items.length) % items.length;
    items[index].focus();
}

document.addEventListener('keydown', e => {
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
            const active = document.activeElement;
            const backdir = $(".backdir");
            if (selectMode) active.click();
            else if (backdir) backdir.click();
            break;
        }
        case 'a':
            invertSelection();
            break;
        case 'd':
            executeDownloads();
            break;
        case 'c':
            copyFiles();
            break;
        case 'x':
            moveFiles();
            break;
        case 'p':
            pasteFiles();
            break;
        case 'u':
            openFileMenu();
            break;
        case 'i':
            openFileMenu(true);
            break;
        case 's':
            toggleSelectMode();
            break;
        case 'n':
            renameFiles();
            break;
        case 'r':
            executeDeletes();
            break;
        case 'm':
            mkdir();
            break;
        case 'l':
            $("#login").click();
            break;
        case '1':
            $("#sortName").click();
            break;
        case '2':
            $("#sortSize").click();
            break;
        case '3':
            $("#sortDate").click();
            break;
        default:
            break;
    }
});

