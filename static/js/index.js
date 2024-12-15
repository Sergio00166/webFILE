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

// Function to toggle select mode
function toggleSelectMode() {
    selectMode = !selectMode;
    const buttonText = selectMode ? 'CANCEL' : 'SELECT';
    document.querySelectorAll(".toggleSelectMode")
        .forEach(button => {
            button.textContent = buttonText;
        });
    document.getElementById('toggleAllNone').disabled = !selectMode;
    document.getElementById('deleteBtn').disabled = !selectMode;
    document.getElementById('invertSelection').disabled = !selectMode;
    if (!selectMode) {
        deselectAll();
    }

}

// Function to deselect all selected divs
function deselectAll() {
    document.querySelectorAll('.filename.selected').forEach(div => {
        div.classList.remove('selected');
        delete selectedElements[div.id];
    });
}

// Function to select or deselect a div
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

// Function to delay execution
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to execute downloads for selected divs
async function executeDownloads() {
    if (selectMode) {
        for (const id in selectedElements) {
            const div = selectedElements[id];
            const url = div.getAttribute('data-value');
            if (url) {
                if (div.hasAttribute('dir')) {
                    mode = '?dir';
                } else {
                    mode = '?raw';
                }
                downloadURL(url + mode);
                await delay(100);
            }
        }
    } else {
        var url = new URL(window.location.href).pathname;
        if (url === "/") {
            url = '';
        }
        const newURL = url+'?tar';
        downloadURL(newURL);
    }
}

// Function to execute downloads for selected divs
async function executeDeletes() {
    if ((selectMode) && (Object.keys(selectedElements).length > 0)) {
        msg = null;
        const sure = confirm("Are you sure to delete?");
        if (sure) {
            for (const id in selectedElements) {
                const div = selectedElements[id];
                const url = div.getAttribute('data-value');
                if (url) {
                    const response = await fetch(url + "?delete");
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




// Function to select or deselect all divs
function toggleSelectAll() {
    if (selectMode) {
        const allDivs = document.querySelectorAll('.filename');
        const allSelected = allDivs.length === Object.keys(selectedElements).length;
        if (allSelected) {
            deselectAll();
        } else {
            allDivs.forEach(div => {
                if (!selectedElements[div.id]) {
                    selectedElements[div.id] = div;
                    div.classList.add('selected');
                }
            });
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
