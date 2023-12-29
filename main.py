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

from flask import Flask, render_template, request, make_response, send_file
from flask_bootstrap import Bootstrap
from sys import argv
import os

app = Flask(__name__, static_folder="D:\\")
bootstrap = Bootstrap(app)

def init():
    file = open("config.cfg","r"); dic={}
    for x in file:
        x=x.rstrip().lstrip()
        if not len(x)==0 and not "#" in x:
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

def is_subdirectory(parent, child): return os.path.commonpath([parent]) == os.path.commonpath([parent, child])

def get_folder_content(folder_path):
    items = os.listdir(folder_path)
    items.sort(reverse=True) #Sort by time
    content = []
    for item in items:
        item_path = os.path.join(folder_path, item)
        description = ''
        if os.path.isdir(item_path): description = 'Directory'
        elif os.path.isfile(item_path):
            if item_path.endswith((".mp4", ".avi", ".mkv", ".mov")): description = 'Video'
            elif item_path.endswith((".mp3", ".m4a", ".wav", ".flac")): description = 'Audio'
            elif item_path.endswith((".png", ".jpg", ".webp")): description = 'IMG'
            elif item_path.endswith(".pdf"): description = 'PDF'
            else: description = 'File'
        content.append({'name': item,'path': item_path,'description': description})
    return content

@app.route('/file/<file_name>')
def file_page(file_name):
    try:
        response = send_file(file_name)
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, post-check=0, pre-check=0, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response
    except FileNotFoundError: return render_template('404.html'), 404

@app.route('/static/file/<file_path>')
def send_File(file_path):
    raw = file_path.split(os.sep); raw.pop()
    root_folder = os.sep.join(raw)
    response = send_from_directory(root_folder, file_path)
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, post-check=0, pre-check=0, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

@app.route('/')
def index():
    try:
        folder_path = root if 'path' not in request.args else request.args['path']
        # Deny access if not inside root
        if not is_subdirectory(root, folder_path): return render_template('403.html'), 403
        folder_content = get_folder_content(folder_path)
        parent_directory = os.path.abspath(os.path.join(folder_path, os.pardir))
        # Hide the "parent directory" button if on root
        if os.path.abspath(parent_directory) < os.path.abspath(root): parent_directory = root
        if os.path.abspath(folder_path) == os.path.abspath(parent_directory): is_root=True
        else: is_root=False
        return render_template('index.html', folder_content=folder_content,folder_path=folder_path,parent_directory=parent_directory,is_root=is_root)
    except FileNotFoundError: return render_template('404.html'), 404
    except PermissionError: return render_template('403.html'), 403


if __name__ == '__main__':
    try:
        port, listen, root = init()
        app.run(host=listen, port=int(port), debug=True)
    except: print(" BAD CONFIG FILE")
