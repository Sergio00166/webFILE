#Code by Sergio00166

from flask import render_template, stream_template, redirect
from os.path import join, relpath, pardir, abspath
from urllib.parse import urlparse, urlunparse, quote as encurl
from hashlib import sha256
from random import choice
from functions import *
from actions1 import *


def filepage_func(file_path,root,filetype,ACL,random=False,fixrng=False):
    # Get relative path from the root dir
    path = relpath(file_path,start=root).replace(sep,"/")
    # Get the name of the folder
    folder = sep.join(file_path.split(sep)[:-1])
    name = path.split("/")[-1]
    # Get all folder contents
    out = get_folder_content(folder,root,False,ACL)
    # Get all folder contents that has the same filetype
    lst = [x["path"] for x in out if x["description"]==filetype]
    # Get next one
    try: nxt = lst[lst.index(path)+1]
    except: nxt = "" if fixrng else lst[0]
    # Get previous one
    if lst.index(path)==0:
        prev = "" if fixrng else lst[-1]
    else: prev=lst[lst.index(path)-1]
    # All should start with /
    prev = "/"+prev if prev!="" else ""
    nxt = "/"+nxt if nxt!="" else ""
    # Return random flag
    if random:
        rnd = "/"+choice(lst)
        return prev,nxt,name,rnd
    else: return prev,nxt,name


def index_func(folder_path,root,folder_size,sort,ACL):
    # Check if the folder path is the same as the root dir
    is_root = folder_path==root
    # Get all folder contents
    folder_content = get_folder_content(folder_path,root,folder_size,ACL)
    # Get the parent dir from the folder_path
    parent_directory = abspath(join(folder_path,pardir))
    # Check if the parent directory if root
    if parent_directory==root: parent_directory = ""
    else: parent_directory = relpath(parent_directory,start=root)+"/"
    # Get relative path from root
    folder_path = relpath(folder_path,start=root)
    # Fix and check some things with the paths
    if folder_path==".": folder_path = ""
    folder_path = "/"+folder_path.replace(sep,"/")
    parent_directory = parent_directory.replace(sep,"/")
    folder_content = sort_contents(folder_content,sort,root)
    folder_content = humanize_content(folder_content)
    return folder_content,folder_path,parent_directory,is_root


def video(path,root,mode,file_type,info,ACL):
    check_ffmpeg_installed()
    # Check if subtitles are requested
    if not mode=="":
        if mode.endswith("legacy"):
            legacy = True
            mode = mode[:mode.find("legacy")]
        else: legacy = False
        if path.endswith("/"): path=path[:-1]
        try: index = int(mode)
        except: raise FileNotFoundError
        return get_subtitles(index,path,legacy,info)
    # Else we send the video page
    prev, nxt, name = filepage_func(path,root,file_type,ACL,fixrng=True)
    tracks,chapters = get_info(path),get_chapters(path)
    return render_template('video.html',path=path,name=name,prev=prev,nxt=nxt,tracks=tracks,chapters=chapters)


def audio(path,root,file_type,ACL):
    prev,nxt,name,rnd = filepage_func(path,root,file_type,ACL,random=True)
    return render_template('audio.html',path=path,name=name,prev=prev,nxt=nxt,rnd=rnd)


def directory(path,root,folder_size,sort,client,hostname,ACL):
    # Get the sort value if it is on the list else set default value
    sort = sort if sort in ["np","nd","sp","sd","dp","dd"] else "np"
    # Get all the data from that directry and its contents
    folder_content,folder_path,parent_directory,is_root = index_func(path,root,folder_size,sort,ACL)
    # Return appropiate response depending on the client
    if not client=="json":
        file = "index_cli.html" if client=="legacy" else "index.html"
        html = stream_template(file,folder_content=folder_content,folder_path=folder_path,\
                               parent_directory=parent_directory,is_root=is_root,sort=sort)
        return minify(html) # reduce size
    else: return [{**item, "path": hostname+encurl(item["path"])} for item in folder_content]
