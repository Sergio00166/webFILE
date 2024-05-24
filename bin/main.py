#Code by Sergio 1260

# BASIC WEB-file-sharing-server with a basic interface
# Allows you to share a folder across the LAN (READ-ONLY mode)

from sys import path
from os import sep
from functions import *
from actions import *
from flask import Flask, render_template, stream_template, request, send_file
from subtitles import get_info, get_track
from sys import path as pypath


if __name__=="__main__":
    port, listen, root, folder_size, async_subs = init()
    templates=abspath(path[0]+sep+".."+sep+"templates")
    app = Flask(__name__, static_folder=None, template_folder=templates)

@app.route('/<path:path>')
def explorer(path):
    try:   
        file_type = get_file_type(root+sep+path)
        
        if file_type=="DIR":
            sort = request.args["sort"] if "sort" in request.args else ""
            folder_content,folder_path,parent_directory,is_root,\
            par_root = index_func(path,root,folder_size,sort)
            return stream_template('index.html', folder_content=folder_content,folder_path=folder_path,
                                   parent_directory=parent_directory,is_root=is_root, par_root=par_root)
        
        elif file_type=="Text" or file_type=="SRC":
            return send_file(isornot(path,root), mimetype='text')
        
        elif file_type=="Video":
            prev, nxt, name, path = filepage_func(path,root,file_type)
            tracks = get_info(root+sep+path)
            return render_template('video.html',path=path,name=name,prev=prev,nxt=nxt,tracks=tracks)
        
        elif file_type=="Audio":
            prev, nxt, name, path = filepage_func(path,root,file_type)
            return render_template('audio.html', path=path, name=name,prev=prev, nxt=nxt)
        else: return send_file(isornot(path,root))
        
    except PermissionError: return render_template('403.html'), 403
    except FileNotFoundError: return render_template('404.html'), 404
    except: return render_template('500.html'), 500

@app.route('/')
def index():
    try:
        if "raw" in request.args:
            return send_file(isornot(request.args["raw"],root))
        
        elif "static" in request.args:
            sroot=abspath(pypath[0]+sep+".."+sep+"static"+sep)
            path=request.args["static"].replace("/",sep)
            return send_file(isornot(path,sroot))
        
        elif "subtitles" in request.args:
            try: return get_track(request.args["subtitles"],root,async_subs)
            except: return render_template('415.html'), 415
        
        else:
            sort = request.args["sort"] if "sort" in request.args else ""
            folder_content = sort_contents(get_folder_content(root, root, folder_size),sort)
            return stream_template('index.html', folder_content=folder_content,folder_path="/",
                                   parent_directory=root,is_root=True)

    except PermissionError: return render_template('403.html'), 403
    except FileNotFoundError: return render_template('404.html'), 404
    except: return render_template('500.html'), 500

if __name__=="__main__":
    app.run(host=listen, port=int(port), debug=False)

