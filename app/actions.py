#Code by Sergio00166

from os.path import join,relpath,pardir,abspath,getsize,isfile
from flask import render_template, stream_template
from flask import Flask,request,send_file,Response
from urllib.parse import quote as encurl
from os import sep, getenv
from random import choice
from functions import *
from actions1 import *


def init():
    # Set the paths of templates and static
    templates=abspath(path[0]+sep+".."+sep+"templates")
    sroot=abspath(path[0]+sep+".."+sep+"static"+sep)
    # Get all the args from the Enviorment
    root = getenv('FOLDER',None)
    if root is None: exit()
    folder_size = getenv('SHOWSIZE',"FALSE")
    folder_size = folder_size.upper()=="TRUE"
    # Create the main app flask
    app = Flask(__name__, static_folder=None, template_folder=templates)
    return app,folder_size,root,sroot


def filepage_func(path,root,filetype,random=False,fixrng=False):
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
        return prev,nxt,name,path,rnd
    else: return prev,nxt,name,path


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
    return folder_content,folder_path,parent_directory,is_root


def video(path,root,mode,file_type):
    check_ffmpeg_installed()
    # Check if subtitles are requested
    if mode!="" and mode[:4]=="subs":
        if path.endswith("/"): path=path[:-1]
        # Check if the provided data is valid
        try: arg = str(int(mode[4:]))+"/"+path
        except: raise FileNotFoundError
        # Get subtitle content as string
        out = sub_cache_handler(arg,root)
        # Create the http header
        header = {"Content-disposition":"attachment; filename=subs.vtt"}
        # Send the raw data
        return Response(out,mimetype="text/plain",headers=header)

    # Else we send the video page
    prev, nxt, name, path = filepage_func(path,root,file_type,fixrng=True)
    tracks,chapters = get_info(root+sep+path),get_chapters(root+sep+path)
    return render_template('video.html',path=path,name=name,prev=prev,nxt=nxt,tracks=tracks,chapters=chapters)


def audio(path,root,file_type):
    prev,nxt,name,path,rnd = filepage_func(path,root,file_type,random=True)
    return render_template('audio.html',path=path,name=name,prev=prev,nxt=nxt,rnd=rnd)


def directory(path,root,folder_size,mode,client):
    # Check if sending the dir is requested
    if mode=="dir": return send_dir(isornot(path,root))
    # Get the sort value if it is on the list else set default value
    sort = mode if mode in ["np","nd","sp","sd","dp","dd"] else "np"
    # Get all the data from that directry and its contents
    folder_content,folder_path,parent_directory,is_root = index_func(path,root,folder_size,sort)
    if not client=="json":
        file = "index_cli.html" if client=="cli" else "index.html"
        html = stream_template(file,folder_content=folder_content,folder_path=folder_path,parent_directory=parent_directory,is_root=is_root,sort=sort)
        return minify(html) # reduce size
    else: return [{**item, "path": "/"+encurl(item["path"])} for item in folder_content]

