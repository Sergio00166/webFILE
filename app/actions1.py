#Code by Sergio00166

from flask import Response,Flask,render_template
from os.path import join,relpath,exists,getsize
from os.path import getmtime,basename,abspath
from multiprocessing import Queue, Process
from os import sep,stat,walk,getenv
from sys import stderr,path
from video import *
import tarfile

subsmimes = {
    "ssa":"application/x-substation-alpha",
    "ass":"application/x-substation-alpha",
    "webvtt":"text/vtt",
}

def init():
    # Set the paths of templates and static
    templates=abspath(path[0]+sep+".."+sep+"templates")
    sroot=abspath(path[0]+sep+".."+sep+"static"+sep)
    # Get all the args from the Enviorment
    root = getenv('FOLDER',None)
    if root is None: exit()
    folder_size = getenv('SHOWSIZE',"FALSE")
    folder_size = folder_size.upper()=="TRUE"
    # Create the main app flask
    app = Flask(__name__,static_folder=sroot,template_folder=templates)
    return app,folder_size,root


def create_tar_header(file_path, arcname):
    tarinfo = tarfile.TarInfo(name=arcname)
    tarinfo.size = getsize(file_path)
    tarinfo.mtime = getmtime(file_path)
    tarinfo.mode = stat(file_path).st_mode
    tarinfo.type = tarfile.REGTYPE
    tarinfo.uname = ""
    tarinfo.gname = ""
    return tarinfo.tobuf()

def stream_tar_file(file_path, arcname):
    # Create the tar header for the file
    yield create_tar_header(file_path, arcname)   
    # Stream file contents from disk
    with open(file_path, 'rb') as f:
        while True:
            chunk = f.read(262144)
            if not chunk: break
            yield chunk
    # Generate padding for the block
    file_size = getsize(file_path)
    padding_size = (512-(file_size%512))%512
    yield b'\0' * padding_size

def generate_tar(directory_path):
    for root, _, files in walk(directory_path):
        for file in files:
            file_path = join(root, file)
            arcname = relpath(file_path, directory_path)
            yield from stream_tar_file(file_path, arcname)
  
    yield b'\0'*1024 # Add TAR end

def send_dir(directory):
    folder = basename(directory)
    if folder=="": folder="index"
    return Response(generate_tar(directory),mimetype='application/x-tar',
    headers={'Content-Disposition': 'attachment;filename='+folder+'.tar'})



def get_subtitles(index,file,legacy,info):
    codec,out = get_track(file,index,info)
    # Convert or extract the subtitles
    if legacy and not (codec=="webvtt" or info):
        ret = Queue() # Convert the subtitles on a proc
        proc = Process(target=convert_ass, args=(out,ret,))
        proc.start(); converted = ret.get(); proc.join()
        if not converted[0]: raise converted[1]
        out = converted[1]
    # Get filename and for downloading the subtitles
    codec = "webvtt" if legacy else codec
    subsname = file.split("/")[-1]+f".track{str(index)}."
    subsname += "vtt" if codec=="webvtt" else codec
    # Return the subtittle track
    return Response(out,mimetype=subsmimes[codec], headers=\
    {'Content-Disposition': 'attachment;filename='+subsname})



def printerr(e):  
    tb = e.__traceback__
    while tb.tb_next: tb = tb.tb_next
    e_type = type(e).__name__
    e_file = tb.tb_frame.f_code.co_filename
    e_line = tb.tb_lineno
    e_message = str(e)
    msg = (
        "[SERVER ERROR]\n"+
        f"   [line {e_line}] '{e_file}'\n"+
        f"   [{e_type}] {e_message}\n"+
        "[END ERROR]"
    )
    print(msg,file=stderr)


def error(e, client):
    if isinstance(e, PermissionError):
        if client == "json": return "[]", 403
        return render_template('403.html'), 403
    elif isinstance(e, FileNotFoundError):
        if client == "json": return "[]", 404
        return render_template('404.html'), 404
    else:
        printerr(e) # Log the error to cli
        if client == "json": return "[]", 500
        return render_template('500.html'), 500
