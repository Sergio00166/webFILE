# Code by Sergio00166

from functions import validate_acl, get_file_type
from urllib.parse import quote as encurl
from os.path import relpath, getmtime
from os import scandir, sep, stat
from cache import setup_cache
from shutil import disk_usage

cache = setup_cache(2)


def get_folder_content(folder_path, root, folder_size, ACL):
    data = list_folder(folder_path, root, folder_size, getmtime(folder_path))
    return [x for x in data if validate_acl(x["path"], ACL, retBool=True)]

@cache.cached("parent_mtime", TTL=60)
def list_folder(folder_path, root, folder_size, parent_mtime):
    parent_dev = stat(folder_path).st_dev
    contents = []

    for item in scandir(folder_path):
        try:
            st = item.stat()
            data = {
                "name":  item.name,
                "path":  "/" + encurl(relpath(item.path, start=root).replace(sep, "/")),
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
            else:
                data["type"] = get_file_type(item.path)
                data["size"] = st.st_size

            contents.append(data)
        except: continue
    return contents


def sort_contents(folder_content, sort, root):
    dirs, files = [], []

    for x in folder_content:
        (dirs if x["type"] in ("disk", "directory") else files).append(x)

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

 