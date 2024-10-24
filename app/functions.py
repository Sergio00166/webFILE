#Code by Sergio00166

from os.path import commonpath,join,isdir,relpath,abspath
from os import listdir,pardir,sep,scandir,access,R_OK
from os.path import getmtime,getsize,exists
from datetime import datetime as dt
from json import load as jsload
from sys import path as pypath
from pathlib import Path
from sys import stderr


is_subdirectory = lambda parent, child: commonpath([parent]) == commonpath([parent, child])
# Load database of file type and extensions
file_types = jsload(open(sep.join([pypath[0],"data","files.json"])))
# Convert it to a lookup table to get file type as O(1)
file_type_map = {v: k for k, vals in file_types.items() for v in vals}
# Check if the file is a binary file or not
textchars = bytearray({7,8,9,10,12,13,27} | set(range(0x20, 0x100)) - {0x7f})
is_binary = lambda path: bool(open(path, mode="rb").read(1024).translate(None, textchars))
# Function to compress HTML output (460KB to 180KB)
minify = lambda stream: (x.replace('\n', '').replace('  ', '') for x in stream)


def getclient(request):
    ua = request.headers.get('User-Agent', '').lower()   
    ah = request.headers.get('Accept', '').lower()
    json = any(x in ua for x in ["wget","curl","fetch"]) or 'application/json' in ah
    normal = ua.startswith("mozilla/5.0") and not any(x in ua for x in ["msie","trident"])
    return "normal" if normal else "json" if json else "legacy"

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
    if isdir(path): return "directory"
    file_type = file_type_map.get(Path(path).suffix)
    if file_type is not None: return file_type
    return "file" if is_binary(path) else "text"


def get_directory_size(directory):
    # Get the dir size recursively
    total = 0
    try:
        for entry in scandir(directory):
            if entry.is_file(): total += entry.stat().st_size
            elif entry.is_dir(): total += get_directory_size(entry.path)
    except NotADirectoryError: return getsize(directory)
    except PermissionError: return 0
    return total


def get_folder_content(folder_path, root, folder_size):
    # Gets folder content and get size, modified time values
    # the name, the path and the type of the elements and
    # returns a list containing one dict for each element
    items = listdir(folder_path)
    content = []
    for item in items:
        try:
            item_path = join(folder_path, item)
            description = get_file_type(item_path)
            if not description=="directory": size=readable(getsize(item_path))
            elif folder_size: size=readable(get_directory_size(item_path))
            else: size="0"
            try: mtime=dt.fromtimestamp(getmtime(item_path)).strftime("%d-%m-%Y %H:%M:%S")
            except: mtime="##-##-#### ##:##:##"          
            item_path= relpath(item_path, start=root).replace(sep,"/")
            if description=="directory": item_path+="/"
            content.append({'name': item,'path': item_path,
            'description': description, "size": size,"mtime": mtime})
        except: pass
    return content


def isornot(path,root):
    # Checks if the path is inside the root dir
    # else raise an exception depending on the case
    path=path.replace("/",sep)
    path=abspath(root+sep+path)
    if is_subdirectory(root, path):
        if not exists(path): raise FileNotFoundError
        if not access(path, R_OK): raise PermissionError
    else: raise PermissionError
    return path


def sort_contents(folder_content,sort,root):
    # Separe in dirs and files
    dirs=[]; files=[]
    for x in folder_content:
        path = x["path"].replace("/",sep)
        if isdir(root+sep+path): dirs.append(x)
        else: files.append(x)
    # Sorts the folder content with several modes
    if sort[0]=="d":
        dirs  = sorted(dirs, key=lambda x:unreadable_date(x["mtime"]))
        files = sorted(files,key=lambda x:unreadable_date(x["mtime"]))
        if sort[1]=="p": dirs,files = dirs[::-1],files[::-1]
    elif sort[0]=="s":
        dirs  = sorted(dirs, key=lambda x:unreadable(x["size"]))
        files = sorted(files,key=lambda x:unreadable(x["size"]))
        if sort[1]=="p": dirs,files = dirs[::-1],files[::-1]
    else:
        dirs  = sorted(dirs, key=lambda x:x["name"])
        files = sorted(files,key=lambda x:x["name"])
        if sort[1]=="d": dirs,files = dirs[::-1],files[::-1]

    return dirs+files


def printerr(e):  
    tb = e.__traceback__
    while tb.tb_next: tb = tb.tb_next
    e_type = type(e).__name__
    e_file = tb.tb_frame.f_code.co_filename
    e_line = tb.tb_lineno
    e_message = str(e)
    msg = (
        "[SERVER ERROR]\n"+
        f"   [line {e_line}] '{e_file}'\n"+
        f"   [{e_type}] {e_message}\n"+
        "[END ERROR]"
    )
    print(msg,file=stderr)

