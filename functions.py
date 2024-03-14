#Code by Sergio 1260

from os.path import commonpath, join, isdir, relpath, abspath
from os.path import getmtime, getsize, exists
from datetime import datetime as dt
from os import listdir, pardir, sep, scandir, access, R_OK
from pathlib import Path

file_types = { "SRC": [".c", ".cpp", ".java", ".py", ".html", ".css", ".js", ".php", ".rb", ".go", ".xml", ".ini",
".json",".bat", ".cmd", ".sh", ".md", ".xmls", ".yml", ".yaml", ".ini" ".asm", ".cfg", ".sql", ".htm", ".config"],
"IMG": [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".svg", ".tiff", ".ico", ".webp"],
"Audio": [".mp3", ".wav", ".ogg", ".flac", ".aac", ".m4a", ".wma"], "DOC": [".doc", ".docx", ".odt", ".rtf"],
"DB": [".xls", ".xlsx", ".ods", ".csv", ".tsv", ".db", ".odb"], "PP": [".ppt", ".pptx", ".odp"],
"Video": [".mp4", ".avi", ".mkv", ".mov", ".wmv", ".flv", ".webm"],"PDF": [".pdf"],
"HdImg": [".iso", ".img", ".vdi", ".vmdk", ".vhd"], "Compress": [".zip", ".7z", ".rar", ".tar", ".gzip"],
"BIN": [".exe", ".dll", ".bin", ".sys", ".so"]}

textchars = bytearray({7,8,9,10,12,13,27} | set(range(0x20, 0x100)) - {0x7f})
is_binary_string = lambda bytes: bool(bytes.translate(None, textchars))

def fix_pth_url(path):
    return path.replace("'","%27").replace("&","%26").replace(chr(92),"%5C")

def sort_results(paths,folder_path):
    dirs=[]; files=[]
    for x in paths:
        fix = join(folder_path, x)
        if isdir(fix): dirs.append(x)
        else: files.append(x)
    dirs.sort(); files.sort()
    return dirs+files

def readable(num, suffix="B"):
    for unit in ["", "Ki", "Mi", "Gi", "Ti"]:
        if abs(num) < 1024.0:
            return f"{num:3.1f} {unit}{suffix}"
        num /= 1024.0
    return f"{num:.1f} Yi{suffix}"

def unreadable(size_str):
    if not size_str=="0":
        size, unit = size_str.split(" "); size = float(size)
        units={'B':1,'KiB':1024,'MiB':1024**2,'GiB':1024**3,'TiB':1024**4}
        return int(size * units.get(unit, 1))
    else: return 0

def unreadable_date(date_str):
    if date_str == '##-##-#### ##:##:##': return float(0)
    return dt.strptime(date_str, '%d-%m-%Y %H:%M:%S').timestamp()

def get_file_type(path):
    if isdir(path): return "DIR"
    else:
        file_extension=Path(path).suffix
        for types, extensions in file_types.items():
            if file_extension in extensions: return types
        if not is_binary_string(open(path, mode="rb").read(1024)):
            return "Text"
        else: return "File"

def is_subdirectory(parent, child):
    return commonpath([parent]) == commonpath([parent, child])

def get_directory_size(directory):
    total = 0
    try:
        for entry in scandir(directory):
            if entry.is_file(): total += entry.stat().st_size
            elif entry.is_dir(): total += get_directory_size(entry.path)
    except NotADirectoryError: return path.getsize(directory)
    except PermissionError: return 0
    return total

def get_folder_content(folder_path, root, folder_size):
    items = listdir(folder_path)
    items=sort_results(items,folder_path)
    content = []
    for item in items:
        try:
            item_path = join(folder_path, item)
            description = get_file_type(item_path)
            if not description=="DIR": size=readable(getsize(item_path))
            elif folder_size=="true": size=readable(get_directory_size(item_path))
            else: size="0"
            try: mtime=dt.fromtimestamp(getmtime(item_path)).strftime("%d-%m-%Y %H:%M:%S")
            except: mtime="##-##-#### ##:##:##"          
            item_path= relpath(item_path, start=root).replace(sep,"/")
            content.append({'name': item,'path': item_path,
            'description': description, "size": size,"mtime": mtime})
        except: pass
    return content

# This returns the directory and the name of
# the file if it is inside the root directory
def fix_Addr(file_path, root):
    file_path=file_path.replace("/",sep)
    file_path=file_path.split(sep)
    if len(file_path)==1:
        file=file_path[0]
        directory=root
    else:
        file=file_path[-1]
        file_path.pop()
        fix=sep.join(file_path)
        directory=root+sep+fix
    if not is_subdirectory(root, abspath(directory)):
        return None, None
    else: return directory, file
