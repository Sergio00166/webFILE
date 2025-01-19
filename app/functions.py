#Code by Sergio00166

from functions1 import *


def safe_path(path,root,igntf=False):
    # Checks if the path is inside the root dir
    # else raise an exception depending on the case
    path = path.replace("/",sep)
    path = abspath(root+sep+path)
    if is_subdirectory(root, path):
        if igntf: return path
        if not exists(path): raise FileNotFoundError
        if not access(path, R_OK): raise PermissionError
    else: raise PermissionError
    return path

def readable(num, suffix="B"):
    # Connverts byte values to a human readable format
    for unit in ("","Ki","Mi","Gi","Ti"):
        if num<1024: return f"{num:.1f} {unit}{suffix}"
        num /= 1024
    return f"{num:.1f} Yi{suffix}"

def get_file_type(path):
    if isdir(path): return "directory"
    return file_type_map.get(
        Path(path).suffix, "file"
        if is_binary(path) else "text"
    )

def get_directory_size(directory):
    total,stack = 0,[directory]
    while stack:
        current = stack.pop()
        try:
            for entry in scandir(current):
                if entry.is_file(): total += entry.stat().st_size
                elif entry.is_dir(): stack.append(entry.path)
        except NotADirectoryError: total += getsize(current)
        except PermissionError: pass
    return total


def get_folder_content(folder_path, root, folder_size, ACL):
    dirs,files,content = [],[],[]
    for x in listdir(folder_path):
        fix = join(folder_path, x)
        if isdir(fix): dirs.append(x)
        else: files.append(x)
    dirs.sort(); files.sort()
    for item in dirs+files:
        try:
            item_path = join(folder_path, item)
            item_full_path = relpath(item_path,start=root).replace(sep,"/")
            validate_acl(item_full_path,ACL)
            description = get_file_type(item_path)
            if description == "directory" and folder_size:
                size = get_directory_size(item_path)
            elif description != "directory":
                size = getsize(item_path)
            else: size = 0
            try: mtime = getmtime(item_path)
            except: mtime = None
            if description == "directory": item_path += "/"
            content.append({
                'name': item, 'path': item_full_path,
                'description': description,
                "size": size, "mtime": mtime
            })
        except: pass
    return content


def sort_contents(folder_content, sort, root):
    # Separate into dirs and files
    dirs,files = [],[]
    for x in folder_content:
        path = x["path"].replace("/", sep)
        if isdir(root+sep+path):
            dirs.append(x)
        else: files.append(x)
    # Sort folder content based on raw values
    if     sort[0]=="d":
        dirs  = sorted(dirs,  key=lambda x: x["mtime"] or 0)
        files = sorted(files, key=lambda x: x["mtime"] or 0)
        if sort[1]=="p": dirs,files = dirs[::-1],files[::-1]
    elif   sort[0]=="s":
        dirs  = sorted(dirs,  key=lambda x: x["size"])
        files = sorted(files, key=lambda x: x["size"])
        if sort[1]=="p": dirs,files = dirs[::-1],files[::-1]
    elif   sort[1]=="d": dirs,files = dirs[::-1],files[::-1]

    return dirs+files


def humanize_content(folder_content):
    # Apply humanization to size and mtime
    for item in folder_content:
        item["size"] = readable(item["size"])
        if item["mtime"] is not None:
            item["mtime"] = dt.fromtimestamp(
            item["mtime"]).strftime("%d-%m-%Y %H:%M:%S")
        else: item["mtime"] = "##-##-#### ##:##:##"
    return folder_content


