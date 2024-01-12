#Code by Sergio 1260

from flask import Flask, render_template, request, send_from_directory
from flask_bootstrap import Bootstrap
from os.path import commonpath, join, isdir, relpath, abspath
from os.path import getmtime, getsize
from datetime import datetime as dt
from os import listdir, pardir, sep, scandir
from pathlib import Path
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
    global root
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
    if not "folder" in dic:
        print(" ERROR: a folder is needed")
        exit()
    else:
        root=dic["folder"]
        return dic["port"], dic["listen"], root

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

def get_file_type(path):
    if isdir(path): return "DIR"
    else:
        file_extension=Path(path).suffix
        for types, extensions in file_types.items():
            if file_extension in extensions: return types
        if not is_binary_string(open(path, mode="rb").read(1024)):
            return "Text"
        else: return "File"
def is_subdirectory(parent, child): return commonpath([parent]) == commonpath([parent, child])
    
def get_folder_content(folder_path):
    global root
    items = listdir(folder_path)
    items=sort_results(items,folder_path)
    content = []
    for item in items:
        item_path = join(folder_path, item)
        description = get_file_type(item_path)
        if not description=="DIR":
            size=readable(getsize(item_path))
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
def fix_Addr(file_path):
    global root
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
    
