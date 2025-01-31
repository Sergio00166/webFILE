#Code by Sergio00166

from os.path import getmtime,getsize,exists,normpath,dirname
from os.path import commonpath,join,isdir,relpath,abspath
from os import listdir,sep,scandir,access,R_OK
from urllib.parse import urlparse, urlunparse
from datetime import datetime as dt
from flask import request,redirect
from json import load as jsload
from sys import path as pypath
from flask import session
from pathlib import Path
from sys import stderr


is_subdirectory = lambda parent, child: commonpath([parent, child])==parent
# Load database of file type and extensions
file_types = jsload(open(sep.join([pypath[0],"extra","files.json"])))
# Convert it to a lookup table to get file type as O(1)
file_type_map = {v: k for k, vals in file_types.items() for v in vals}
# Check if the file is a binary file or not
textchars = bytearray({7,8,9,10,12,13,27} | set(range(0x20, 0x100)) - {0x7f})
is_binary = lambda path: bool(open(path, mode="rb").read(1024).translate(None, textchars))
# Function to compress HTML output without modifying contents
minify = lambda stream: (''.join(map(str.strip, x.split("\n"))) for x in stream)
# Set error output file for server error logging
error_file = sep.join([pypath[0],"extra","error.log"])


def safe_path(path,root,igntf=False):
    # Checks if the path is inside the root dir
    # else raise an exception depending on the case
    path = path.replace("/",sep)
    path = abspath(root+sep+path)
    if is_subdirectory(root, path):
        if igntf: return path
        if not exists(path):
            raise FileNotFoundError
        if not access(path, R_OK):
            raise PermissionError
    else:   raise PermissionError
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
            filetype = get_file_type(item_path)
            if filetype == "directory" and folder_size:
                size = get_directory_size(item_path)
            elif filetype != "directory":
                size = getsize(item_path)
            else: size = 0
            try: mtime = getmtime(item_path)
            except: mtime = None
            if filetype == "directory": item_path += "/"
            content.append({
                'name': item, 'path': item_full_path,
                'type': filetype,
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


def getclient(request):
    ua = request.headers.get('User-Agent', '').lower()   
    ah = request.headers.get('Accept', '').lower()
    json = any(x in ua for x in ["wget","curl","fetch","powershell"]) or 'application/json' in ah
    normal = ua.startswith("mozilla/5.0") and not any(x in ua for x in ["msie","trident"])
    return "normal" if normal else "json" if json else "legacy"


def load_userACL(USERS,ACL):
    path = sep.join([pypath[0],"extra",""])
    USERS.clear();  ACL.clear()
    USERS.update(jsload(open(path+"users.json")))
    ACL.update(jsload(open(path+"acl.json")))


# Checks if the given path has permissions
# in the ACL file (uses inheritance)
def validate_acl(path,ACL,write=False):
    askd_perm = 2 if write else 1
    user = session.get("user","DEFAULT")
    path = normpath(path)
    path = path.replace(sep,"/")
    
    if path.startswith("//"):    path = path[2:]
    if not path.startswith("/"): path = "/"+path

    while True:
        # Check if there is a rule for it
        if path in ACL and user in ACL[path]:
            perm = ACL[path][user]
            if perm==0: break
            if perm>=askd_perm: return
        # Check if on top and break loop
        if path=="/": break
        # Goto parent directory
        path = dirname(path)

    raise PermissionError


def printerr(e,override_msg=None):  
    tb = e.__traceback__
    while tb.tb_next: tb = tb.tb_next
    e_type = type(e).__name__
    e_file = tb.tb_frame.f_code.co_filename
    e_line = tb.tb_lineno

    if override_msg: e_message = override_msg
    else: e_message = e_message = str(e)
    
    if e_message.startswith("["):
        idx = e_message.find("] ")
        errno = e_message[:idx+1]
        e_type += " ("+errno[1:-1]+")"
        e_message = e_message[idx+2:]
        
    time_str = dt.now().strftime("%Y-%m-%d %H:%M:%S")
    msg = (
        "[ERROR]\n"+
        f"   [Time] {time_str} \n"
        f"   [File] '{e_file}':{e_line}\n"+
        f"   [Type] {e_type}\n"+
        f"   [eMsg] {e_message}\n"+
        "[END]\n"
    )
    open(error_file,"a").write(msg)
    print(msg,file=stderr,end="")


def redirect_no_query():
    parsed_url = urlparse(request.url)
    return redirect(urlunparse(
    ('','',parsed_url.path,'','','')))

