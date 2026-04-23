/* Code by Sergio00166 */

function renderMarkdown(data) {
    const container = document.getElementById("container");
    container.innerHTML = marked.parse(data);
    container.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(h => {
        if (!h.id) h.id = h.textContent.toLowerCase().trim().replace(/[^\w]+/g, '-');
    });
    container.querySelectorAll('p').forEach(p => {
        const text = p.textContent;
        if (text.startsWith("[") && text.endsWith("]"))
            katex.render(text.slice(1, -1), p);
    });
}

window.addEventListener("pageshow", () => {
    fetch("?get=file").then(res => res.text())
      .then((data) => renderMarkdown(data));
});

 