#Code by Sergio00166

# BASIC WEB-file-sharing-server with a basic interface
# Allows you to share a folder across the LAN (READ-ONLY mode)


if __name__=="__main__":
    
    from sys import path, modules
    from os import sep
    from functions import printerr, get_file_type
    from actions import *
    from actions1 import *
    from flask import Flask, render_template, stream_template, request, send_file, Response
    from sys import path as pypath
    from threading import Thread
    from time import sleep as delay
    from logging import getLogger, WARNING, INFO

    # Disable every shit that flask prints
    log = getLogger('werkzeug'); log.setLevel(WARNING)
    # Get the values from the initor (args from cli)
    port, listen, root, folder_size = init()
    modules['flask.cli'].show_server_banner = lambda *x: print(end="")
    # Set the paths of templates and static
    templates=abspath(path[0]+sep+".."+sep+"templates")
    sroot=abspath(pypath[0]+sep+".."+sep+"static"+sep)
    sort_mod = ["np","nd","sp","sd","dp","dd"]
    # Create the main app flask
    app = Flask(__name__, static_folder=None, template_folder=templates)


    @app.route('/<path:path>', methods=['GET'])
    # Shows a directory, interpret the media, launching
    # the custom media players] or donwloads the file
    def explorer(path):
        try:
            cmp,sort = "mode" in request.args,""
            mode = request.args["mode"] if cmp else ""  
            if cmp and mode=="raw": return send_file(isornot(path,root))
            file_type = get_file_type(root+sep+path)
            
            if file_type=="DIR": 
                if cmp:
                    if mode=="dir": return send_dir(isornot(path,root))
                    if mode in sort_mod: sort=mode   
                folder_content,folder_path,parent_directory,is_root,par_root = index_func(path,root,folder_size,sort)
                return stream_template('index.html',folder_content=folder_content,folder_path=folder_path,parent_directory=parent_directory,is_root=is_root,par_root=par_root)

            elif file_type=="Text" or file_type=="SRC": return send_file(isornot(path,root), mimetype='text')
            
            elif file_type=="Video":
                check_ffmpeg_installed()
                if cmp and mode[:4]=="subs":
                    if path.endswith("/"): path=path[:-1]
                    try: arg = str(int(mode[4:]))+"/"+path
                    except: raise FileNotFoundError
                    out = sub_cache_handler(arg,root)
                    return Response(out,mimetype="text/plain",headers={"Content-disposition":"attachment; filename=subs.vtt"})
                prev, nxt, name, path = filepage_func(path,root,file_type)
                tracks,chapters = get_info(root+sep+path),get_chapters(root+sep+path)
                return render_template('video.html',path=path,name=name,prev=prev,nxt=nxt,tracks=tracks,chapters=chapters)

            elif file_type=="Audio":
                prev,nxt,name,path,rnd = filepage_func(path,root,file_type,True)
                return render_template('audio.html',path=path,name=name,prev=prev,nxt=nxt,rnd=rnd)
            else: return send_file(isornot(path,root))
            
        except PermissionError: return render_template('403.html'), 403
        except FileNotFoundError: return render_template('404.html'), 404
        except Exception as e: printerr(e); return render_template('500.html'), 500


    @app.route('/', methods=['GET'])
    # Here we show the root dir, or send a raw file with filepath as arg
    # Serve the static files filepath as arg, or return a subtitle track
    # with this sintan index/filepath
    def index():
        try:
            cmp,sort = "mode" in request.args,""
            mode = request.args["mode"] if cmp else ""

            if "static" in request.args:
                path=request.args["static"].replace("/",sep)
                return send_file(isornot(path,sroot))
            
            elif cmp and mode=="dir": return send_dir(root)
            elif cmp and mode in sort_mod: sort=mode

            folder_content = sort_contents(get_folder_content(root, root, folder_size),sort)
            return stream_template('index.html',folder_content=folder_content,folder_path="/",parent_directory=root,is_root=True)
                    
        except PermissionError: return render_template('403.html'), 403
        except FileNotFoundError: return render_template('404.html'), 404
        except Exception as e: printerr(e); return render_template('500.html'), 500


    
    # Change logging to default after app is running 
    Thread(target=lambda: (delay(0.1), log.setLevel(INFO))).start()
    # Run the main app with the custom args
    app.run(host=listen, port=int(port), debug=False)
    
