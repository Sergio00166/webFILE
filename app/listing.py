# Code by Sergio00166

from functions import validate_acl, get_file_type
from datetime import datetime as dt
from os import scandir, sep, stat
from cache import setup_cache
from shutil import disk_usage
from os.path import relpath

cache = setup_cache(2)


def get_folder_content(folder_path, root, folder_size, ACL):
    contents = []

    for item in scandir(folder_path):
        data = {}
        try:
            rel_path = relpath(item.path, start=root).replace(sep, "/")
            validate_acl(rel_path, ACL)
            st = item.stat()

            data = {
                "name":  item.name,
                "path":  rel_path,
                "type":  get_file_type(item.path),
                "mtime": st.st_mtime,
            }
            if data["type"] == "disk":
                disk = disk_usage(item.path)
                data["capacity"] = disk.total
                data["size"]     = disk.used
            else:
                data["size"] = (
                    (get_dir_size(item.path) if folder_size else 0)
                    if data["type"] == "directory" else st.st_size
                )
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


def humanize_all(data):
    for item in data:
        if "capacity" in item:
            item["used"] = 0 if item["capacity"] == 0 else round(item["size"] / item["capacity"] * 100)
            item["capacity"] = readable_size(item["capacity"])

        if "mtime" in item: item["mtime"] = readable_date(item["mtime"])
        item["size"] = readable_size(item["size"])


def readable_size(num, suffix="B"):
    for unit in ["", "Ki", "Mi", "Gi", "Ti"]:
        if num < 1024:
            return f"{num:.1f} {unit}{suffix}"
        num /= 1024
    return f"{num:.1f} Yi{suffix}"


def readable_date(date):
    if date is not None:
        cd = dt.fromtimestamp(date)
        return [cd.strftime("%d/%m/%Y"), cd.strftime("%H:%M")]
    return ["##/##/####", "##:##:##"]


def get_dir_size(path):
    disk_free = disk_usage(path).free
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

 