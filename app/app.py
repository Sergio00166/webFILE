#Code by Sergio00166

# BASIC WEB-file-sharing-server with a basic interface
# Allows you to share a folder across the LAN (READ-ONLY mode)

from os import sep, getenv
from sys import path
path.append(path[0]+sep+"pysubs2.zip")
from functions import printerr, get_file_type
from actions import *
from actions1 import *
from flask import Flask, render_template, stream_template
from flask import request, send_file, Response, redirect

# Set the paths of templates and static
templates=abspath(path[0]+sep+".."+sep+"templates")
sroot=abspath(path[0]+sep+".."+sep+"static"+sep)
sort_mod = ["np","nd","sp","sd","dp","dd"]
# Get all the args from the Enviorment
root = getenv('FOLDER',None)
if root is None: exit()
folder_size = getenv('SHOWSIZE',"FALSE")
folder_size = folder_size.upper()=="TRUE"
# Create the main app flask
app = Flask(__name__, static_folder=None, template_folder=templates)

@app.route('/explorer/<path:path>', methods=['GET'])
# For showing a directory, launching the custom media players
# or send in raw mode (or stream) files or send the dir as .tar
def explorer(path):
    try:
        cmp,sort = "mode" in request.args,"np"
        mode = request.args["mode"] if cmp else ""  
        if cmp and mode=="raw": return send_file(isornot(path,root))
        file_type = get_file_type(root+sep+path)
        
        if file_type=="DIR": 
            if cmp:
                if mode=="dir": return send_dir(isornot(path,root))
                if mode in sort_mod: sort=mode   
            folder_content,folder_path,parent_directory,is_root,par_root = index_func(path,root,folder_size,sort)
            return stream_template('index.html',folder_content=folder_content,folder_path=folder_path,\
                   parent_directory=parent_directory,is_root=is_root,par_root=par_root,sort=sort)

        elif file_type=="Text" or file_type=="SRC": return send_file(isornot(path,root), mimetype='text')
        
        elif file_type=="Video":
            check_ffmpeg_installed()
            if cmp and mode[:4]=="subs":
                if path.endswith("/"): path=path[:-1]
                try: arg = str(int(mode[4:]))+"/"+path
                except: raise FileNotFoundError
                out = sub_cache_handler(arg,root)
                return Response(out,mimetype="text/plain",headers={"Content-disposition":"attachment; filename=subs.vtt"})
            prev, nxt, name, path = filepage_func(path,root,file_type,no_next=True)
            tracks,chapters = get_info(root+sep+path),get_chapters(root+sep+path)
            return render_template('video.html',path=path,name=name,prev=prev,nxt=nxt,tracks=tracks,chapters=chapters)

        elif file_type=="Audio":
            prev,nxt,name,path,rnd = filepage_func(path,root,file_type,True)
            return render_template('audio.html',path=path,name=name,prev=prev,nxt=nxt,rnd=rnd)
        else: return send_file(isornot(path,root))
        
    except PermissionError: return render_template('403.html'), 403
    except FileNotFoundError: return render_template('404.html'), 404
    except Exception as e: printerr(e); return render_template('500.html'), 500


@app.route('/explorer', methods=['GET'])
# Here we show the root dir, serve the static files
# or send the root dir as .tar
def index():
    try:
        cmp,sort = "mode" in request.args,"np"
        mode = request.args["mode"] if cmp else "" 
        
        if cmp and mode=="dir": return send_dir(root)
        elif cmp and mode in sort_mod: sort=mode

        folder_content = sort_contents(get_folder_content(root, root, folder_size),sort)
        return stream_template('index.html',folder_content=folder_content,\
               folder_path="/",parent_directory=root,is_root=True,sort=sort)
                
    except PermissionError: return render_template('403.html'), 403
    except FileNotFoundError: return render_template('404.html'), 404
    except Exception as e: printerr(e); return render_template('500.html'), 500


@app.route("/", methods=["GET"])
def mv2index(): return redirect("/explorer")

@app.route("/static/<path:path>", methods=["GET"])
def static(path):
    try: return send_file(isornot(path.replace("/",sep),sroot))
    except PermissionError: return render_template('403.html'), 403
    except FileNotFoundError: return render_template('404.html'), 404
    except Exception as e: printerr(e); return render_template('500.html'), 500  


