# Code by Sergio00166

from os.path import abspath, commonpath, dirname
from os.path import exists, normpath, isdir
from os import R_OK, access, sep, scandir
from datetime import datetime as dt
from flask import session
from pathlib import Path
from msgspec import json
from sys import stderr

# Load file type metadata only once at import time
file_types_path = abspath(f"{__file__}{sep}..{sep}file_types.json")
file_types = json.decode(open(file_types_path).read())
file_type_map = {v: k for k, vals in file_types.items() for v in vals}
autoload_webpage = "index" + file_types.get("webpage")[0]

boms = (
    b"\xef\xbb\xbf",
    b"\xff\xfe",
    b"\xfe\xff",
)
def is_binary(filepath):
    with open(filepath, "rb") as f:
        head = f.read(1024)
        if any(
            head.startswith(bom)
            for bom in boms
        ):  return False

        if b"\0" in head: return True
        size = f.seek(0, 2)

        f.seek(size >> 2)
        if b"\0" in f.read(1024): return True

        f.seek(size >> 1)
        return b"\0" in f.read(1024)

    return False


def isAdmin(USERS):
    user = USERS.get(session.get("user"))
    return user and user.get("admin")

def get_file_type(path):
    extension = path.rsplit(".", 1)[-1].lower()
    file_type = file_type_map.get(f".{extension}")

    if file_type: return file_type
    return "file" if is_binary(path) else "text"


def safe_path(path, root, igntf=False):
    path = path.replace("/", sep)
    path = abspath(f"{root}{sep}{path}")

    # Check if is subdirectory from root
    if commonpath([root, path]) == root:
        if igntf:                           return path
        if not exists(path):                raise FileNotFoundError
        if not access(path, R_OK):          raise PermissionError
        if sep == chr(92) and isdir(path):  scandir(path).close()
    else:                                   raise PermissionError
    return path


def load_userACL(USERS, ACL, users_file, acl_file):
    users_fd = open(users_file, "r")
    acl_fd   = open(acl_file,   "r")

    users_data = json.decode(users_fd.read())
    acl_data   = json.decode(  acl_fd.read())

    USERS.clear(); USERS.update(users_data)
    ACL.clear();     ACL.update(acl_data)


def validate_acl(path, ACL, write=False, retBool=False):
    if not path.startswith("/"): path = f"/{path}"

    user = session.get("user", "DEFAULT")
    askd_perm = 2 if write else 1
    prop = False

    while True:
        # Check if there is a rule for it
        if (acl_path := ACL.get(path)) and (values := acl_path.get(user)):
            if not values["inherit"] and prop:  break

            if values["access"] < askd_perm: break
            else: return True if retBool else None

        # Check if on top and break loop
        if path == "/":  break
        # Goto parent directory
        path = path[:path.rfind("/") or 1]
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
        + f"   [Info] {e_message}\n"
        + "[END]\n"
    )
    open(log_path, "a").write(msg)
    print(msg, file=stderr, end="")

 