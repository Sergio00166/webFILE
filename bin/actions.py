 #Code by Sergio 1260

from os.path import join, isdir, relpath, exists, pardir, abspath, getsize
from functions import get_folder_content, is_subdirectory, fix_pth_url, unreadable, unreadable_date
from subtitles import cache_dir, get_track, random_str, save_subs_cache, get_subs_cache, get_info
from os import access, R_OK, sep


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

def index_func(folder_path,root,folder_size,sort):
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
    folder_content = sort_contents(folder_content, sort)
    par_root = (parent_directory=="")
    return folder_content,folder_path,parent_directory,is_root,par_root

def sub_cache_handler(arg,root,subtitle_cache):
    separator = arg.find("/")
    index = arg[:separator]
    file = arg[separator + 1:]
    file = isornot(file, root)
    if subtitle_cache:
        dic = get_subs_cache()
        filesize = str(getsize(file))
        if not arg in dic:
            out = get_track(file,index)
            dic = get_subs_cache()
            if not arg in dic:
                cache = random_str(24)
                dic[arg] = [cache,filesize]
                file = open(cache_dir+cache,"w",newline='')
                file.write(out); file.close()
                del file; save_subs_cache(dic)
        else:
            fix = (filesize == dic[arg][1])
            if not fix or not exists(cache_dir+dic[arg][0]):
                out = get_track(file,index)
                cache = dic[arg][0]
                dic[arg] = [cache,filesize]
                file = open(cache_dir+cache,"w",newline='')
                file.write(out); file.close()
                del file; save_subs_cache(dic)                 
            else: out=open(cache_dir+dic[arg][0],"r").read()
            
    else: out=get_track(file,index)
    
    return out
