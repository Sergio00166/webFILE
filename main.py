#Code by Sergio 1260

from functions import *

if __name__=="__main__":
    port, listen, root, debug, folder_size = init()
    app = Flask(__name__)

# Default file page
@app.route('/file/<file_path>')
def file_page(file_path):
    try:
        directory, file = fix_Addr(file_path, root)
        if directory==None: return render_template('403.html'), 403
        else: return send_from_directory(directory, file)
    except FileNotFoundError: return render_template('404.html'), 404
    except: return render_template('500.html'), 500

# Force web explorer to handle the file as we want
@app.route('/video/<video_path>')
def video_page(video_path):
    try:
        directory, file = fix_Addr(video_path, root)
        if directory==None: return render_template('403.html'), 403
        else: return send_from_directory(directory,file,mimetype='video/mp4')
    except FileNotFoundError: return render_template('404.html'), 404
    except: return render_template('500.html'), 500

# Force web explorer to handle the file as we want
@app.route('/text/<text_path>')
def text_page(text_path):
    try:
        directory, file = fix_Addr(text_path, root)
        if directory==None: return render_template('403.html'), 403
        else: return send_from_directory(directory,file,mimetype='text/txt')
    except FileNotFoundError: return render_template('404.html'), 404
    except: return render_template('500.html'), 500

# Force web explorer to handle the file as we want
@app.route('/audio/<audio_path>')
def audio_page(audio_path):
    try:
        directory, file = fix_Addr(audio_path, root)
        if directory==None: return render_template('403.html'), 403
        else: return send_from_directory(directory,file,mimetype='audio/mp3')
    except FileNotFoundError: return render_template('404.html'), 404
    except: return render_template('500.html'), 500

@app.route('/')
def index():
    try:
        is_root=False
        if 'path' not in request.args:
            folder_path=root; is_root=True
        else:folder_path=request.args['path']
        out=ls_dir_main(folder_path, root, folder_size)
        return render_template('index.html', folder_content=out[0],
        folder_path=out[1],parent_directory=out[2],is_root=out[3])
    except FileNotFoundError: return render_template('404.html'), 404
    except PermissionError: return render_template('403.html'), 403
    except: return render_template('500.html'), 500

if __name__=="__main__": app.run(host=listen, port=int(port), debug=debug)
