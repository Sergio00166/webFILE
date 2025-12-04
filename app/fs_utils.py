# Code by Sergio00166

from os import scandir, sep, stat
from cache import setup_cache
from json import load as jsload
from sys import path as pypath
from pathlib import Path

if sep == chr(92): import ctypes
else: from os import statvfs

# Load file type metadata only once at import time
file_types = jsload(open(pypath[0] + sep + "file_types.json"))
file_type_map = {v: k for k, vals in file_types.items() for v in vals}
autoload_webpage = "index" + file_types.get("webpage")[0]
cache = setup_cache(2)

boms = (
    b"\xef\xbb\xbf",
    b"\xff\xfe",
    b"\xfe\xff",
    b"\xff\xfe\x00\x00",
    b"\x00\x00\xfe\xff",
)

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


def get_file_type(path):
    item = Path(path)
    if item.is_mount(): return "disk"
    if item.is_dir():   return "directory"

    file_type = file_type_map.get(item.suffix)
    if file_type:       return file_type
    return "file" if is_binary(path) else "text"


def get_disk_stat(path):
    if sep == chr(92):
        size, free = ctypes.c_ulonglong(), ctypes.c_ulonglong()
        ctypes.windll.kernel32.GetDiskFreeSpaceExW(
            path, None, ctypes.byref(size), ctypes.byref(free)
        )
        size, free = size.value, free.value
    else:
        st = statvfs(path)
        size = st.f_frsize * st.f_blocks
        free = st.f_frsize * st.f_bfree

    return {"size": size, "free": free, "used": size - free}


def get_dir_size(path):
    disk_free = get_disk_stat(path)["free"]
    disk_free = disk_free // (1024 * 1024)
    return size_traversal(path, disk_free)


@cache.cached("disk_size", TTL=5 * 60)
def size_traversal(root, disk_size):
    root_dev = stat(root).st_dev
    total, stack = 0, [root]

    while stack:
        path = stack.pop()
        try: dir_ls = scandir(path)
        except: continue

        for e in dir_ls:
            try:
                st = e.stat()
                if st.st_dev == 0:
                    st = stat(e.path)
            except: continue

            if e.is_file():
                total += st.st_size
            elif e.is_dir() and st.st_dev == root_dev:
                stack.append(e.path)
    return total

 