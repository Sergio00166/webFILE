/* Code by Sergio00166 */


function changeURL(mode) {
    var url = window.location.href;
    var urlObj = new URL(url);
    urlObj.searchParams.set("sort", mode);
    window.history.replaceState({}, document.title, urlObj.href);
    location.reload();
}

let selectMode = false;
const selectedElements = {};

function toggleSelectMode() {
    selectMode = !selectMode;
    const buttonText = selectMode ? 'CANCEL' : 'SELECT';
    document.querySelectorAll(".toggleSelectMode")
        .forEach(button => {
            button.textContent = buttonText;
        });
    document.getElementById('deleteBtn').disabled = !selectMode;
    document.getElementById('invertSelection').disabled = !selectMode;
    if (!selectMode) { deselectAll(); }
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
                    if (!url.endsWith("/"))
                    { url += "/"; }
                    mode = '?tar';
                } else { mode = '?raw'; }
                downloadURL(url+mode);
                await delay(100);
            }
        }
    } else {
        var url = new URL(window.location.href).pathname;
        if (url=="/" || url=="") { url = ''; }
        if (!url.endsWith("/"))  { url += "/"; }
        const newURL = url+'?tar';
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
                        url, {method: 'DELETE'}
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
            if (msg!==null) { alert(msg); }
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

function set_cp_temp(list){
    if (selectMode){ toggleSelectMode(); }
    localStorage.setItem('copy', JSON.stringify(list));
}
function set_mv_temp(list){
    if (selectMode){ toggleSelectMode(); }
    localStorage.setItem('move', JSON.stringify(list));
}
function clearAllMvCp(){ 
    localStorage.removeItem('move');
    localStorage.removeItem('copy');
 }

function getURLlist(){
    list = [];
    for (const id in selectedElements) {
        const div = selectedElements[id];
        const url = div.getAttribute('data-value');
        if (url) { list.push(url); }
    } return list;
}


function copyFiles() {
    clearAllMvCp();
    if ((selectMode) && (Object.keys(selectedElements).length > 0)) {
        list = getURLlist();
        if (list != []){ set_cp_temp(list); }
    } else { set_cp_temp([window.location.pathname]); }
}
function moveFiles() {
    clearAllMvCp();
    if ((selectMode) && (Object.keys(selectedElements).length > 0)) {
        list = getURLlist();
        if (list != []){ set_mv_temp(list); }
    } else { set_mv_temp([window.location.pathname]); }
}

function renameFiles() {
    if ((selectMode) && (Object.keys(selectedElements).length>0)){
        const items = getURLlist();
        for (var item of items){
            item = item.endsWith('/')?item.slice(0, -1):item;
            name = item.split('/').pop();
            var dest = prompt('New Name for '+name);
            if (dest === null) { break; }
            dest = item.substring(0, item.lastIndexOf("/"))+"/"+dest;
            const success  = sendRequest(item, dest, "MOVE");
            if (!success) break;
        }
        clearAllMvCp();
        location.reload();
    }
}

function sendRequest(path, destination, method) {
    const xhr = new XMLHttpRequest();
    xhr.open(method, path, false);
    destination = decodeURIComponent(destination);
    xhr.setRequestHeader("Destination", destination);
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
    var urlPath = window.location.pathname;
    urlPath = urlPath.endsWith('/')?urlPath.slice(0, -1):urlPath;
    if (urlPath===""){ urlPath += "/"; }
    let toPaste = cpList;
    let mode = "COPY";
    if (toPaste.length === 0){
        toPaste = mvList;
        mode = "MOVE";
    }
    if (toPaste.length === 0){ return; }
    document.getElementById("loader").style.display = "";
    document.querySelector(".list-group").style.display = "none";
    setTimeout(()=>{
        for (const path of toPaste){
            const success  = sendRequest(path, urlPath, mode);
            if (!success){ break; }
        }
        clearAllMvCp();
        location.reload();
    },250);

}


function createOptionDialog() {
    const existingDialog = document.getElementById("optionDialog");
    if (existingDialog) {
        document.body.removeChild(existingDialog);
    }
    const dialog = document.createElement("div");
    dialog.id = "optionDialog";

    const options = [
        { text: "COPY", value: "copy" },
        { text: "MOVE", value: "move" },
        { text: "RENAME", value: "rename" },
        { text: "CANCEL", value: null }
    ];
    options.forEach(option => {
        const button = createButton(option);
        dialog.appendChild(button);
    });
    document.body.appendChild(dialog);

    function createButton(option) {
        const button = document.createElement("button");
        button.textContent = option.text;
        Object.assign(button.style, {
            margin: "0",
            width: "100%",
            padding: "10px",
            border: "none",
            borderRadius: "5px",
            backgroundColor: "#007bff",
            color: "#fff",
        });
        button.onmouseover = () => button.style.backgroundColor = "#0056b3";
        button.onmouseout = () => button.style.backgroundColor = "#007bff";
        button.onclick = () => { handleChoice(option.value); }
        return button;
    }

    function handleChoice(choice) {
        document.body.removeChild(dialog);
        if (choice === "copy") {
            copyFiles();
        } else if (choice === "move") {
            moveFiles();
        } else if (choice === "rename") {
            renameFiles();
        }
    }
}
