# Code by Sergio00166

from datetime import datetime as dt

icon_map = {
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
    'webpage':      'globe-solid.svg'
}

def readable_size(num, suffix="B"):
    for unit in ["", "Ki", "Mi", "Gi", "Ti"]:
        if num < 1024:
            return f"{num:.1f} {unit}{suffix}"
        num /= 1024
    return f"{num:.1f} Yi{suffix}"


def readable_date(date):
    if date is not None:
        cd = dt.fromtimestamp(date)
        return [cd.strftime("%d/%m/%Y"), cd.strftime("%H:%M")]
    return ["##/##/####", "##:##:##"]


def render_folder(folder_content):
    content = []

    for item in folder_content:
        type = item["type"]

        if type in ["directory", "disk"]:
            content.append("<button isdir>")
        else:
            content.append("<button>")

        content.append(f'<img src="/srv/static/svg/index/{icon_map.get(type, "file-solid.svg")}"><pre>{item["name"]}</pre><span>')

        if type == "disk":
            capacity = item["capacity"]
            content.append(f'{readable_size(item["size"])} / {readable_size(capacity)}</span>')

            if capacity:
                content.append(f'<span>({round(item["size"] / item["capacity"] * 100)}%)')
            else:
                content.append(f'<span>(0%)')
        else:
            mtime = readable_date(item["mtime"])
            content.append(f'{readable_size(item["size"])}</span><span>{mtime[0]} {mtime[1]}')
                 
        content.append("</span></button>")
    return "".join(content)

 