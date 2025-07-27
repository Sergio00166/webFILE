# Code by Sergio00166

from flask import request, redirect, session, render_template
from os.path import exists, normpath, dirname
from os.path import commonpath, join, abspath
from urllib.parse import urlparse, urlunparse
from datetime import datetime as dt
from os import sep, access, R_OK
from json import load as jsload
from sys import stderr

is_subdirectory = lambda parent, child: commonpath([parent, child]) == parent
# A list of a secuence of bytes to identify the UTF-x using their BOMs
boms = ( b"\xef\xbb\xbf", b"\xff\xfe", b"\xfe\xff", b"\xff\xfe\x00\x00", b"\x00\x00\xfe\xff")


""" Global functions """

def safe_path(path, root, igntf=False):
    # Checks if the path is inside the root dir
    # else raise an exception depending on the case
    path = path.replace("/", sep)
    path = abspath(join(root,path))

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



""" Extra functions """

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


def redirect_no_query():
    parsed_url = urlparse(request.url)
    return redirect(urlunparse(("", "", parsed_url.path, "", "", "")))


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


