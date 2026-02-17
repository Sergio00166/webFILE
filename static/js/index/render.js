/* Code by Sergio00166 */

const path_text = document.getElementById("path-text");
let cache = [null, null];
let sort_mode = "np";
let basePath;

// ============================================================================
// ICON MAPPINGS
// ============================================================================

const icon_map = {
    'disk':         'hard-drive-solid.svg',
    'directory':    'folder-solid.svg',
    'source':       'file-code-solid.svg',
    'video':        'film-solid.svg',
    'audio':        'music-solid.svg',
    'text':         'file-lines-solid.svg',
    'pdf':          'file-pdf-solid.svg',
    'photo':        'image-solid.svg',
    'document':     'file-word-solid.svg',
    'database':     'database-solid.svg',
    'presentation': 'file-powerpoint-solid.svg',
    'virtualdisk':  'compact-disc-solid.svg',
    'compressed':   'file-zipper-solid.svg',
    'binary':       'square-binary-solid.svg',
    'webpage':      'globe-solid.svg',
    'markdown':     'markdown-solid.svg',
};

// ============================================================================
// UTILS & HELPERS
// ============================================================================

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",  month: "2-digit", year: "numeric"
});
const timeFormatter = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit", minute: "2-digit", hour12: false
});

function getJSON() {
    return fetch("?get=json")
      .then(res => res.json())
      .catch(() => location.reload());
}

// ============================================================================
// FOLDER RENDERING
// ============================================================================

function renderItem(item) {
    const el    = document.createElement("button");
    const icon  = document.createElement("img");
    const name  = document.createElement("pre");
    const span1  = document.createElement("span");
    const span2 = document.createElement("span");
    const svg = (icon_map[item.type] || "file-solid.svg");

    icon.src = "/srv/static/svg/index/" + svg;
    name.textContent  = item.name;

    if (item.type === "disk") {
        const size = readableSize(item.size);
        const capacity = readableSize(item.capacity);
        const percent = (item.size / item.capacity) * 100;

        span1.textContent = `${size} / ${capacity}`;
        span2.textContent = `(${percent.toFixed(2)}%)`;
        el.setAttribute("isdir", "");
    } else {
        span1.textContent  = readableSize(item.size);
        span2.textContent = readableDate(item.mtime);

        if (item.type === "directory")
            el.setAttribute("isdir", "");
    }
    el.append(icon, name, span1, span2);
    return el;
}

async function renderFolder(useCache = false) {
    const path = window.location.pathname;
    listGroup.classList.remove("show");
    let data; basePath = path;
    selectedItems.clear();

    if (useCache && cache[0] === path) {
        data = cache[1];
    } else {
        cache[0] = path;
        data = await getJSON();
        cache[1] = data;
    }
    data = sortContents(data, sort_mode);
    const frag = document.createDocumentFragment();
    const params = new URLSearchParams(window.location.search);
    const noautoload = params.get("get") !== "default";

    for (let i = 0; i < data.length; i++) {
        const item  = data[i];
        if (item.name === autoload_webpage && noautoload) {
            location.reload(); return;
        }
        frag.appendChild(renderItem(item));
    }
    const pathStr = decodeURIComponent(path);
    path_text.textContent = `\u200E${pathStr}\u200E`;
    listGroup.replaceChildren(frag);
    listGroup.classList.add("show");
}

// ============================================================================
// FORMATTERS
// ============================================================================

function readableDate(ts) {
    const d = new Date(ts * 1000);
    const dateStr = dateFormatter.format(d);
    const timeStr = timeFormatter.format(d);
    return dateStr + " " + timeStr;
}

const size_units = ["", "Ki", "Mi", "Gi", "Ti"];
function readableSize(num, suffix = "B") {
    if (num === null) return "---";     
    let i = 0;

    while (i < size_units.length && num >= 1024) {
        num = num / 1024; i++;
    }
    if (i < size_units.length)
        return `${num.toFixed(1)} ${size_units[i]}${suffix}`;

    return `${num.toFixed(1)} Yi${suffix}`;
}

// ============================================================================
// SORTING
// ============================================================================

const sort_keymap = {d: x => x.mtime || 0, s: x => x.size, n: x => x.name};

function sortContents(folderContent, sort) {
    const dirs = [], files = [];
    const key = sort_keymap[sort[0]];
    if (!key) return folderContent;
    
    for (const x of folderContent)
        ((x.type === "disk" || x.type === "directory") && dirs.push(x)) || files.push(x);

    const rev = (sort[1] === "d") * -2 + 1;
    const compare =
        (sort[0] === "n" && ((a, b) => key(a).localeCompare(key(b)) * rev)) ||
        ((a, b) => Math.sign(key(a) - key(b)) * rev);

    dirs.sort(compare);
    files.sort(compare);
    return dirs.concat(files);
}

// ============================================================================
// SORTING ACTIONS
// ============================================================================

const sort_mode_map = {
    name: { key: "n", el: sortByName, first: "p" },
    size: { key: "s", el: sortBySize, first: "d" },
    date: { key: "d", el: sortByDate, first: "d" }
};
function setSortingMode(mode) {
    sortByName.textContent = "◻️" + sortByName.textContent.slice(1);
    sortBySize.textContent = "◻️" + sortBySize.textContent.slice(1);
    sortByDate.textContent = "◻️" + sortByDate.textContent.slice(1);

    const target = sort_mode_map[mode];
    if (!target) return;

    const currentKey = sort_mode[0];
    const currentDir = sort_mode[1];
    let newDir = target.first;

    if (currentKey === target.key) {
        if (currentDir === "p") newDir = "d";
        else newDir = "p";
    }
    sort_mode = target.key + newDir;

    if (newDir === "p")
        target.el.textContent = "⬆️" + target.el.textContent.slice(1);
    else
        target.el.textContent = "⬇️" + target.el.textContent.slice(1);
    
    renderFolder(true);
}

// ============================================================================
// INITIALIZATION
// ============================================================================

window.addEventListener("pageshow", renderFolder);
window.addEventListener("popstate", renderFolder);

 