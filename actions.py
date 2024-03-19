#Code by Sergio 1260

from os.path import join, isdir, relpath
from os.path import exists, pardir, abspath
from functions import get_folder_content, is_subdirectory, fix_pth_url, unreadable, unreadable_date
from os import access, R_OK, sep
from sys import argv


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
    if len(argv)==1: file="config.cfg"
    else: file=argv[1]
    try: file = open(file,"r")
    except: print("ERROR: config file not valid or not exists"); exit()
    dic={}
    for x in file:
        x=x.rstrip().lstrip()
        if not len(x)==0 and not x.startswith("#"):
            key=x[:x.find(":")]
            value=x[x.find(":")+1:]
            value=value.rstrip().lstrip()
            key=key.rstrip().lstrip()
            dic[key]=value
    if not "port" in dic: dic["port"]="5000"
    if not "listen" in dic: dic["listen"]="172.0.0.1"
    if not "show.folder.size" in dic: folder_size="false"
    else: folder_size=dic["show.folder.size"].lower()
    if not "folder" in dic:
        print("[CFG_FILE]: A FOLDER PATH IS NEEDED"); exit()
    root=dic["folder"]
    if not (exists(root) and isdir(root)):
        print("[CFG_FILE]: THE SPECIFIED FOLDER PATH IS NOT VALID"); exit()
    return dic["port"], dic["listen"], root, folder_size

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
