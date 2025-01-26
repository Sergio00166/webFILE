#Code by Sergio00166

from files import upfile,updir,mkdir,delfile,move_copy
from flask import redirect,request,render_template
from actions1 import audio,directory,video
from send_file import send_file,send_dir
from flask_session import Session
from hashlib import sha256
from flask import session
from functions import *


def add_page(opt,dps,path,ACL,root):
    if "upfile" in opt: return upfile(dps,path,ACL,root)
    if "updir"  in opt: return updir(dps,path,ACL,root)
    if "mkdir"  in opt: return mkdir(path,ACL,root)
    if "add"    in opt:
        validate_acl(path, ACL, True)
        return render_template("upload.html")


def serveFiles_page(path,ACL,root,client,folder_size):
    validate_acl(path,ACL)
    path = safe_path(path,root)
    # Get the file type of the file
    file_type = get_file_type(path)

    # Check if the path is not a dir
    if not file_type=="directory":
        
        if request.path.endswith('/') and client!="json":
            return redirect(request.path[:-1])
    
        # If the text is plain text send it as plain text
        if file_type in ["text","source"]:
            return send_file(path,mimetype='text/plain')
    
        # If it have the raw arg or is requested
        # from a cli browser return the file
        elif "raw" in request.args or client!="normal":
            return send_file(path)
    
        # Custom player for each multimedia format
        elif file_type=="video":
            info = (request.method.lower()=="head")
            subs = request.args["subs"] if "subs" in request.args else ""
            return video(path,root,subs,file_type,info,ACL)
        
        elif file_type=="audio": return audio(path,root,file_type,ACL)
        
        # Else send it and let flask autodetect the mime
        else: return send_file(path)

    # Return the directory explorer
    else:
        if not request.path.endswith('/') and client!="json":
            return redirect(request.path+'/')
        
        proto = request.headers.get('X-Forwarded-Proto', request.scheme)
        hostname = proto+"://"+request.host+"/"
        sort = request.args["sort"] if "sort" in request.args else ""
        
        if "tar" in request.args: return send_dir(path,root,ACL)
        return directory(path,root,folder_size,sort,client,hostname,ACL)



def serveRoot_page(ACL,root,client,folder_size):
    proto = request.headers.get('X-Forwarded-Proto',request.scheme)
    hostname = proto+"://"+request.host+"/"
    path = safe_path("/",root) # Check if we can access it
    sort = request.args["sort"] if "sort" in request.args else ""

    if "tar" in request.args: return send_dir(path,root,ACL,"index")
    return directory(path,root,folder_size,sort,client,hostname,ACL)



def login(USERS):
    if request.method == "POST":
        user = request.form.get('username')
        password = request.form.get('password')
        hashed_password = sha256(password.encode()).hexdigest()
        if USERS.get(user) == hashed_password:
            session["user"] = user
            return redirect_no_query()
        else:
            return render_template('login.html', error="Invalid username or password.")
    else: return render_template("login.html")


def logout():
    try: session.pop("user")
    except: pass
    return redirect_no_query()



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

