# Code by Sergio00166

from functions import validate_acl, get_disk_stat, get_dir_size
from os.path import join, isdir, relpath, getsize, getmtime
from datetime import datetime as dt
from json import load as jsload
from sys import path as pypath
from os import sep, listdir
from pathlib import Path

# Load database of file type and extensions
file_types = jsload(open(join(pypath[0],"file_types.json")))
# Convert it to a lookup table to get file type as O(1)
file_type_map = {v: k for k, vals in file_types.items() for v in vals}
# Get website (plugin) extension to import it on actions.py
webpage_file_ext = file_types.get("webpage")[0]
# A list of a secuence of bytes to identify the UTF-x using their BOMs
boms = ( b"\xef\xbb\xbf", b"\xff\xfe", b"\xfe\xff", b"\xff\xfe\x00\x00", b"\x00\x00\xfe\xff")


def get_folder_content(folder_path, root, folder_size, ACL):
    dirs, files, content = [], [], []
    for x in sorted(listdir(folder_path)):
        (dirs if isdir(join(folder_path, x)) else files).append(x)

    for item in dirs + files:
        data = {}
        try:
            item_path = join(folder_path, item)
            rel_path = relpath(item_path, start=root).replace(sep, "/")
            validate_acl(rel_path,ACL)

            data["name"] = item
            data["path"] = rel_path
            data["type"] = get_file_type(item_path)

            if data["type"] == "disk":
                disk = get_disk_stat(item_path)
                data["capacity"] = disk["size"]
                data["size"] = disk["used"]
            else:
                data["size"] = (
                    (get_dir_size(item_path) if folder_size else 0)
                    if data["type"] == "directory" else getsize(item_path)
                )

            try:    data["mtime"] = getmtime(item_path)
            except: data["mtime"] = None
                            
            content.append(data)
        except: pass
    return content


def sort_contents(folder_content, sort, root):
    dirs, files = [], []

    for x in folder_content:
        # path is a relative path 
        path = x["path"].replace("/", sep)
        if isdir(join(root,path)):
            dirs.append(x)
        else:
            files.append(x)

    # Sort folder content based on raw values
    if sort[0] == "d":
        dirs = sorted(dirs, key=lambda x: x["mtime"] or 0)
        files = sorted(files, key=lambda x: x["mtime"] or 0)
        if sort[1] == "p":
            dirs, files = dirs[::-1], files[::-1]

    elif sort[0] == "s":
        dirs = sorted(dirs, key=lambda x: x["size"])
        files = sorted(files, key=lambda x: x["size"])
        if sort[1] == "p":
            dirs, files = dirs[::-1], files[::-1]

    elif sort[1] == "d":
        dirs, files = dirs[::-1], files[::-1]
    return dirs + files


def get_file_type(path):
    if Path(path).is_mount():
        return "disk"
    if isdir(path):
        return "directory"
    file_type = file_type_map.get(Path(path).suffix)
    if file_type is not None:
        return file_type
    return "file" if is_binary(path) else "text"


def humanize_all(data):
    for item in data:
        if "capacity" in item:
            if item["capacity"] == 0: item["used"] = 0
            else: item["used"] = round(item["size"] / item["capacity"] * 100)
            item["capacity"] = readable_size(item["capacity"])

        if "mtime" in item:
            item["mtime"] = readable_date(item["mtime"])
        item["size"] = readable_size(item["size"])


def readable_size(num, suffix="B"):
    # Connverts byte values to a human readable format
    for unit in ("", "Ki", "Mi", "Gi", "Ti"):
        if num < 1024:
            return f"{num:.1f} {unit}{suffix}"
        num /= 1024
    return f"{num:.1f} Yi{suffix}"


def readable_date(date):
    if date is not None:
        cd = dt.fromtimestamp(date)
        return [cd.strftime("%d/%m/%Y"), cd.strftime("%H:%M")]
    else:
        return ["##/##/####", "##:##:##"]


def is_binary(filepath):
    with open(filepath, "rb") as f:
        head = f.read(4)
        if any(head.startswith(bom) for bom in boms):
            return False
        if b"\x00" in head:
            return True
        while chunk := f.read(1024):
            if b"\x00" in chunk:
                return True
    return False



