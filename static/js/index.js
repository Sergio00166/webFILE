/* Code by Sergio00166 */

function sortNameBT() {
      var url = window.location.href;
      var urlObj = new URL(url);
      var sortValue = urlObj.searchParams.get("mode") || "np";
      if (sortValue === "np") { sortValue = "nd"; }
      else { sortValue = "np"; }
      urlObj.pathname = urlObj.pathname.endsWith("/") ? urlObj.pathname : urlObj.pathname + "/";
      urlObj.searchParams.set("mode", sortValue);
      window.history.replaceState({}, document.title, urlObj.href);
      location.reload(); }

function sortSizeBT() {
      var url = window.location.href;
      var urlObj = new URL(url);
      var sortValue = urlObj.searchParams.get("mode") || "sd";
      if (sortValue === "sp") { sortValue = "sd"; }
      else { sortValue = "sp";}
      urlObj.pathname = urlObj.pathname.endsWith("/") ? urlObj.pathname : urlObj.pathname + "/";
      urlObj.searchParams.set("mode", sortValue);
      window.history.replaceState({}, document.title, urlObj.href);
      location.reload(); }

function sortDateBT() {
      var url = window.location.href;
      var urlObj = new URL(url);
      var sortValue = urlObj.searchParams.get("mode") || "dd";
      if (sortValue === "dp") { sortValue = "dd"; }
      else { sortValue = "dp"; }
      urlObj.pathname = urlObj.pathname.endsWith("/") ? urlObj.pathname : urlObj.pathname + "/";
      urlObj.searchParams.set("mode", sortValue);
      window.history.replaceState({}, document.title, urlObj.href);
      location.reload(); }
      
      

let selectMode = false;
const selectedElements = {};

// Function to toggle select mode
function toggleSelectMode() {
    selectMode = !selectMode;
    const buttonText = selectMode ? 'CANCEL' : 'SELECT';
    document.getElementById('toggleSelectMode').textContent = buttonText;
    document.getElementById('toggleAllNone').disabled = !selectMode;
    if (!selectMode) { deselectAll(); }

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

function handleDivClick(event) {
    if (selectMode) {
        selectDiv(event.currentTarget.id);
    } else {
        const url = event.currentTarget.getAttribute('data-value');
        if (url) { 
            const div = document.getElementById(event.currentTarget.id);
            if (div.hasAttribute('dir')) {
                window.location.href = url;
            } else { window.open(url, '_blank'); }    
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
function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

// Function to execute downloads for selected divs
async function executeDownloads() {
    if (selectMode) {
        for (const id in selectedElements) {
            const div = selectedElements[id];
            const url = div.getAttribute('data-value');
            if (url) {
                if (div.hasAttribute('dir')) {
                    mode = '/?mode=dir';
                } else { mode = '/?mode=raw'; }
                downloadURL(url+mode);
                await delay(100);
            }
        }
    } else {
        const url = new URL(window.location.href).pathname;
        const newURL = url+'/?mode=dir';
        downloadURL(newURL);
    }
}

// Function to select or deselect all divs
function toggleSelectAll() {
    if (selectMode) {
        const allDivs = document.querySelectorAll('.filename');
        const allSelected = allDivs.length === Object.keys(selectedElements).length;

        if (allSelected) { deselectAll();
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

// Bind click handling to divs
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('div.filename').forEach(div => {
        div.addEventListener('click', handleDivClick);
    });
});
