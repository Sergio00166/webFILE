# Code by Sergio00166

from os.path import exists, normpath, dirname
from os.path import commonpath, abspath
from os import sep, access, R_OK, scandir, stat
from datetime import datetime as dt
from json import load as jsload
from flask import session
from pathlib import Path
from sys import stderr

if sep == chr(92): import ctypes
else: from os import statvfs

is_subdirectory = lambda parent, child: commonpath([parent, child]) == parent


""" Global functions """

def safe_path(path, root, igntf=False):
    # Checks if the path is inside the root dir
    # else raise an exception depending on the case
    path = path.replace("/", sep)
    path = abspath(sep.join([root,path]))

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

def get_disk_stat(path):
    if sep == chr(92):
        size, free = ctypes.c_ulonglong(), ctypes.c_ulonglong()
        ctypes.windll.kernel32.GetDiskFreeSpaceExW(
            path, None, ctypes.byref(total), ctypes.byref(free)
        )
        total, free = total.value, free.value
    else:
        st = statvfs(path)
        size = st.f_frsize * st.f_blocks
        free = st.f_frsize * st.f_bfree

    return {"size": size, "free": free, "used": size-free}  


def get_dir_size(root):
    try: root_dev = stat(root).st_dev
    except: return 0

    total, stack = 0, [root]
    while stack:
        path = stack.pop()
        for e in scandir(path):
            try:
                st = e.stat()
                if e.is_file():
                    total += st.st_size
                elif e.is_dir() and st.st_dev == root_dev:
                    stack.append(e.path)
            except: pass
    return total



