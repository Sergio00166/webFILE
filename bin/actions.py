#Code by Sergio 1260

from os.path import join, isdir, relpath
from os.path import exists, pardir, abspath
from functions import get_folder_content, is_subdirectory, fix_pth_url, unreadable, unreadable_date
from os import access, R_OK, sep
from argparse import ArgumentParser


def sort_contents(folder_content,sort):
    if sort=="nd":
        dirs = []; files = []
        for d in folder_content:
            if d['description']=='DIR': dirs.append(d)
            else: files.append(d)
        return files[::-1]+dirs[::-1]
    elif sort=="sp" or sort=="sd":
        out=sorted(folder_content,key=lambda x:unreadable(x['size']))
        if sort=="sp": return out[::-1]
        else: return out
    elif sort=="dp" or sort=="dd":
        out=sorted(folder_content,key=lambda x:unreadable_date(x['mtime']))
        if sort=="dp": return out[::-1]
        else: return out
    else: return folder_content

def init():
    parser = ArgumentParser(description="Arguments for the webFILE")
    parser.add_argument("-b", "--bind", type=str, required=True, help="Specify IP address to bind")
    parser.add_argument("-p", "--port", type=int, required=True, help="Specify port number")
    parser.add_argument("-d", "--dir", type=str, required=True, help="Specify directory to share")
    parser.add_argument("--dirsize", action="store_true", help="Enable folder size")
    args = parser.parse_args()
    return args.port, args.bind, args.dir, args.dirsize

def isornot(path,root):
    path=path.replace("/",sep)
    path=abspath(root+sep+path)
    if is_subdirectory(root, path):
        if not exists(path): raise FileNotFoundError
        if not access(path, R_OK): raise PermissionError
    else: raise PermissionError
    return path

def filepage_func(path,root,filetype):
    path=relpath(isornot(path,root), start=root)
    folder=sep.join(path.split(sep)[:-1])
    name=path.split(sep)[-1]
    out=get_folder_content(root+sep+folder,root,False)
    path=path.replace(sep,"/")
    lst = [x["path"] for x in out if x["description"] == filetype]
    # Get previous one
    try: nxt=lst[lst.index(path)+1]
    except: nxt=lst[0]
    # Get next one
    if lst.index(path)==0: prev=lst[-1]
    else: prev=lst[lst.index(path)-1]
    # Fix url strings
    nxt = "/" + fix_pth_url(nxt)
    prev = "/" + fix_pth_url(prev)
    return prev, nxt, name, path

def index_func(folder_path,root,folder_size):
    folder_path=isornot(folder_path,root)
    is_root = folder_path==root
    folder_content = get_folder_content(folder_path,root,folder_size)
    parent_directory = abspath(join(folder_path, pardir))
    if parent_directory==root: parent_directory=""
    else: parent_directory= relpath(parent_directory, start=root)
    folder_path = relpath(folder_path, start=root)
    if folder_path==".": folder_path=""
    folder_path="/"+folder_path.replace(sep,"/")
    parent_directory=parent_directory.replace(sep,"/")
    return folder_content,folder_path,parent_directory,is_root
