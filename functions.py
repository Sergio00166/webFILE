#Code by Sergio 1260

from os import listdir, pardir, sep, scandir
from pathlib import Path
from os.path import commonpath, join, isdir, relpath, abspath
from os.path import getmtime, getsize, exists, isdir
from datetime import datetime as dt
from flask import Flask, render_template, request, send_from_directory
from sys import argv

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

def init():
    if len(argv)==1: file="config.cfg"
    else: file=argv[1]
    file = open(file,"r"); dic={}
    for x in file:
        x=x.rstrip().lstrip()
        if not len(x)==0 and not x.startswith("#"):
            key=x[:x.find(":")]
            value=x[x.find(":")+1:]
            value=value.rstrip().lstrip()
            key=key.rstrip().lstrip()
            dic[key]=value
    if not "port" in dic: dic["port"]="5000"
    if not "listen" in dic: dic["listen"]="172.0.0.1"
    if not "show.folder.size" in dic: folder_size="false"
    else: folder_size=dic["show.folder.size"].lower()
    if not "folder" in dic:
        print("[CFG_FILE]: A FOLDER PATH IS NEEDED"); exit()
    root=dic["folder"]
    if not (exists(root) and isdir(root)):
        print("[CFG_FILE]: THE SPECIFIED FOLDER PATH IS NOT VALID"); exit()
    if not "debug" in dic:
        debug=dic["debug"].lower
        if debug=="false": debug=False
        else: debug==True
    else: debug=False
    return dic["port"], dic["listen"], root, debug, folder_size

def get_file_type(path):
    if isdir(path): return "DIR"
    else:
        file_extension=Path(path).suffix
        for types, extensions in file_types.items():
            if file_extension in extensions: return types
        if not is_binary_string(open(path, mode="rb").read(1024)):
            return "Text"
        else: return "File"

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
            return f"{num:3.1f}{unit}{suffix}"
        num /= 1024.0
    return f"{num:.1f}Yi{suffix}"
      
def is_subdirectory(parent, child): return commonpath([parent]) == commonpath([parent, child])

def get_directory_size(directory):
    total = 0
    try:
        for entry in scandir(directory):
            if entry.is_file(): total += entry.stat().st_size
            elif entry.is_dir(): total += get_directory_size(entry.path)
    except NotADirectoryError: return path.getsize(directory)
    except PermissionError: return 0
    return total
    
def get_folder_content(folder_path, folder_size, root):
    items = listdir(folder_path)
    items=sort_results(items,folder_path)
    content = []
    for item in items:
        item_path = join(folder_path, item)
        description = get_file_type(item_path)
        if not description=="DIR":
            size=readable(getsize(item_path))
        elif folder_size=="true":
            size=readable(get_directory_size(item_path))
        else: size=""
        try:
           mtime=dt.fromtimestamp(getmtime(item_path)).strftime("%d-%m-%Y %H:%M:%S")
        except: mtime="##-##-#### ##:##:##"
        item_path= relpath(item_path, start=root)
        # Ilegal fix to make it work under Linux
        item_path = item_path.replace(sep,chr(92))
        content.append({'name': item,'path': item_path,'description': description,"size": size, "mtime": mtime})
    return content

# Ilegal fix to make it work under Linux
def fix_Addr(file_path, root):
    file_path=file_path.split(chr(92))
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

def ls_dir_main(folder_path, root, folder_size):
    is_root=False
    if folder_path=="." or folder_path=="": is_root=True
    folder_path=folder_path.replace(chr(92),sep)
    folder_path=root+sep+folder_path
    if sep==chr(92): folder_path=folder_path.replace("\\\\","\\")
    # Deny access if not inside root
    if not is_subdirectory(root, abspath(folder_path)): raise PermissionError
    folder_content = get_folder_content(folder_path,folder_size,root)
    parent_directory = abspath(join(folder_path, pardir))
    if parent_directory==root: parent_directory=""
    else: parent_directory= relpath(parent_directory, start=root)
    folder_path = relpath(folder_path, start=root)
    if folder_path==".": folder_path=""
    folder_path="/"+folder_path.replace(sep,"/")
    return [folder_content,folder_path,parent_directory,is_root]
    
