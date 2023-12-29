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


def server():
    from flask import Flask, render_template, request, make_response, send_from_directory
    from flask_bootstrap import Bootstrap
    import os

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

    port, listen, root = init()
    app = Flask(__name__, static_folder=root)
    bootstrap = Bootstrap(app)

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

            item_path= os.path.relpath(item_path, start=root)
            item_path = item_path.replace(os.sep,chr(92))
            content.append({'name': item,'path': item_path,'description': description})
        return content

    @app.route('/file/<file_path>')
    def file_page(file_path):
        try:
            file_path=file_path.split(chr(92))
            if len(file_path)==1:
                file=file_path[0]
                directory=root
            else: 
                file=file_path[-1]
                file_path.pop()
                fix=os.sep.join(file_path)
                directory=root+os.sep+fix
            return send_from_directory(directory,file)
        except FileNotFoundError: return render_template('404.html'), 404

    @app.route('/video/<video_path>')
    def video_page(video_path):
        try:
            video_path=video_path.split(chr(92))
            if len(video_path)==1:
                video=video_path[0]
                directory=root
            else: 
                video=video_path[-1]
                video_path.pop()
                fix=os.sep.join(video_path)
                directory=root+os.sep+fix
            return send_from_directory(directory,video,mimetype='video/mp4')
        except FileNotFoundError: return render_template('404.html'), 404

    @app.route('/audio/<audio_path>')
    def audio_page(audio_path):
        try:
            audio_path=audio_path.split(chr(92))
            if len(audio_path)==1:
                audio=audio_path[0]
                directory=root
            else: 
                audio=audio_path[-1]
                audio_path.pop()
                fix=os.sep.join(audio_path)
                directory=root+os.sep+fix
            return send_from_directory(directory,audio, mimetype='audio/mp3')
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
                folder_path=folder_path.replace(chr(92),os.sep)
                folder_path=root+os.sep+folder_path
            # Deny access if not inside root
            if not is_subdirectory(root, folder_path): return render_template('403.html'), 403
            folder_content = get_folder_content(folder_path)
            parent_directory = os.path.abspath(os.path.join(folder_path, os.pardir))
            if parent_directory==root: parent_directory=""
            else: parent_directory= os.path.relpath(parent_directory, start=root)         
            return render_template('index.html', folder_content=folder_content,folder_path=folder_path,parent_directory=parent_directory,is_root=is_root)
        except FileNotFoundError: return render_template('404.html'), 404
        except PermissionError: return render_template('403.html'), 403

    app.run(host=listen, port=int(port), debug=True)

if __name__=="__main__":
    # Move terminal output to a file
    with open('server.log', 'a') as f:
        import sys
        sys.stdout = sys.stderr = f
        server()
