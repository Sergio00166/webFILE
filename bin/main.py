#Code by Sergio 1260

# BASIC WEB-file-sharing-server with a basic interface
# Allows you to share a folder across the LAN (READ-ONLY mode)

banner = [
"                          █████     ███████████ █████ █████       ██████████   ",
"                         ░░███     ░░███░░░░░░█░░███ ░░███       ░░███░░░░░█   ",
" █████ ███ █████  ██████  ░███████  ░███   █ ░  ░███  ░███        ░███  █ ░    ",
"░░███ ░███░░███  ███░░███ ░███░░███ ░███████    ░███  ░███        ░██████      ",
" ░███ ░███ ░███ ░███████  ░███ ░███ ░███░░░█    ░███  ░███        ░███░░█      ",
" ░░███████████  ░███░░░   ░███ ░███ ░███  ░     ░███  ░███      █ ░███ ░   █   ",
"  ░░████░████   ░░██████  ████████  █████       █████ ███████████ ██████████   ",
"   ░░░░ ░░░░     ░░░░░░  ░░░░░░░░  ░░░░░       ░░░░░ ░░░░░░░░░░░ ░░░░░░░░░░    ",
"   lightweight web server to share and play multimedia over the network        "]
banner = "\n"+("\n".join(banner))+"\n\n"
 

if __name__=="__main__":
    
    from sys import path, modules
    from os import sep
    from functions import *
    from actions import *
    from flask import Flask, render_template, stream_template, request, send_file, Response
    from sys import path as pypath
    from threading import Thread
    from time import sleep as delay
    from logging import getLogger, WARNING, INFO

    # Disable every shit that flask prints
    log = getLogger('werkzeug'); log.setLevel(WARNING)
    # Get the values from the initor (args from cli)
    port, listen, root, folder_size, subtitle_cache, no_banner = init()
    # Change start message
    p1="\033[32mListening on: \033[34m"
    p2="\033[32m:\033[31m"
    p3="\033[32mServing path: \033[34m"
    banner+=p1+listen+p2+str(port)+"\033[0m\n"
    banner+=p3+root+"\033[0m\n\n"
    # Remove banner if flag
    if no_banner: banner=""
    modules['flask.cli'].show_server_banner = lambda *x: print(banner,end="")
    # Set the template folder
    templates=abspath(path[0]+sep+".."+sep+"templates")
    del path # Free memory
    # Create the main app flask
    app = Flask(__name__, static_folder=None, template_folder=templates)


    @app.route('/<path:path>')
    # Shows a directory, interpret the media, launching
    # the custom media players] or donwloads the file
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
        except Exception as e: printerr(e); return render_template('500.html'), 500


    @app.route('/')
    # Here we show the root dir, or send a raw file with filepath as arg
    # Serve the static files filepath as arg, or return a subtitle track
    # with this sintan index/filepath
    def index():
        try:
            if "raw" in request.args:
                return send_file(isornot(request.args["raw"],root))
            
            elif "static" in request.args:
                sroot=abspath(pypath[0]+sep+".."+sep+"static"+sep)
                path=request.args["static"].replace("/",sep)
                return send_file(isornot(path,sroot))
            
            elif "subtitles" in request.args:
                try:
                    arg = request.args["subtitles"]
                    out = sub_cache_handler(arg,root,subtitle_cache)
                    return Response(out,mimetype="text/plain",headers=
                    {"Content-disposition":"attachment; filename=subs.vtt"})

                except: return render_template('415.html'), 415
                          
            else:
                sort = request.args["sort"] if "sort" in request.args else ""
                folder_content = sort_contents(get_folder_content(root, root, folder_size),sort)
                return stream_template('index.html', folder_content=folder_content,folder_path="/",
                                       parent_directory=root,is_root=True)

        except PermissionError: return render_template('403.html'), 403
        except FileNotFoundError: return render_template('404.html'), 404
        except Exception as e: printerr(e); return render_template('500.html'), 500

    
    # Change logging to default after app is running 
    Thread(target=lambda: (delay(0.1), log.setLevel(INFO))).start()
    # Run the main app with the custom args
    app.run(host=listen, port=int(port), debug=False)
    

