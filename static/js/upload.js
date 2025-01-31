/* Code by Sergio00166 */

const error_box = document.getElementById("error");

function ResetUploadMsg() {
    document.getElementById('fileLabel').textContent = "Drag here or click to open menu";
    document.getElementById('dirLabel').textContent  = "Select Folder";
}

function updateFileLabel(inputId, labelId) {
    const input = document.getElementById(inputId);
    const label = document.getElementById(labelId);
    const files = input.files;

    if (files.length > 0) {
        label.textContent = `${files.length} file(s) selected`;
    } else {
        label.textContent = "Drag here or click to open menu";
    }
}

function handleOptionChange(dnrem = false) {
    ResetUploadMsg();
    if (dnrem === false) {
		error_box.textContent = "";
    }
    const selection = document.getElementById("actionSelect").value;
    document.getElementById("backButton").style.display     = selection === ""       ? "block" : "none";
    document.getElementById("createDirForm").style.display  = selection === "mkdir"  ? "block" : "none";
    document.getElementById("uploadFileForm").style.display = selection === "upFile" ? "block" : "none";
    document.getElementById("uploadDirForm").style.display  = selection === "upDir"  ? "block" : "none";
}

// Drag and drop event handlers
const dropzone = document.querySelector('.file-dropzone');
const fileInput = document.getElementById('fileInput');

dropzone.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropzone.style.borderColor = '#3273dc';
});

dropzone.addEventListener('dragleave', () => {
    dropzone.style.borderColor = '#00d1b2';
});

dropzone.addEventListener('drop', (event) => {
    event.preventDefault();
    dropzone.style.borderColor = '#00d1b2';
    fileInput.files = event.dataTransfer.files;
    updateFileLabel('fileInput', 'fileLabel');
});
document.getElementById('dirInput').addEventListener('change', function() {
    document.getElementById('dirLabel').textContent = "...";
});

document.addEventListener("DOMContentLoaded", () => {
    ResetUploadMsg();
    const selectElement = document.getElementById("actionSelect");
    selectElement.value = selectedAction;
    setTimeout(() => { handleOptionChange(true); }, 25);
});

function show_loader() {
    document.getElementById("createDirForm").style.display = "none";
    document.getElementById("uploadFileForm").style.display = "none";
    document.getElementById("uploadDirForm").style.display = "none";
    document.getElementById("selector").style.display = "none";
    document.getElementById("loader").style.display = "block"
    document.getElementById("backButton").style.display = "block";
}

document.getElementById("f_upload").addEventListener("click", show_loader );
document.getElementById("d_upload").addEventListener("click", show_loader );


async function mkdir(e) {
	e.preventDefault();
	const folderName = document.getElementById('foldername').value;
	if (!(folderName)) {
		error_box.textContent = "You must provide a folder name";
		return;
	}
	var url = window.location.pathname;
	url = url.endsWith('/')?url.slice(0, -1):url;
	const xhr = await fetch(
		url+"/"+folderName, {method: 'MKCOL'}
	);
	if (xhr.status !== 200) {
		if (xhr.status === 403) {
			msg = 'You dont have permission to do that';
		} else if (xhr.status === 404) {
			msg = 'The parent dir does not exist';
		} else if (xhr.status === 500) {
			msg = 'Something went wrong on the server.';
		} else if (xhr.status === 409) {
			msg = 'It already exists';
		} else if (xhr.status === 507) {
			msg = 'Not enough free space'
		} else {
			msg = 'Something went wrong';
		} 
		error_box.textContent = msg;
	} else { 
		window.location.href = window.location.pathname;
	}
}
