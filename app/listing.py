# Code by Sergio00166

from functions import validate_acl, get_file_type, _TO_POSIX
from urllib.parse import quote as encurl
from os import scandir, sep, stat
from os.path import getmtime
from cache import setup_cache
from shutil import disk_usage
from flask import session

cache = setup_cache(2)

def get_folder_content(folder_path, ACL, root, user, folder_size):
    data = list_folder(folder_path, root, folder_size, getmtime(folder_path))

    rel_path = folder_path[len(root):].translate(_TO_POSIX)
    rel_path = f"/{rel_path}/" if rel_path else "/"

    return [
        x for x in data
        if validate_acl(
            f'{rel_path}{x["name"]}',
            ACL, user, retBool=True
        )
    ]

@cache.cached("parent_mtime", TTL=120)
def list_folder(folder_path, root, folder_size, parent_mtime):
    parent_dev = stat(folder_path).st_dev
    dirs, files = [], []

    for item in scandir(folder_path):
        try:
            st = item.stat()
            data = {
                "name":  item.name,
                "mtime": st.st_mtime,
            }
            if (item.is_dir()):
                entry_dev = (stat(item.path) if sep == chr(92) else st).st_dev

                if entry_dev != parent_dev:
                    disk = disk_usage(item.path)
                    data["type"]     = "disk"
                    data["size"]     = disk.used
                    data["capacity"] = disk.total
                else:
                    data["type"] = "directory"
                    data["size"] = size_traversal(item.path) if folder_size else None

                dirs.append(data)
            else:
                data["type"] = get_file_type(item.path)
                data["size"] = st.st_size

                files.append(data)
        except: continue

    sort_key = lambda x: x["name"]
    dirs.sort(key=sort_key)
    files.sort(key=sort_key)
    return dirs + files


def size_traversal(root):
    total, stack = 0, [root]
    root_dev = stat(root).st_dev

    while stack:
        path = stack.pop()
        try: dir_ls = scandir(path)
        except: continue

        for e in dir_ls:
            try:
                st = e.stat()
                if e.is_file(): total += st.st_size
                else:
                    entry_dev = (stat(item.path) if sep == chr(92) else st).st_dev
                    if root_dev == entry_dev: stack.append(e.path)
            except: continue
    return total

 