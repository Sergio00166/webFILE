#Code by Sergio 1260

from os.path import join, isdir, relpath
from os.path import exists, pardir, abspath
from functions import get_folder_content, is_subdirectory, fix_Addr, fix_pth_url
from os import access, R_OK, sep
from sys import argv

def init():
    if len(argv)==1: file="config.cfg"
    else: file=argv[1]
    file = open(file,"r"); dic={}
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
    directory, file=fix_Addr(path,root)
    if not exists(root+sep+path): raise FileNotFoundError
    if not access(root+sep+path, R_OK): raise PermissionError
    return directory, file

def audio_func(path,root):
    if not exists(root+sep+path): raise FileNotFoundError
    if not access(root+sep+path, R_OK): raise PermissionError
    folder=sep.join(path.split("/")[:-1])
    name=path.split("/")[-1]; lst=[]
    out=get_folder_content(root+sep+folder,root,False)
    for x in out:
        if x["description"]=="Audio": lst.append(x["path"])
    # Get previous song
    try: nxt=lst[lst.index(path)+1]
    except: nxt=lst[0]
    # Get next song
    if lst.index(path)==0: prev=lst[-1]
    else: prev=lst[lst.index(path)-1]
    # The {{ url_for('audio_page', path=nxt} inside the html does
    # a weird thing with the ' char, fixed with this code
    nxt = fix_pth_url(nxt); prev=fix_pth_url(prev); path=fix_pth_url(path)
    nxt="/"+nxt; prev="/"+prev; path="/?raw="+path
    return prev, nxt, name, path

def index_func(folder_path,root,folder_size):
    is_root=False
    if folder_path=="": folder_path=root; is_root=True
    elif folder_path==root: is_root=True
    else: folder_path=root+sep+folder_path
    #if not exists(folder_path): raise FileNotFoundError
    if not access(folder_path, R_OK): raise PermissionError
    # Deny access if not inside root
    if not is_subdirectory(root, abspath(folder_path)): raise PermissionError
    folder_content = get_folder_content(folder_path,root,folder_size)
    parent_directory = abspath(join(folder_path, pardir))
    if parent_directory==root: parent_directory=""
    else: parent_directory= relpath(parent_directory, start=root)
    folder_path = relpath(folder_path, start=root)
    if folder_path==".": folder_path=""
    folder_path="/"+folder_path.replace(sep,"/")
    parent_directory=parent_directory.replace(sep,"/")
    return folder_content,folder_path,parent_directory,is_root
