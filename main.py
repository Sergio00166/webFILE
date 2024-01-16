#Code by Sergio 1260

# BASIC FTP via WEB with a basic interface
# Allows you to share a folder across the LAN
# (READ-ONLY mode)

from functions import *
from actions import *
from flask import Flask, render_template, request, send_from_directory

if __name__=="__main__":
    port, listen, root, debug, folder_size = init()
    app = Flask(__name__)

# Default file page
@app.route('/file/')
def file_page():
    try:
        path=request.args['path']
        directory, file=fix_Addr(path,root)
        if directory==None: return render_template('403.html'), 403
        elif not exists(directory+sep+file):
            return render_template('404.html'), 404
        else: return send_from_directory(directory, file)
    except: return render_template('500.html'), 500

# Force web explorer to handle the file as we want
@app.route('/video/')
def video_page():
    try:
        path=request.args['path']
        name=path.split(sep)[-1]      
        if not exists(root+sep+path): return render_template('404.html'), 404
        if not access(root+sep+path, R_OK): return render_template('403.html'), 403
        return render_template('video.html', path=path, name=name)
    except: return render_template('500.html'), 500

# Force web explorer to handle the file as we want
@app.route('/audio/')
def audio_page():
    try:
        path=request.args['path']
        prev, nxt, name, path = audio(path,root)
        if not exists(root+sep+path): return render_template('404.html'), 404
        if not access(root+sep+path, R_OK): return render_template('403.html'), 403
        return render_template('audio.html', path=path, name=name,prev=prev, nxt=nxt )
    except: return render_template('500.html'), 500

# Force web explorer to handle the file as we want
@app.route('/text/')
def text_page():
    try:
        path=request.args['path']
        directory, file=fix_Addr(path,root)
        if not exists(root+sep+path): return render_template('404.html'), 404
        if not access(root+sep+path, R_OK): return render_template('403.html'), 403
        return send_from_directory(directory,file,mimetype='text')
    except: return render_template('500.html'), 500

@app.route('/')
def index():
    try:
        folder_content,folder_path,parent_directory,is_root=index_func(request.args,root,folder_size)
        return render_template('index.html', folder_content=folder_content,folder_path=folder_path,
                               parent_directory=parent_directory,is_root=is_root)
    except PermissionError: return render_template('403.html'), 403
    except FileNotFoundError: return render_template('404.html'), 404
    except: return render_template('500.html'), 500

if __name__=="__main__": app.run(host=listen, port=int(port), debug=debug)
