/* Code by Sergio00166 */


function updateLabel(input, labelId) {
    const label = document.getElementById(labelId);
    label.textContent = input.files.length > 0 ? `${input.files.length} file(s) selected` : "Select Files";

    // Hide the error message if any file is selected
    const errorMessage = document.getElementById("error");
    if (input.files.length > 0) {
        errorMessage.style.display = "none";
    }
}

function showLoader() {
    document.getElementById("uploadForm").style.display = "none";
    document.getElementById("loader").style.display = "block";
    document.getElementById("error").style.display = "none";
}

function handleDrop(event, inputId, labelId) {
    event.preventDefault();
    const input = document.getElementById(inputId);
    input.files = event.dataTransfer.files;
    updateLabel(input, labelId);
}

document.body.ondragover = function(event) {
    event.preventDefault();
};

document.body.ondrop = function(event) {
    handleDrop(event, 'fileInput', 'fileLabel');
};

document.querySelector('.drop-zone').onclick = function(event) {
    event.stopPropagation();
};

// Show/hide error message if there's an error
window.onload = function() {
    const errorMessage = document.getElementById("error");
    if (errorMessage && errorMessage.innerText.trim() === "") {
        errorMessage.style.display = "none";
    } else {
        errorMessage.style.display = "block";
    }
};