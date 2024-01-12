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
@app.route('/file/<file_path>')
def file_page(file_path):
    try:
        directory, file = fix_Addr(file_path)
        if directory==None: return render_template('403.html'), 403
        else: return send_from_directory(directory, file)
    except FileNotFoundError: return render_template('404.html'), 404

# Force web explorer to handle the file as we want
@app.route('/video/<video_path>')
def video_page(video_path):
    try:
        directory, file = fix_Addr(video_path)
        if directory==None: return render_template('403.html'), 403
        else: return send_from_directory(directory,file,mimetype='video/mp4')
    except FileNotFoundError: return render_template('404.html'), 404

# Force web explorer to handle the file as we want
@app.route('/text/<text_path>')
def text_page(text_path):
    try:
        directory, file = fix_Addr(text_path)
        if directory==None: return render_template('403.html'), 403
        else: return send_from_directory(directory,file,mimetype='text/txt')
    except FileNotFoundError: return render_template('404.html'), 404

# Force web explorer to handle the file as we want
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
            if folder_path=="." or folder_path=="": is_root=True
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

if __name__=="__main__": app.run(host=listen, port=int(port), debug=debug)
