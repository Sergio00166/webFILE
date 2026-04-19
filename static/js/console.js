/* Code by Sergio00166 */

const terminal = document.getElementById("terminal");
const cmdInput = document.getElementById("cmd");

async function sendCommand(command) {
    appendToTerminal(`$ ${command}`);
    try {
        const res = await fetch("", {
            method: "POST", body: command
        });
        if (!res.ok) {
            if (res.status === 403)
                appendToTerminal("ERROR: Permission Denied");
            else
                appendToTerminal("ERROR: Command execution failed");
            return;
        }
        appendToTerminal(await res.text());

    } catch (err) { 
        appendToTerminal("ERROR: Cannot send command");
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