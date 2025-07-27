# Code by Sergio00166

from functions import validate_acl, is_binary, readable_size, readable_date
from os.path import join, isdir, relpath, getsize, getmtime
from os import sep, listdir, scandir
from json import load as jsload
from sys import path as pypath
from pathlib import Path
from flask import request

if sep == chr(92): import ctypes
else: from os import statvfs

# Load database of file type and extensions
file_types = jsload(open(join(pypath[0],"file_types.json")))
# Convert it to a lookup table to get file type as O(1)
file_type_map = {v: k for k, vals in file_types.items() for v in vals}
# Get website (plugin) extension to import it on actions.py
webpage_file_ext = file_types.get("webpage")[0]


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
            data["size"] = (
                (get_directory_size(item_path) if folder_size else 0)
                if data["type"] in ["directory", "disk"] else getsize(item_path)
            )
            if data["type"] == "disk":
                data["capacity"] = get_disk_capacity(item_path)

            try:    data["mtime"] = getmtime(item_path)
            except: data["mtime"] = None

            content.append(data)
        except: pass
    return content


def sort_contents(folder_content, sort, root):
    dirs, files = [], []

    for x in folder_content:
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


def get_directory_size(directory):
    total, stack = 0, [directory]
    while stack:
        current = stack.pop()
        try:
            for entry in scandir(current):
                if entry.is_file():
                    total += entry.stat().st_size
                elif Path(entry.path).is_mount():
                    pass # Ignore it
                elif entry.is_dir():
                    stack.append(entry.path)

        except NotADirectoryError:
            total += getsize(current)
        except PermissionError: pass
    return total


def get_disk_capacity(disk):
    if sep == chr(92):
        size_bytes = windll.kernel32.GetDiskFreeSpaceExW.GetDiskFreeSpaceExW(
            ctypes.c_wchar_p(drive_path), None, ctypes.byref(c_ulonglong()), None
        ).value
    else:
        disk_obj = statvfs(disk)
        size_bytes = disk_obj.f_frsize * disk_obj.f_blocks
    return size_bytes


def humanize_all(data):
    for item in data:
        if "capacity" in item:
            if item["capacity"] == 0: item["used"] = 0
            else: item["used"] = round(item["size"] / item["capacity"] * 100)
            item["capacity"] = readable_size(item["capacity"])

        if "mtime" in item:
            item["mtime"] = readable_date(item["mtime"])
        item["size"] = readable_size(item["size"])


