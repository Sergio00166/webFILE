#Code by Sergio00166

from flask import render_template,stream_template,redirect,request
from files import upfile,updir,mkdir,delfile,move,copy
from os.path import join, relpath,pardir,abspath
from urllib.parse import quote as encurl
from send_file import send_file,send_dir
from flask_session import Session
from hashlib import sha256
from random import choice
from functions import *
from video import *


def add_page(opt,dps,path,ACL,root):
    if "upfile" in opt: return upfile(dps,path,ACL,root)
    if "updir"  in opt: return updir(dps,path,ACL,root)
    if "add"    in opt:
        validate_acl(path, ACL, True)
        return render_template("upload.html")


def serveFiles_page(path,ACL,root,client,folder_size):
    validate_acl(path,ACL)
    path = safe_path(path,root)
    # Get the file type of the file
    file_type = get_file_type(path)

    # Check if the path is not a dir
    if not file_type=="directory":

        if request.path.endswith('/') and client!="json":
            return redirect(request.path[:-1])

        # If the text is plain text send it as plain text
        if file_type in ["text","source"]:
            return send_file(path,mimetype='text/plain')

        # If it have the raw arg or is requested
        # from a cli browser return the file
        elif "raw" in request.args or client!="normal":
            return send_file(path)

        # Custom player for each multimedia format
        elif file_type=="video":
            info = (request.method.lower()=="head")
            subs = request.args["subs"] if "subs" in request.args else ""
            return video(path,root,subs,file_type,info,ACL)

        elif file_type=="audio": return audio(path,root,file_type,ACL)

        # Else send it and let flask autodetect the mime
        else: return send_file(path)

    # Return the directory explorer
    else:
        if not request.path.endswith('/') and client!="json":
            return redirect(request.path+'/')

        sort = request.args["sort"] if "sort" in request.args else ""
        if "tar" in request.args: return send_dir(path,root,ACL)
        return directory(path,root,folder_size,sort,client,ACL)


def serveRoot_page(ACL,root,client,folder_size):
    path = safe_path("/",root) # Check if we can access it
    sort = request.args["sort"] if "sort" in request.args else ""
    if "tar" in request.args: return send_dir(path,root,ACL,"index")
    return directory(path,root,folder_size,sort,client,ACL)


def login(USERS):
    if request.method == "POST":
        user = request.form.get('username')
        password = request.form.get('password')
        hashed_password = sha256(password.encode()).hexdigest()
        if USERS.get(user) == hashed_password:
            session["user"] = user
            return redirect_no_query()
        else:
            return render_template('login.html', error="Invalid username or password.")
    else: return render_template("login.html")


def logout():
    try: session.pop("user")
    except: pass
    return redirect_no_query()


def error(e, client):
    if isinstance(e, PermissionError):
        if client == "json": return "[]", 403
        return render_template('403.html'), 403
    elif isinstance(e, FileNotFoundError):
        if client == "json": return "[]", 404
        return render_template('404.html'), 404
    else:
        printerr(e) # Log the error to cli
        if client == "json": return "[]", 500
        return render_template('500.html'), 500


def get_filepage_data(file_path,root,filetype,ACL,random=False,fixrng=False):
    # Get relative path from the root dir
    path = relpath(file_path,start=root).replace(sep,"/")
    # Get the name of the folder
    folder = sep.join(file_path.split(sep)[:-1])
    name = path.split("/")[-1]
    # Get all folder contents
    out = get_folder_content(folder,root,False,ACL)
    # Get all folder contents that has the same filetype
    lst = [x["path"] for x in out if x["type"]==filetype]
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


def get_index_data(folder_path,root,folder_size,sort,ACL):
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
    prev, nxt, name = get_filepage_data(path,root,file_type,ACL,fixrng=True)
    tracks,chapters = get_info(path),get_chapters(path)
    return render_template('video.html',path=path,name=name,prev=prev,nxt=nxt,tracks=tracks,chapters=chapters)


def audio(path,root,file_type,ACL):
    prev,nxt,name,rnd = get_filepage_data(path,root,file_type,ACL,random=True)
    return render_template('audio.html',path=path,name=name,prev=prev,nxt=nxt,rnd=rnd)


def directory(path,root,folder_size,sort,client,ACL):
    # Get the sort value if it is on the list else set default value
    sort = sort if sort in ["np","nd","sp","sd","dp","dd"] else "np"
    # Get all the data from that directry and its contents
    folder_content,folder_path,parent_directory,is_root =\
        get_index_data(path,root,folder_size,sort,ACL)
    # Return appropiate response depending on the client
    if not client=="json":
        file = "index_cli.html" if client=="legacy" else "index.html"
        html = stream_template(file,folder_content=folder_content,folder_path=folder_path,\
                               parent_directory=parent_directory,is_root=is_root,sort=sort)
        return minify(html) # reduce size
    else: return [{**item, "path": "/"+encurl(item["path"])} for item in folder_content]
