# Code by Sergio00166

from functions import validate_acl, get_file_type
from os import scandir, sep, stat
from cache import setup_cache
from shutil import disk_usage
from os.path import relpath

cache = setup_cache(2)


def get_folder_content(folder_path, root, folder_size, ACL):
    contents = []
    parent_dev = False if sep == chr(92) else stat(folder_path).st_dev
    disk_free = disk_usage(folder_path).free // (1024 * 1024)

    for item in scandir(folder_path):
        data = {}
        try:
            rel_path = relpath(item.path, start=root).replace(sep, "/")
            validate_acl(rel_path, ACL)

            st = item.stat()
            data = {
                "name":  item.name,
                "path":  rel_path,
                "mtime": st.st_mtime,
            }
            if (item.is_dir()):
                entry_dev = item.is_symlink() if sep == chr(92) else st.st_dev

                if entry_dev != parent_dev:
                    disk = disk_usage(item.path)
                    data["type"]     = "disk"
                    data["size"]     = disk.used
                    data["capacity"] = disk.total
                else:
                    data["type"] = "directory"
                    data["size"] = size_traversal(item.path, disk_free) if folder_size else 0
            else:
                data["type"] = get_file_type(item.path)
                data["size"] = st.st_size

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


@cache.cached("disk_free", TTL=5 * 60)
def size_traversal(root, disk_free):
    total, stack = 0, [root]
    root_dev = False if sep == chr(92) else stat(root).st_dev

    while stack:
        path = stack.pop()
        try: dir_ls = scandir(path)
        except: continue

        for e in dir_ls:
            try: st = e.stat()
            except: continue

            if e.is_file(): total += st.st_size
            else:
                entry_dev = e.is_symlink() if sep == chr(92) else st.st_dev
                if root_dev == entry_dev: stack.append(e.path)
    return total

 