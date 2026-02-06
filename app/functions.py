# Code by Sergio00166

from os.path import abspath, commonpath, dirname, exists, normpath
from datetime import datetime as dt
from os import R_OK, access, sep
from sys import path as pypath
from flask import session
from pathlib import Path
from msgspec import json
from sys import stderr

# Load file type metadata only once at import time
file_types = json.decode(open(f"{pypath[0]}{sep}file_types.json").read())
file_type_map = {v: k for k, vals in file_types.items() for v in vals}
autoload_webpage = "index" + file_types.get("webpage")[0]

boms = (
    b"\xef\xbb\xbf",
    b"\xff\xfe",
    b"\xfe\xff",
    b"\xff\xfe\x00\x00",
    b"\x00\x00\xfe\xff",
)

def get_file_type(path):
    extension = path.rsplit(".", 1)[-1].lower()
    file_type = file_type_map.get(f".{extension}")

    if file_type: return file_type
    return "file" if is_binary(path) else "text"


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


def safe_path(path, root, igntf=False):
    path = path.replace("/", sep)
    path = abspath(f"{root}{sep}{path}")

    # Check if is subdirectory from root
    if commonpath([root, path]) == root:
        if igntf:
            return path
        if not exists(path):
            raise FileNotFoundError
        if not access(path, R_OK):
            raise PermissionError
    else:
        raise PermissionError
    return path


def load_userACL(USERS, ACL, users_file, acl_file):
    USERS.clear(); ACL.clear()
    USERS.update(json.decode(open(users_file).read()))
    ACL.update(json.decode(open(acl_file).read()))


def validate_acl(path, ACL, write=False, retBool=False):
    askd_perm = 2 if write else 1
    user = session.get("user", "DEFAULT")
    prop = False

    path = normpath(path)
    if path == ".": path = ""
    path = path.replace(sep, "/")

    if path.startswith("//"):    path = path[2:]
    if not path.startswith("/"): path = f"/{path}"

    while True:
        # Check if there is a rule for it
        if path in ACL and user in ACL[path]:
            values = ACL[path][user]
            if not values["inherit"] and prop: break
            perm = values["access"]
            if perm == 0: break
            if perm >= askd_perm:
                return True if retBool else None

        # Check if on top and break loop
        if path == "/": break
        # Goto parent directory
        path = dirname(path)
        prop = True  # Flag

    if retBool: return False
    raise PermissionError


def printerr(e, log_path, override_msg=None):
    tb = e.__traceback__
    while tb.tb_next: tb = tb.tb_next
    e_type = type(e).__name__
    e_file = tb.tb_frame.f_code.co_filename
    e_line = tb.tb_lineno
    e_message = override_msg if override_msg else str(e)

    if e_message.startswith("["):
        idx = e_message.find("] ")
        errno = e_message[: idx + 1]
        e_type += f" ({errno[1:-1]} )"
        e_message = e_message[idx + 2 :]

    time_str = dt.now().strftime("%Y-%m-%d %H:%M:%S")
    msg = (
        "[ERROR]\n"
        + f"   [Time] {time_str} \n"
        + f"   [File] '{e_file}':{e_line}\n"
        + f"   [Type] {e_type}\n"
        + f"   [eMsg] {e_message}\n"
        + "[END]\n"
    )
    open(log_path, "a").write(msg)
    print(msg, file=stderr, end="")

 