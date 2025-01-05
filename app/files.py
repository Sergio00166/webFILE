#Code by Sergio00166

from shutil import rmtree, move, copy, copytree, SameFileError
from os.path import exists, isdir, dirname, relpath, basename
from flask import render_template, redirect, request
from urllib.parse import urlparse, urlunparse
from functions import validate_acl, safe_path
from os import sep, makedirs, remove, walk


def check_recursive(path, ACL, root, write=False):
    for fulldir, dirs, files in walk(path):
        for item in dirs + files:
            item_path = relpath(fulldir+sep+item, start=root)
            item_path = item_path.replace(sep, "/")
            validate_acl(item_path, ACL, write)

def check_rec_chg_parent(path, ACL, root, new_parent):
    for fulldir, dirs, files in walk(path):
        for item in dirs + files:
            item_path = relpath(fulldir + sep + item, start=root)
            item_path = item_path.replace(sep, "/")
            path_parts = item_path.split("/")
            if path_parts[0] == "prueba":
                path_parts[0] = new_parent
            item_path = "/".join(path_parts)
            validate_acl(item_path, ACL, True)


def redirect_no_query():
    parsed_url = urlparse(request.url)
    return redirect(urlunparse(
        (parsed_url.scheme,parsed_url.netloc,
         parsed_url.path, '', '', '')
        ))

def upload_worker(ACL, r_path, filename, root, file=None, dupmkd=False):
    try:
        path = safe_path(r_path+sep+filename, root, True)
    except PermissionError:
        return "Permission denied", 403
    except:
        return "Internal server error"

    if file is None and not exists(sep.join(path.split(sep)[:-1])):
        return "Subdirectory does not exist"

    elif exists(path):
        return "Already exists"\
               if file is None else\
               "(Some) File(s) already exist"
    try:
        validate_acl(r_path+"/"+filename, ACL, True)

        if file is None:
            makedirs(path)
        else:
            makedirs(dirname(path), exist_ok=True)
            file.save(path)

    except PermissionError:
        return "Permission denied for (some) item(s)"
    except:
        return "Internal server error"


def addfile(path, ACL, root):
    error = None
    safe_path(path, root)
    validate_acl(path, ACL, True)

    if request.method == "POST":
        action = request.form.get("action")

        if action == "mkdir":
            foldername = request.form.get("foldername", "").strip()
            error = "The folder name cannot be empty."\
                    if not foldername else\
                    upload_worker(ACL, path, foldername, root)

        elif action in ["upFile", "upDir"]:
            updir = action == "upDir"
            files = request.files.getlist('files')
    
            if not files or (len(files) == 1 and not files[0].filename):
                error = "Please select a folder to upload."\
                if updir else "Please select file(s) to upload."
            else:
                for file in files:
                    error = upload_worker(ACL, path, file.filename, root, file)
                    if error: break
        else:
            error = "That method does not exist"

        if error:
            return render_template(
                "upload.html",error=error,action=action,
                filename=request.form.get("filename", "")
            )
        return redirect_no_query()

    return render_template("upload.html", error=error)


def delfile(path, ACL, root):
    try:
        validate_acl(path, ACL, True)
        path = safe_path(path, root)
        
        if isdir(path):
            check_recursive(path, ACL, root, True)
            rmtree(path)
        else: remove(path)

    except PermissionError:
        return "Permission denied", 403
    except FileNotFoundError:
        return "File not found", 404
    except:
        return "Server Error", 500
    return "Successful", 200


def move_copy(path, ACL, root):
    validate_acl(path, ACL)

    if request.method == "POST":
        action = request.form.get("action")
        if action in ["move", "copy"]:
            destination = request.form.get("destination", "").strip()
            if not destination:
                return "Not found", 404
            return mvcp_worker(ACL,path,destination,root,action=="move")
        return "Method not valid", 400

    return redirect_no_query()


def mvcp_worker(ACL, path, destination, root, mv):
    try:
        validate_acl(path, ACL, mv)
        validate_acl(destination, ACL, True)
        path = safe_path(path, root)

        if isdir(path):
            check_recursive(path, ACL, root)
            check_rec_chg_parent(path, ACL, root, destination)
        
        destination = safe_path(destination, root, True)
        
        if mv: move(path, destination)
        elif isdir(path):
            copytree(path, destination+sep+basename(path))
        else: copy(path, destination)

        return "Successful", 200
    except PermissionError:
        return "Permission denied", 403
    except FileNotFoundError:
        return "Not found", 404
    except SameFileError:
        return "Already exists", 409
    except:
        return "Server Error", 500

