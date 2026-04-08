/* Code by Sergio00166 */

const terminal = document.getElementById("terminal");
const cmdInput = document.getElementById("cmd");

async function sendCommand(command) {
    appendToTerminal(`$ ${command}`);
    try {
        const response = await fetch("/srv/aml", {
            method: "POST", body: command
        });
        const text = await response.text();
        appendToTerminal(text);
    } catch (err) {
        appendToTerminal("Error: " + err.message);
    }
}

function appendToTerminal(text) {
    terminal.textContent += text + "\n";
    terminal.scrollTop = terminal.scrollHeight;
}

cmdInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        const command = cmdInput.value.trim();
        if (command) sendCommand(command);
        cmdInput.value = "";
    }
});