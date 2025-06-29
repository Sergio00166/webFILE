# Code by Sergio00166

from os.path import getmtime, getsize, exists, normpath, dirname
from os.path import commonpath, join, isdir, relpath, abspath
from os import listdir, sep, scandir, access, R_OK
from urllib.parse import urlparse, urlunparse
from datetime import datetime as dt
from flask import request, redirect
from json import load as jsload
from sys import path as pypath
from flask import session
from pathlib import Path
from sys import stderr

if sep == chr(92): import ctypes
else: from os import statvfs

is_subdirectory = lambda parent, child: commonpath([parent, child]) == parent
# Load database of file type and extensions
file_types = jsload(open(pypath[0] + sep + "file_types.json"))
# Get website (plugin) extension to import it on actions.py
webpage_file_ext = file_types.get("webpage")[0]
# Convert it to a lookup table to get file type as O(1)
file_type_map = {v: k for k, vals in file_types.items() for v in vals}
# Function to compress HTML output without modifying contents
minify = lambda stream: ("".join(map(str.strip, x.split("\n"))) for x in stream)
# A list of a secuence of bytes to identify the UTF-x using their BOMs
boms = ( b"\xef\xbb\xbf", b"\xff\xfe", b"\xfe\xff", b"\xff\xfe\x00\x00", b"\x00\x00\xfe\xff",)


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


def safe_path(path, root, igntf=False):
    # Checks if the path is inside the root dir
    # else raise an exception depending on the case
    path = path.replace("/", sep)
    path = abspath(root + sep + path)
    if is_subdirectory(root, path):
        if igntf:
            return path
        if not exists(path):
            raise FileNotFoundError
        if not access(path, R_OK):
            raise PermissionError
    else:
        raise PermissionError
    return path


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
                    pass
                elif entry.is_dir():
                    stack.append(entry.path)

        except NotADirectoryError:
            total += getsize(current)
        except PermissionError:
            pass
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


def get_folder_content(folder_path, root, folder_size, ACL):
    dirs, files, content = [], [], []

    for x in listdir(folder_path):
        fix = join(folder_path, x)
        if isdir(fix):
            dirs.append(x)
        else:
            files.append(x)

    dirs.sort()
    files.sort()
    for item in dirs + files:
        try:
            item_path = join(folder_path, item)
            item_full_path = relpath(item_path, start=root).replace(sep, "/")

            validate_acl(item_full_path, ACL)
            filetype = get_file_type(item_path)

            if filetype in ["directory", "disk"]:
                if not folder_size:
                    size = 0
                else:
                    size = get_directory_size(item_path)
            else:
                size = getsize(item_path)

            if filetype != "disk":
                try:
                    mtime = getmtime(item_path)
                except:
                    mtime = None
            else:
                mtime = None

            if filetype == "directory":
                item_path += "/"
            data = {
                "name": item,
                "path": item_full_path,
                "type": filetype,
                "size": size,
                "mtime": mtime,
            }
            if filetype == "disk":
                data["capacity"] = get_disk_capacity(root + sep + item_full_path)

            content.append(data)
        except:
            pass
    return content


def sort_contents(folder_content, sort, root):
    dirs, files = [], []

    for x in folder_content:
        path = x["path"].replace("/", sep)
        if isdir(root + sep + path):
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

def load_userACL(USERS, ACL, users_file, acl_file):
    USERS.clear()
    ACL.clear()
    USERS.update(jsload(open(users_file)))
    ACL.update(jsload(open(acl_file)))


# Checks if the given path has permissions
# in the ACL file (uses inheritance)
def validate_acl(path, ACL, write=False):
    askd_perm = 2 if write else 1
    user = session.get("user", "DEFAULT")
    path = normpath(path)
    path = path.replace(sep, "/")
    prop = False

    if path.startswith("//"):
        path = path[2:]
    if not path.startswith("/"):
        path = "/" + path

    while True:
        # Check if there is a rule for it
        if path in ACL and user in ACL[path]:
            values = ACL[path][user]
            if not values["inherit"] and prop: break
            perm = values["access"]
            if perm == 0: break
            if perm >= askd_perm: return
                
        # Check if on top and break loop
        if path == "/": break
        # Goto parent directory
        path = dirname(path)
        prop = True # Flag

    raise PermissionError


def printerr(e, log_path, override_msg=None):
    tb = e.__traceback__
    while tb.tb_next:
        tb = tb.tb_next
    e_type = type(e).__name__
    e_file = tb.tb_frame.f_code.co_filename
    e_line = tb.tb_lineno

    if override_msg:
        e_message = override_msg
    else:
        e_message = e_message = str(e)

    if e_message.startswith("["):
        idx = e_message.find("] ")
        errno = e_message[: idx + 1]
        e_type += " (" + errno[1:-1] + ")"
        e_message = e_message[idx + 2 :]

    time_str = dt.now().strftime("%Y-%m-%d %H:%M:%S")
    msg = (
        "[ERROR]\n" + f"   [Time] {time_str} \n"
        f"   [File] '{e_file}':{e_line}\n"
        + f"   [Type] {e_type}\n"
        + f"   [eMsg] {e_message}\n"
        + "[END]\n"
    )
    open(log_path, "a").write(msg)
    print(msg, file=stderr, end="")


def redirect_no_query():
    parsed_url = urlparse(request.url)
    return redirect(urlunparse(("", "", parsed_url.path, "", "", "")))

