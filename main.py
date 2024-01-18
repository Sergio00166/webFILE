#Code by Sergio 1260

# BASIC FTP via WEB with a basic interface
# Allows you to share a folder across the LAN
# (READ-ONLY mode)

from functions import *
from actions import *
from flask import Flask, render_template, request, send_from_directory
from sys import path as pypath

if __name__=="__main__":
    port, listen, root, folder_size = init()
    app = Flask(__name__, static_folder=None)

@app.route('/<path:path>')
def explorer(path):
    try:
        file_type = get_file_type(root+sep+path)
        if file_type=="DIR":
            folder_content,folder_path,parent_directory,is_root=index_func(path,root,folder_size)
            par_root=(parent_directory=="")
            return render_template('index.html', folder_content=folder_content,folder_path=folder_path,
                                    parent_directory=parent_directory,is_root=is_root, par_root=par_root)
        elif file_type=="Text" or file_type=="SRC":
            directory, file = isornot(path,root)
            return send_from_directory(directory,file,mimetype='text')
        elif file_type=="Video":
            directory, file = isornot(path,root); path=fix_pth_url(path)
            return render_template('video.html', path="/?raw="+path, name=file)
        elif file_type=="Audio":
            prev, nxt, name, path = audio_func(path,root)
            return render_template('audio.html', path=path, name=name,prev=prev, nxt=nxt)
        else:
            directory, file = isornot(path,root)
            return send_from_directory(directory, file)

    except PermissionError: return render_template('403.html'), 403
    except FileNotFoundError: return render_template('404.html'), 404
    except: return render_template('500.html'), 500

@app.route('/')
def index():
    try:
        if "raw" in request.args:
            path=request.args["raw"]
            directory, file = isornot(path,root)
            return send_from_directory(directory, file)
        elif "static" in request.args:
            path=pypath[0]+sep+"static"+sep
            path=path+request.args["static"].replace("/",sep)
            path=path.split(sep); file=path[-1]
            directory=sep.join(path[:-1])
            print(directory, file)
            return send_from_directory(directory, file)
        else:
            folder_content = get_folder_content(root, root, folder_size)
            return render_template('index.html', folder_content=folder_content,folder_path=root,
                                   parent_directory=root,is_root=True)
    except PermissionError: return render_template('403.html'), 403
    except FileNotFoundError: return render_template('404.html'), 404
    except: return render_template('500.html'), 500

if __name__=="__main__": app.run(host=listen, port=int(port), debug=False)
