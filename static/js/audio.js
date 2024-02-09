var audio = document.getElementById("audio");
var mode = document.getElementById("mode");
var storedMode = localStorage.getItem("audioMode");
var storedVolume = localStorage.getItem("audioVolume"); 
if (storedMode !== null) { audio.setAttribute("data-mode", storedMode); updateModeButton(); }
if (storedVolume !== null) { audio.volume = parseFloat(storedVolume); }
function updateModeButton() {
	var currentMode = parseInt(audio.getAttribute("data-mode"));
	if (currentMode === 0) { mode.textContent = "1"; }
	else if (currentMode === 1) { mode.textContent = "»"; }
	else if (currentMode === 2) { mode.textContent = "↻"; } }
function next() {
	localStorage.setItem("audioMode", audio.getAttribute("data-mode"));
	localStorage.setItem("audioVolume", audio.volume.toString());
	window.location.href = next; }
function prev() {
	localStorage.setItem("audioMode", audio.getAttribute("data-mode"));
	localStorage.setItem("audioVolume", audio.volume.toString());
	window.location.href = prev; }
function chMode() {
	var currentMode = parseInt(audio.getAttribute("data-mode"));
	if (currentMode === 0) { audio.setAttribute("data-mode", 1); mode.textContent = "»"; }
	else if (currentMode === 1) { audio.setAttribute("data-mode", 2); mode.textContent = "↻"; }
	else if (currentMode === 2) { audio.setAttribute("data-mode", 0); mode.textContent = "1"; } }  
function handleAudioEnded() {
	var currentMode = parseInt(audio.getAttribute("data-mode"));
	if (currentMode === 1) {
		localStorage.setItem("audioMode", audio.getAttribute("data-mode"));
		localStorage.setItem("audioVolume", audio.volume.toString());
		window.location.href = next; }
	else if (currentMode === 2) { audio.currentTime = 0; audio.play(); } }
function saveVolume() { localStorage.setItem("audioVolume", audio.volume.toString()); }