#Code by Sergio00166

# BASIC WEB-file-sharing-server with a basic interface
# Allows you to share a folder across the LAN (READ-ONLY mode)

from sys import path
from os import sep
path.append(sep.join([path[0],"data","pysubs2.zip"]))
from functions import printerr,get_file_type,getclient
from flask import send_file,redirect
from actions import *

app,folder_size,root = init()

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
            if request.path.endswith('/'):
                return redirect(request.path[:-1])
            # If the text is plain text send it as plain text
            if file_type in ["text","source"]:
                return send_file(isornot(path,root),mimetype='text/plain')
            # If it have the raw arg or is requested
            # from a cli browser return the file
            elif mode=="raw" or client!="normal":
                return send_file(isornot(path,root))
            # Custom player for each multimedia format
            elif file_type=="video": return video(path,root,mode,file_type)  
            elif file_type=="audio": return audio(path,root,file_type)
            # Else send it and let flask autodetect the mime
            else: return send_file(isornot(path,root))
        # Return the directory explorer
        else:
            if not request.path.endswith('/'):
                return redirect(request.path+'/')
            return directory(path,root,folder_size,mode,client)
  
    except PermissionError:
        if client == "json": return "[]", 403
        return render_template('403.html'), 403
    except FileNotFoundError:
        if client == "json": return "[]", 404
        return render_template('404.html'), 404
    except Exception as e:
        printerr(e)
        if client == "json": return "[]", 500
        return render_template('500.html'), 500


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
            return app.send_static_file(path)
        # Else show the root directory
        return directory("/",root,folder_size,mode,client)
                
    except PermissionError:
        if client == "json": return "[]", 403
        return render_template('403.html'), 403
    except FileNotFoundError:
        if client == "json": return "[]", 404
        return render_template('404.html'), 404
    except Exception as e:
        printerr(e)
        if client == "json": return "[]", 500
        return render_template('500.html'), 500

