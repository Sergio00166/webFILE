/* Code by Sergio00166 */

const loginForm = document.getElementById("loginForm");

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const response = await fetch("/srv/login", {
        method: "POST",
        body: new FormData(event.target)
    });
    if (response.ok) redirectBack();
    else {
        const errorEl = document.getElementById("error");
        errorEl.textContent = "Invalid User or Password";
        errorEl.style.display = "block";
        document.getElementById("password").value = "";
    }
});

function redirectBack() {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("redirect");

    if (redirect && redirect.trim() !== "") {
        window.location.href = decodeURIComponent(redirect);
    } else {
        window.location.href = "/";
    }
}

 