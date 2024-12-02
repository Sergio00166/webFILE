#Code by Sergio00166

# BASIC WEB-file-sharing-server with a basic interface
# Allows you to share a folder across the LAN (READ-ONLY mode)

from functions import get_file_type,getclient
from flask import send_file,redirect,request
from actions import *

app,folder_size,root = init()
sroot = app.static_folder


@app.route('/<path:path>', methods=['GET'])
# For showing a directory, launching the custom media players
# or send in raw mode (or stream) files or send the dir as .tar
def explorer(path):
    client = getclient(request)
    try:
        # Paths must not end on slash
        if path.endswith("/"): path = path[:-1]
        # Check if we have extra args
        cmp = "mode" in request.args
        # If we have args get them else set blank
        mode = request.args["mode"] if cmp else ""
        # Get the file type of the file
        file_type = get_file_type(root+sep+path)
        # Check if the path is not a dir
        if not file_type=="directory":
            if request.path.endswith('/') and client!="json":
                return redirect(request.path[:-1])
            # If the text is plain text send it as plain text
            if file_type in ["text","source"]:
                return send_file(isornot(path,root),mimetype='text/plain')
            # If it have the raw arg or is requested
            # from a cli browser return the file
            elif mode=="raw" or client!="normal":
                return send_file(isornot(path,root))
            # Custom player for each multimedia format
            elif file_type=="video":
                info = (request.method.lower()=="head")
                return video(path,root,mode,file_type,info)  
            elif file_type=="audio": return audio(path,root,file_type)
            # Else send it and let flask autodetect the mime
            else: return send_file(isornot(path,root))
        # Return the directory explorer
        else:
            if not request.path.endswith('/') and client!="json":
                return redirect(request.path+'/')
            proto = request.headers.get('X-Forwarded-Proto', request.scheme)
            hostname = proto+"://"+request.host+"/"
            return directory(path,root,folder_size,mode,client,request.host,hostname)
  
    except Exception as e: return error(e,client)


@app.route('/', methods=['GET'])
# Here we show the root dir, serve the static files
# or send the root dir as .tar
def index():
    client = getclient(request)
    try:
        # Check if we have extra args
        cmp = "mode" in request.args
        # If we have args get them else set blank
        mode = request.args["mode"] if cmp else ""
        # Check if static page is requested
        if "static" in request.args:
            path = request.args["static"]
            return send_file( isornot(path,sroot) )
        # Else show the root directory
        proto = request.headers.get('X-Forwarded-Proto', request.scheme)
        hostname = proto+"://"+request.host+"/"
        return directory("/",root,folder_size,mode,client,hostname)

    except Exception as e: return error(e,client)

