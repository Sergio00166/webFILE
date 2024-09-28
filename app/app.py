#Code by Sergio00166

# BASIC WEB-file-sharing-server with a basic interface
# Allows you to share a folder across the LAN (READ-ONLY mode)

from sys import path
from os import sep
path.append(sep.join([path[0],"data","pysubs2.zip"]))
from functions import printerr, get_file_type
from actions import *

app,folder_size,root,sroot = init()


@app.route('/<path:path>', methods=['GET'])
# For showing a directory, launching the custom media players
# or send in raw mode (or stream) files or send the dir as .tar
def explorer(path):
    try:
        # Check if we have extra args
        cmp = "mode" in request.args
        # If we have args get them else set blank
        mode = request.args["mode"] if cmp else ""
        # If the mode is raw send the file in raw mode
        if mode=="raw": return send_file(isornot(path,root))
        # Get the file type of the file
        file_type = get_file_type(root+sep+path)
        # Check file type and send appropiate response
        if file_type=="DIR": return directory(path,root,folder_size,mode)
        elif file_type in ["Text","SRC"]: return send_file(isornot(path,root), mimetype='text')       
        elif file_type=="Video": return video(path,root,mode,file_type)
        elif file_type=="Audio": return audio(path,root,file_type)
        else: return send_file(isornot(path,root))
        
    #except PermissionError: return render_template('403.html'), 403
    except FileNotFoundError: return render_template('404.html'), 404
    #except Exception as e: printerr(e); return render_template('500.html'), 500


@app.route('/', methods=['GET'])
# Here we show the root dir, serve the static files
# or send the root dir as .tar
def index():
    try:
        # Check if we have extra args
        cmp = "mode" in request.args
        # If we have args get them else set blank
        mode = request.args["mode"] if cmp else ""
        # Check if static page is requested
        if "static" in request.args:
            path=request.args["static"].replace("/",sep)
            return send_file(isornot(path,sroot))
        # Else show the root directory
        return directory("/",root,folder_size,mode)
                
    except PermissionError: return render_template('403.html'), 403
    except FileNotFoundError: return render_template('404.html'), 404
    except Exception as e: printerr(e); return render_template('500.html'), 500

