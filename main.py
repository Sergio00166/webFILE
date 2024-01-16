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

from functions import *

if __name__=="__main__":
    port, listen, root, debug = init()
    app = Flask(__name__)

# Default file page
@app.route('/file/')
def file_page():
    try:
        path=request.args['path']
        directory, file=fix_Addr(path)
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
        print(path)
        folder=sep.join(path.split(sep)[:-1])
        name=path.split(sep)[-1]; lst=[]
        out=get_folder_content(root+sep+folder)
        for x in out:
            if x["description"]=="Audio": lst.append(x["path"])

        # Get previous song
        try: nxt=lst[lst.index(path)+1]
        except: nxt=lst[0]

        # Get next song
        if lst.index(path)==0: prev=lst[-1]
        else: prev=lst[lst.index(path)-1]
        
        # The {{ url_for('audio_page', path=nxt} inside the html does
        # a weird thing with the ' char, fixed with this code
        filepg="/audio/?path="
        nxt=filepg+nxt.replace("'","%27")
        prev=filepg+prev.replace("'","%27")
        
        if not exists(root+sep+path): return render_template('404.html'), 404
        if not access(root+sep+path, R_OK): return render_template('403.html'), 403
        return render_template('audio.html', path=path, name=name,prev=prev, nxt=nxt )
    except: return render_template('500.html'), 500

# Force web explorer to handle the file as we want
@app.route('/text/')
def text_page():
    try:
        path=request.args['path']
        directory, file=fix_Addr(path)
        if not exists(root+sep+path): return render_template('404.html'), 404
        if not access(root+sep+path, R_OK): return render_template('403.html'), 403
        return send_from_directory(directory,file,mimetype='text')
    except: return render_template('500.html'), 500

@app.route('/')
def index():
    try:
        is_root=False
        if 'path' not in request.args:
            folder_path=root; is_root=True
        else:
            folder_path=request.args['path']
            if folder_path=="." or folder_path=="": is_root=True
            folder_path=root+sep+folder_path
        if not exists(folder_path): return render_template('404.html'), 404
        if not access(folder_path, R_OK): return render_template('403.html'), 403
        # Deny access if not inside root
        if not is_subdirectory(root, abspath(folder_path)): raise PermissionError
        folder_content = get_folder_content(folder_path)
        parent_directory = abspath(join(folder_path, pardir))
        if parent_directory==root: parent_directory=""
        else: parent_directory= relpath(parent_directory, start=root)
        folder_path = relpath(folder_path, start=root)
        if folder_path==".": folder_path=""
        folder_path="/"+folder_path.replace(sep,"/")
        return render_template('index.html', folder_content=folder_content,folder_path=folder_path,parent_directory=parent_directory,is_root=is_root)
    except PermissionError: return render_template('403.html'), 403
    except: return render_template('500.html'), 500

if __name__=="__main__": app.run(host=listen, port=int(port), debug=debug)
