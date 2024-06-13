 #Code by Sergio 1260

from os.path import join, isdir, relpath, exists, pardir, abspath, getsize, isfile
from functions import get_folder_content, is_subdirectory, fix_pth_url, unreadable, unreadable_date
from subtitles import cache_dir, get_track, random_str, save_subs_cache, get_subs_cache, get_info
from os import access, R_OK, sep, listdir, remove


def sort_contents(folder_content,sort):
    # Sorts the folder content with several modes 
    # The first char (sort var) indicates the mode 
    #    n = sorts by name 
    #    s = sorts by size 
    #    d = sorts by date 
    # The second char indicates the order 
    #    d = sorts downwards 
    #    p = sorts upwards
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
    # Checks if the path is inside the root dir
    # else raise an exception depending on the case
    path=path.replace("/",sep)
    path=abspath(root+sep+path)
    if is_subdirectory(root, path):
        if not exists(path): raise FileNotFoundError
        if not access(path, R_OK): raise PermissionError
    else: raise PermissionError
    return path


def filepage_func(path,root,filetype):
    # Get relative path from the root dir
    path=relpath(isornot(path,root), start=root)
    # Get the name of the folder
    folder=sep.join(path.split(sep)[:-1])
    name=path.split(sep)[-1]
    # Get all folder contents
    out=get_folder_content(root+sep+folder,root,False)
    # Convert the dir sep to UNIX if contains windows sep
    path=path.replace(sep,"/")
    # Get all folder contents that has the same filetype
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
    # Check if the folder_path is valid
    folder_path=isornot(folder_path,root)
    # Check if the folder path is the same as the root dir
    is_root = folder_path==root
    # Get all folder contents
    folder_content = get_folder_content(folder_path,root,folder_size)
    # Get the parent dir from the folder_path
    parent_directory = abspath(join(folder_path, pardir))
    # Check if the parent directory if root
    if parent_directory==root: parent_directory=""
    else: parent_directory= relpath(parent_directory, start=root)
    # Get relative path from root
    folder_path = relpath(folder_path, start=root)
    # Fix and check some things with the paths
    if folder_path==".": folder_path=""
    folder_path="/"+folder_path.replace(sep,"/")
    parent_directory=parent_directory.replace(sep,"/")
    folder_content = sort_contents(folder_content, sort)
    par_root = (parent_directory=="")
    return folder_content,folder_path,parent_directory,is_root,par_root


def sub_cache_handler(arg,root,subtitle_cache):
    # Set some values
    separator = arg.find("/")
    index = arg[:separator]
    file = arg[separator + 1:]
    file = isornot(file, root)
    # If subtitle cache is enabled extract and convert the
    # subtitles and save it to disc and return the content
    # else simply extract and convert and return
    if subtitle_cache:
        # Get the index table of the cache
        dic = get_subs_cache()
        # Generate a map of used values
        available = [x[0] for x in dic.values()]
        # Get map to delete shit
        try:
            todelete = [x for x in listdir(cache_dir) if x not in available and isfile(cache_dir+x)]
            if "index.txt" in todelete: todelete.remove("index.txt")
            [remove(cache_dir+x) for x in todelete]
        except: pass
        # Get filesize as str
        filesize = str(getsize(file))
        # If the file is not in the index table
        if not arg in dic:
            # Extract and convert the subs
            out = get_track(file,index)
            # Refresh index table
            dic = get_subs_cache()
            # If other process did not add to the index table
            # the same subs as this proc has generated
            # then write an new entry and a new cache file
            if not arg in dic:
                # Generate a new one until not used
                cache=random_str()
                while cache in available:
                    cache=random_str()
                # Do the rest stuff to save the cache
                dic[arg] = [cache,filesize]
                file = open(cache_dir+cache,"w",newline='')
                file.write(out); file.close()
                del file; save_subs_cache(dic)
        else:
            # Checks if the size of this file is the
            # same as the one is in the index table
            # It works like a shitty cehcksum
            fix = (filesize == dic[arg][1])
            # If the checksum is not equal or the cache file
            # is missing then we create a new cache file with
            # the name in the index table (dont change index table)
            # Else we simply read the cache file
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
