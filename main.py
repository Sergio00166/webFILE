#Code by Sergio 1260

# BASIC FTP via WEB with a basic interface
# Allows you to share a folder across the LAN
# (READ-ONLY mode)

from functions import *
from actions import *
from flask import Flask, render_template, request, send_from_directory

if __name__=="__main__":
    port, listen, root, folder_size = init()
    app = Flask(__name__)

@app.route('/<path:path>')
def index(path):
    try:
        file_type=get_file_type(root+path)
        if file_type=="DIR":
            folder_content,folder_path,parent_directory,is_root=index_func(path,root,folder_size)
            return render_template('index.html', folder_content=folder_content,folder_path=folder_path,
                                   parent_directory=parent_directory,is_root=is_root)
        elif file_type=="Audio":
            prev, nxt, name, path = audio(path,root)
            return render_template('audio.html', path=path, name=name,prev=prev, nxt=nxt )
        else:
            directory, file = isornot(path,root)
            if file_type=="Video": return render_template('video.html', path=directory, name=file)
            elif file_type=="Text": return send_from_directory(directory,file,mimetype='text')
            else: return send_from_directory(directory, file)
                 
    except PermissionError: return render_template('403.html'), 403
    except FileNotFoundError: return render_template('404.html'), 404
    except: return render_template('500.html'), 500

@app.route('/')
def home():
    try:
        folder_content = get_folder_content(root, root, folder_size)
        return render_template('index.html', folder_content=folder_content,folder_path=root,
                               parent_directory=root,is_root=True)
    except PermissionError: return render_template('403.html'), 403
    except FileNotFoundError: return render_template('404.html'), 404
    except: return render_template('500.html'), 500

if __name__=="__main__": app.run(host=listen, port=int(port), debug=False)
