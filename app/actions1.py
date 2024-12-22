#Code by Sergio00166

from flask import Response, render_template, redirect, session
from os.path import getmtime, basename, abspath
from os.path import join, relpath, exists
from urllib.parse import urlparse, urlunparse
from os import sep, stat, walk
from hashlib import sha256
from flask import session
from sys import stderr
from video import *
import tarfile
from time import time


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



def login(request,USERS):
    if request.method == "POST":
        user = request.form.get('username')
        password = request.form.get('password')
        hashed_password = sha256(password.encode()).hexdigest()
        if USERS.get(user) == hashed_password:
            session["user"] = user
            parsed_url = urlparse(request.url)
            return redirect(urlunparse(
                (parsed_url.scheme,parsed_url.netloc,parsed_url.path,'','','')
            ))
        else:
            return render_template('login.html', error="Invalid username or password.")
    else: return render_template("login.html")

def logout(request):
    session.pop("user")
    parsed_url = urlparse(request.url)
    return redirect(urlunparse(
        (parsed_url.scheme,parsed_url.netloc,parsed_url.path,'','','')
    ))


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
