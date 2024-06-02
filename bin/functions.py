#Code by Sergio 1260

from os.path import commonpath, join, isdir, relpath, abspath
from os.path import getmtime, getsize, exists
from datetime import datetime as dt
from os import listdir, pardir, sep, scandir, access, R_OK
from pathlib import Path
from argparse import ArgumentParser

# Some file formats
file_types = { "SRC": [".c", ".cpp", ".java", ".py", ".html", ".css", ".js", ".php", ".rb", ".go", ".xml", ".ini",
".json",".bat", ".cmd", ".sh", ".md", ".xmls", ".yml", ".yaml", ".ini" ".asm", ".cfg", ".sql", ".htm", ".config"],
"IMG": [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".svg", ".tiff", ".ico", ".webp"],
"Audio": [".mp3", ".wav", ".ogg", ".flac", ".aac", ".m4a", ".wma"], "DOC": [".doc", ".docx", ".odt", ".rtf"],
"DB": [".xls", ".xlsx", ".ods", ".csv", ".tsv", ".db", ".odb"], "PP": [".ppt", ".pptx", ".odp"],
"Video": [".mp4", ".avi", ".mkv", ".mov", ".wmv", ".flv", ".webm"],"PDF": [".pdf"],
"HdImg": [".iso", ".img", ".vdi", ".vmdk", ".vhd"], "Compress": [".zip", ".7z", ".rar", ".tar", ".gzip"],
"BIN": [".exe", ".dll", ".bin", ".sys", ".so"]}

# Check if the text if binary
textchars = bytearray({7,8,9,10,12,13,27} | set(range(0x20, 0x100)) - {0x7f})
is_binary_string = lambda bytes: bool(bytes.translate(None, textchars))

def init():
    # Parse all CLI arguments
    parser = ArgumentParser(description="Arguments for the webFILE")
    parser.add_argument("-b", "--bind", type=str, required=True, help="Specify IP address to bind", metavar="IP")
    parser.add_argument("-p", "--port", type=int, required=True, help="Specify port number")
    parser.add_argument("-d", "--dir", type=str, required=True, help="Specify directory to share")
    parser.add_argument("--dirsize", action="store_true", help="Show folder size")
    parser.add_argument("--subtitle_cache", action="store_true", help="Enable caching of subtitles")
    args = parser.parse_args()
    return args.port, args.bind, args.dir, args.dirsize, args.subtitle_cache

def fix_pth_url(path):
    # This replaced buggy chars with the HTML replacement
    return path.replace("'","%27").replace("&","%26").replace(chr(92),"%5C").replace("#","%23")

def sort_results(paths,folder_path):
    # Here we sort the folder contents
    # First dirs and secondly files
    # both in alphabetial order
    dirs=[]; files=[]
    for x in paths:
        fix = join(folder_path, x)
        if isdir(fix): dirs.append(x)
        else: files.append(x)
    dirs.sort(); files.sort()
    return dirs+files

def readable(num, suffix="B"):
    # Connverts byte values to a human readable format
    for unit in ["", "Ki", "Mi", "Gi", "Ti"]:
        if abs(num) < 1024.0:
            return f"{num:3.1f} {unit}{suffix}"
        num /= 1024.0
    return f"{num:.1f} Yi{suffix}"

def unreadable(size_str):
    # Connverts the human readable format to bytes
    if not size_str=="0":
        size, unit = size_str.split(" "); size = float(size)
        units={'B':1,'KiB':1024,'MiB':1024**2,'GiB':1024**3,'TiB':1024**4}
        return int(size * units.get(unit, 1))
    else: return 0

def unreadable_date(date_str):
    # Connverts the human readable format to time
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
    # Get the dir size recursively
    total = 0
    try:
        for entry in scandir(directory):
            if entry.is_file(): total += entry.stat().st_size
            elif entry.is_dir(): total += get_directory_size(entry.path)
    except NotADirectoryError: return path.getsize(directory)
    except PermissionError: return 0
    return total

def get_folder_content(folder_path, root, folder_size):
    # Gets folder content and get size, modified time values
    # the name, the path and the type of the elements and
    # returns a list containing one dict for each element
    items = listdir(folder_path)
    items=sort_results(items,folder_path)
    content = []
    for item in items:
        try:
            item_path = join(folder_path, item)
            description = get_file_type(item_path)
            if not description=="DIR": size=readable(getsize(item_path))
            elif folder_size: size=readable(get_directory_size(item_path))
            else: size="0"
            try: mtime=dt.fromtimestamp(getmtime(item_path)).strftime("%d-%m-%Y %H:%M:%S")
            except: mtime="##-##-#### ##:##:##"          
            item_path= relpath(item_path, start=root).replace(sep,"/")
            content.append({'name': item,'path': item_path,
            'description': description, "size": size,"mtime": mtime})
        except: pass
    return content
