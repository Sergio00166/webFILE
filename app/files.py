#Code by Sergio00166

from functions import validate_acl, safe_path, redirect_no_query
from shutil import rmtree, move, copy, copytree, SameFileError
from os.path import exists, isdir, relpath, basename
from flask import render_template, redirect, request
from os import sep, remove, walk, makedirs


def check_recursive(path, ACL, root, write=False):
    for fulldir, dirs, files in walk(path):
        for item in dirs + files:
            item_path = relpath(fulldir+sep+item, start=root)
            item_path = item_path.replace(sep, "/")
            validate_acl(item_path, ACL, write)

def check_rec_chg_parent(path, ACL, root, new_parent):
    parent = len(path.split("/"))
    new_parent = new_parent.split("/")
    for fulldir, dirs, files in walk(path):
        for item in dirs + files:
            item_path = relpath(fulldir+sep+item, start=root)
            item_path = item_path.replace(sep, "/")
            path_parts = item_path.split("/")
            path_parts = path_parts[parent:]
            path_parts = new_parent+path_parts
            item_path = "/".join(path_parts)
            validate_acl(item_path, ACL, True)


def mkdir(path, ACL, root):
    
    if request.method != "POST":
        return redirect_no_query()

    safe_path(path, root)
    validate_acl(path, ACL, True)
    foldername = request.form.get("foldername", "").strip()
    error = None

    if not foldername:
        error = "Folder name cannot be empty."
    else:
        full_path = safe_path(path+sep+foldername, root, True)
        parent_dir = sep.join(full_path.split(sep)[:-1])
        r_path = path+sep+foldername

        if not exists(parent_dir):
            error = "Parent dir does not exist."
        elif exists(full_path):
            error = "Dir already exists."
        else:
            try: validate_acl(r_path, ACL, True)
            except PermissionError:
                error = "You don't have permission to do that."
            else: makedirs(full_path)

    if not error: return redirect_no_query()

    return render_template(
        "upload.html", error=error,
        action="mkdir", filename=foldername
    )


def handle_upload(dps, path, ACL, root, action, up_type):

    if request.method != "POST":
        redirect_no_query()

    dps.set_params(dps, ACL, path, root)
    safe_path(path, root)
    validate_acl(path, ACL, True)
    error = None

    try: request.form.get("filename")
    except PermissionError:
        error = "You don't have permission to upload some files."
    except NameError:
        error = f"Please select {up_type} to upload."
    except SameFileError:
        error = "(Some) item(s) already exists."
    except:
        error = "Something went wrong when uploading."

    if not error: return redirect_no_query()
    return render_template(
        "upload.html", error=error,
        action=action, filename=""
    )
    

def upfile(dps, path, ACL, root):
    return handle_upload(dps, path, ACL, root, "upFile", "file(s)")

def updir(dps, path, ACL, root):
    return handle_upload(dps, path, ACL, root, "upDir", "dir")


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
            check_recursive(path, ACL, root, mv)
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

