# Code by Sergio00166

from functions import validate_acl, safe_path, printerr, _TO_POSIX
from os.path import exists, isdir, dirname
from posixpath import normpath
from shutil import move as sh_move, copy as sh_copy
from os import sep, remove, walk, mkdir as os_mkdir
from shutil import rmtree, copytree, copyfileobj
from urllib.parse import unquote as urldecode
from os import access, R_OK, W_OK
from flask import request

def log(text, code, e, error_file):
    printerr(e, error_file)
    return text, code


def check_recursive(path, ACL, root, user, write=False):
    mode = W_OK if write else R_OK
    for fulldir, _, files in walk(path):
        for item in files:
            item_path = f"{fulldir}{sep}{item}"
            if not access(item_path, mode): raise PermissionError
            rel_path = path[len(root):].translate(_TO_POSIX)
            validate_acl(f"/{item_path}", ACL, user, write)


def check_rec_chg_parent(path, ACL, user, new_parent):
    for fulldir, _, files in walk(path):
        for item in files:
            item_path = f"{fulldir}{sep}{item}"
            rel_path = item_path[len(path):].translate(_TO_POSIX)
            item_path = f"{new_parent}/{rel_path}"
            validate_acl(item_path, ACL, user, True)


def move(path, ACL, root, user, error_file):
    destination = request.headers.get('Destination')
    destination = normpath(urldecode(destination))
    if not destination: return "", 400
    return mvcp_worker(ACL, path, destination, root, user, True, error_file)

def copy(path, ACL, root, user, error_file):
    destination = request.headers.get('Destination')
    destination = normpath(urldecode(destination))
    if not destination: return "", 400
    return mvcp_worker(ACL, path, destination, root, user, False, error_file)


def handle_upload(path, ACL, root, user, error_file):
    try:
        validate_acl(path, ACL, user, True)
        path = safe_path(path, root, True)

        if not exists(dirname(path)): raise FileNotFoundError
        if exists(path): raise FileExistsError

        with open(path, "wb") as f:
            copyfileobj(request.stream, f, length=131072)

    except PermissionError:   return "",     403
    except FileNotFoundError: return "",     404
    except FileExistsError:   return "",     409
    except OSError as e:
        if e.errno == 28:     return "",     507
        else:                 return log("", 500, e, error_file)
    except Exception as e:    return log("", 500, e, error_file)
    else:                     return "",     201


def mkdir(path, ACL, root, user, error_file):
    try:
        validate_acl(path, ACL, user, True)
        full_path = safe_path(path, root, True)
        parent_dir = dirname(full_path)

        if not exists(parent_dir): raise FileNotFoundError
        elif   exists(full_path):  raise FileExistsError
        else:  os_mkdir(full_path)

    except PermissionError:   return "",     403
    except FileNotFoundError: return "",     404
    except FileExistsError:   return "",     409
    except OSError as e:
        if e.errno == 28:     return "",     507
        else:                 return log("", 500, e, error_file)
    except Exception as e:    return log("", 500, e, error_file)
    else:                     return "",     201


def delfile(path, ACL, root, user, error_file):
    try:
        validate_acl(path, ACL, root, user, True)
        path = safe_path(path, root)

        if isdir(path):
            check_recursive(path, ACL, root, user, True)
            rmtree(path)
        else:
            remove(path)

    except FileNotFoundError: return "",     404
    except PermissionError:   return "",     403
    except Exception as e:    return log("", 500, e, error_file)
    else:                     return "",     200


def mvcp_worker(ACL, path, destination, root, user, mv, error_file):
    try:
        validate_acl(path, ACL, user, mv)
        validate_acl(destination, ACL, user, True)
        path = safe_path(path, root)

        if isdir(path):
            check_recursive(path, ACL, root, user, mv)
            check_rec_chg_parent(path, ACL, user, destination)

        destination = safe_path(destination, root, True)
        if exists(destination): raise FileExistsError

        if mv:             sh_move (path, destination)
        elif isdir(path):  copytree(path, destination)
        else:              sh_copy (path, destination)

    except PermissionError:   return "",     403
    except FileNotFoundError: return "",     404
    except FileExistsError:   return "",     409
    except OSError as e:
        if e.errno == 28:     return "",     507
        else:                 return log("", 500, e, error_file)
    except Exception as e:    return log("", 500, e, error_file)
    else:                     return "",     201

 