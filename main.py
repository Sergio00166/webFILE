#Code by Sergio 1260

"""

BASIC FTP via WEB with a basic interface
Allows you to share a folder across the LAN
(READ-ONLY mode)

CAPABILITIES:

 - Can play videos
 - Can play music
 - Can read pdf
 - Can read plain text
 - If nothing of above it downloads it

"""

from flask import Flask, render_template, request, send_from_directory
from flask_bootstrap import Bootstrap
from os.path import commonpath, join, isdir, relpath, abspath
from os import listdir, pardir, sep
from sys import argv

def init():
    if len(argv)==1: file="config.cfg"
    else: file=argv[1]
    file = open(file,"r"); dic={}
    for x in file:
        x=x.rstrip().lstrip()
        if not len(x)==0 and not x.startswith("#"):
            key=x[:x.find(":")]
            value=x[x.find(":")+1:]
            value=value.rstrip().lstrip()
            key=key.rstrip().lstrip()
            dic[key]=value

    if not "port" in dic: dic["port"]="5000"
    if not "listen" in dic: dic["listen"]="172.0.0.1"
    if not "folder" in dic:
        print(" ERROR: a folder is needed")
        exit()
    else: return dic["port"], dic["listen"], dic["folder"]

if __name__=="__main__":
    port, listen, root = init()
    app = Flask(__name__, static_folder=root)
    bootstrap = Bootstrap(app)

def is_subdirectory(parent, child): return commonpath([parent]) == commonpath([parent, child])

def get_folder_content(folder_path):
    items = listdir(folder_path)
    items.sort(reverse=True) #Sort by time
    content = []
    for item in items:
        item_path = join(folder_path, item)
        description = ''
        if isdir(item_path): description = 'Directory'
        elif item_path.endswith((".mp4", ".avi", ".mkv", ".mov")): description = 'Video'
        elif item_path.endswith((".mp3", ".m4a", ".wav", ".flac")): description = 'Audio'
        elif item_path.endswith((".png", ".jpg", ".webp")): description = 'IMG'
        elif item_path.endswith(".pdf"): description = 'PDF'
        else: description = 'File'
        item_path= relpath(item_path, start=root)
        item_path = item_path.replace(sep,chr(92))
        content.append({'name': item,'path': item_path,'description': description})
    return content

def fix_Addr(file_path):
    file_path=file_path.split(chr(92))
    if len(file_path)==1:
        file=file_path[0]
        directory=root
    else: 
        file=file_path[-1]
        file_path.pop()
        fix=sep.join(file_path)
        directory=root+sep+fix
    if not is_subdirectory(root, abspath(directory)):
        return None, None
    else: return directory, file

@app.route('/file/<file_path>')
def file_page(file_path):
    try:
        directory, file = fix_Addr(file_path)
        if directory==None: return render_template('403.html'), 403
        else: return send_from_directory(directory, file)
    except FileNotFoundError: return render_template('404.html'), 404

@app.route('/video/<video_path>')
def video_page(video_path):
    try:
        directory, file = fix_Addr(video_path)
        if directory==None: return render_template('403.html'), 403
        else: return send_from_directory(directory,file,mimetype='video/mp4')
    except FileNotFoundError: return render_template('404.html'), 404

@app.route('/audio/<audio_path>')
def audio_page(audio_path):
    try:
        directory, file = fix_Addr(audio_path)
        if directory==None: return render_template('403.html'), 403
        else: return send_from_directory(directory,file,mimetype='audio/mp3')
    except FileNotFoundError: return render_template('404.html'), 404

@app.route('/')
def index():
    try:
        is_root=False
        if 'path' not in request.args:
            folder_path=root; is_root=True
        else:
            folder_path=request.args['path']
            if folder_path=="": is_root=True
            folder_path=folder_path.replace(chr(92),sep)
            folder_path=root+sep+folder_path
        if sep==chr(92): folder_path=folder_path.replace("\\\\","\\")
        # Deny access if not inside root
        if not is_subdirectory(root, abspath(folder_path)):
            return render_template('403.html'), 403
        folder_content = get_folder_content(folder_path)
        parent_directory = abspath(join(folder_path, pardir))
        if parent_directory==root: parent_directory=""
        else: parent_directory= relpath(parent_directory, start=root)
        folder_path = relpath(folder_path, start=root)
        if folder_path==".": folder_path=""
        folder_path="/"+folder_path.replace(sep,"/")
        return render_template('index.html', folder_content=folder_content,folder_path=folder_path,parent_directory=parent_directory,is_root=is_root)
    except FileNotFoundError: return render_template('404.html'), 404
    except PermissionError: return render_template('403.html'), 403

if __name__=="__main__": app.run(host=listen, port=int(port), debug=True)
