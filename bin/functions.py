#Code by Sergio 1260

from os.path import commonpath, join, isdir, relpath, abspath
from os.path import getmtime, getsize, exists
from datetime import datetime as dt
from os import listdir, pardir, sep, scandir, access, R_OK
from pathlib import Path
from sys import stderr
from re import compile as recompile
from argparse import ArgumentParser
import logging


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

ipv4_pattern = recompile(r'^(\d{1,3}\.){3}\d{1,3}$')
ipv6_pattern = recompile(r'^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$')

def is_valid_ip(ip):
    if ipv4_pattern.match(ip):
        parts = ip.split('.')
        for part in parts:
            if int(part) < 0 or int(part) > 255:
                return False
        return True
    elif ipv6_pattern.match(ip): return True
    else: return False

def init():
    print(""); exit_err = False
    # Parse all CLI arguments
    parser = ArgumentParser(description="Arguments for the webFILE")
    parser.add_argument("-b", "--bind", type=str, required=True, help="Specify IP address to bind", metavar="IP")
    parser.add_argument("-p", "--port", type=str, required=True, help="Specify port number")
    parser.add_argument("-d", "--dir", type=str, required=True, help="Specify directory to share")
    parser.add_argument("--dirsize", action="store_true", help="Show folder size")
    parser.add_argument("--subtitle_cache", action="store_true", help="Enable caching of subtitles")
    args = parser.parse_args()
    if not is_valid_ip(args.bind):
        print("THE IP IS NOT VALID")
        exit_err = True   
    try: int(args.port)
    except:
        print("THE PORT IS NOT VALID")
        exit_err = True     
    if not (exists(args.dir) and isdir(args.dir)):
        print("THE FOLDER PATH IS NOT VALID")
        exit_err = True   
    if exit_err: exit(1)
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


def printerr(e):  
    tb = e.__traceback__
    while tb.tb_next: tb = tb.tb_next
    e_type = type(e).__name__
    e_file = tb.tb_frame.f_code.co_filename
    e_line = tb.tb_lineno
    e_message = str(e)
    logger = logging.getLogger(__name__)
    simple_handler = logging.StreamHandler()
    simple_handler.setFormatter(logging.Formatter('%(message)s'))
    logger.addHandler(simple_handler)
    msg = (
        "\033[31m[SERVER ERROR]\033[0m\n"+
        f"   [line {e_line}] '{e_file}'\n"+
        f"   [{e_type}] {e_message}\n"+
        "\033[31m[END ERROR]\033[0m"
    )
    if simple_handler.stream is stderr:
        msg = msg.replace("\033[31m","")
        msg = msg.replace("\033[0m","")
    logger.critical(msg)
    logger.removeHandler(simple_handler)

