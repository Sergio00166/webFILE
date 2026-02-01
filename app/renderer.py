# Code by Sergio00166

from time import timezone
from html import escape

DATE_FMT = "{:02d}/{:02d}/{}"
TIME_FMT = "{:02d}:{:02d}"

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

def readable_date(ts):
    ts = int(ts - timezone)
    minutes = (ts // 60) % 60
    hours = (ts // 3600) % 24
    day_count = ts // 86400

    z = day_count + 719468
    era = z // 146097
    doe = z - era * 146097
    yoe = (doe - doe//1460 + doe//36524 - doe//146096) // 365
    y = yoe + era * 400
    doy = doe - (365 * yoe + yoe//4 - yoe//100)
    mp = (5 * doy + 2) // 153
    day = doy - (153 * mp + 2)//5 + 1
    month = mp + 3 - 12 * (mp // 10)
    year = y + (3 - month) // 3

    return DATE_FMT.format(day, month, year), TIME_FMT.format(hours, minutes)


def readable_size(num, suffix="B"):
    for unit in ["", "Ki", "Mi", "Gi", "Ti"]:
        if num < 1024:
            return f"{num:.1f} {unit}{suffix}"
        num /= 1024
    return f"{num:.1f} Yi{suffix}"


def render_folder(folder_content):
    content = []

    for item in folder_content:
        type = item["type"]

        content.append("<button isdir>" if type in ["directory", "disk"] else "<button>")
        content.append(f'<img src="/srv/static/svg/index/{icon_map.get(type, "file-solid.svg")}"><pre>{escape(item["name"])}</pre><span>')

        if type == "disk":
            capacity = item["capacity"]
            content.append(f'{readable_size(item["size"])} / {readable_size(capacity)}</span>')

            if capacity:
                content.append(f'<span>({round(item["size"] / item["capacity"] * 100)}%)')
            else:
                content.append(f'<span>(0%)')
        else:
            mtime, size = item["mtime"], item["size"]
            date, time = readable_date(mtime)
            size = "----" if size is None else readable_size(size)
            content.append(f'{size}</span><span>{date} {time}')

        content.append("</span></button>")
    return "".join(content)

 