# Code by Sergio00166

from functions import validate_acl, get_disk_stat, get_dir_size
from os.path import join, relpath, basename, isdir, ismount
from datetime import datetime as dt
from json import load as jsload
from sys import path as pypath
from os import sep, scandir
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
    contents = []

    for item in scandir(folder_path):
        data = {}
        try:
            rel_path = relpath(item.path, start=root).replace(sep, "/")
            validate_acl(rel_path, ACL)
            st = item.stat()

            data = {
                "name":  item.name,
                "path":  rel_path,
                "type":  get_file_type(item.path),
                "mtime": st.st_mtime,
            }
            if data["type"] == "disk":
                disk = get_disk_stat(item.path)
                data["capacity"] = disk["size"]
                data["size"]     = disk["used"]
            else:
                data["size"] = (
                    (get_dir_size(item.path) if folder_size else 0)
                    if data["type"] == "directory" else st.st_size
                )
            contents.append(data)
        except: pass
    return contents


def sort_contents(folder_content, sort, root):
    dirs, files = [], []

    for x in folder_content:
        (dirs if x["type"] in ["disk", "directory"] else files).append(x)

    key_map = {
        "d": lambda x: x["mtime"] or 0,
        "s": lambda x: x["size"],
        "n": lambda x: x["name"],
    }
    if sort[0] in key_map:
        key = key_map[sort[0]]
        reverse = (sort[1] == "d")
        dirs  = sorted(dirs,  key=key, reverse=reverse)
        files = sorted(files, key=key, reverse=reverse)

    return dirs + files


def get_file_type(path):
    item = Path(path)
    if item.is_mount(): return "disk"
    if item.is_dir():   return "directory"

    file_type = file_type_map.get(item.suffix)
    if file_type:       return file_type
    return "file" if is_binary(path) else "text"


def humanize_all(data):
    for item in data:
        if "capacity" in item:
            item["used"] = 0 if item["capacity"] == 0 else round(item["size"] / item["capacity"] * 100)
            item["capacity"] = readable_size(item["capacity"])

        if "mtime" in item: item["mtime"] = readable_date(item["mtime"])
        item["size"] = readable_size(item["size"])


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
    else:
        return ["##/##/####", "##:##:##"]


def is_binary(filepath):
    with open(filepath, "rb") as f:
        head = f.read(4)
        if any(
            head.startswith(bom)
            for bom in boms
        ):  return False

        while chunk := f.read(1024):
            if b"\x00" in chunk: return True
    return False

 