# Code by Sergio00166

from functions import validate_acl, safe_path
from shutil import move as sh_move, copy as sh_copy
from os.path import exists, isdir, relpath, dirname
from os import sep, remove, walk, mkdir as os_mkdir
from shutil import rmtree, copytree, copyfileobj
from os import access, R_OK, W_OK
from flask import request


def check_recursive(path, ACL, root, write=False):
    for fulldir, _, files in walk(path):
        for item in files:
            item_path = fulldir+sep+item
            
            if not access(item_path, W_OK if write else R_OK):
                raise PermissionError

            item_path = relpath(item_path, start=root)
            item_path = item_path.replace(sep, "/")

            validate_acl(item_path, ACL, write)


def check_rec_chg_parent(path, ACL, root, new_parent):
    parent = len(path.split("/"))
    new_parent = new_parent.split("/")
    for fulldir, _, files in walk(path):
        for item in files:
            item_path = relpath(fulldir+sep+item, start=root).replace(sep, "/")
            item_path = "/".join(new_parent + item_path.split("/")[parent:])
            validate_acl(item_path, ACL, True)


def move(path,ACL,root):  
    destination = request.headers.get('Destination')
    if not destination: return "Bad Request", 400
    return mvcp_worker(ACL,path,destination,root,True)

def copy(path,ACL,root):  
    destination = request.headers.get('Destination')
    if not destination: return "Bad Request", 400
    return mvcp_worker(ACL,path,destination,root,False)


def handle_upload(path,ACL,root):
    try:
        validate_acl(path, ACL, True)
        path = safe_path(path, root, True)

        if not exists(dirname(path)): raise FileNotFoundError
        if exists(path): raise FileExistsError

        with open(path,"wb") as f:
            copyfileobj(request.stream, f, length=1024*1204)

    except PermissionError:   return "Forbidden",          403
    except FileNotFoundError: return "Not Found",          404
    except FileExistsError:   return "Conflict",           409
    except OSError as e:
        if e.errno == 28:     return "Not enough Storage", 507
        else:                 return "Server Error",       500
    except Exception:         return "Server Error",       500
    else:                     return "Created",            201


def mkdir(path, ACL, root):
    try:
        validate_acl(path, ACL, True)
        full_path = safe_path(path,root,True)
        parent_dir = dirname(full_path)

        if not exists(parent_dir): raise FileNotFoundError
        elif   exists(full_path):  raise FileExistsError
        else:  os_mkdir(full_path)

    except PermissionError:   return "Forbidden",          403
    except FileNotFoundError: return "Not Found",          404
    except FileExistsError:   return "Conflict",           409
    except OSError as e:
        if e.errno == 28:     return "Not enough Storage", 507
        else:                 return "Server Error",       500
    except Exception:         return "Server Error",       500
    else:                     return "Created",            201


def delfile(path, ACL, root):
    try:
        validate_acl(path, ACL, True)
        path = safe_path(path, root)
        if isdir(path):
            check_recursive(path,ACL,root,True)
            rmtree(path)
        else: remove(path)
 
    except FileNotFoundError: return "Not Found",    404
    except PermissionError:   return "Forbidden",    403
    except Exception:         return "Server Error", 500
    else:                     return "Successful",   200


def mvcp_worker(ACL, path, destination, root, mv):
    try:
        validate_acl(path, ACL, mv)
        validate_acl(destination,ACL,True)
        path = safe_path(path, root)

        if isdir(path):
            check_recursive(path, ACL, root, mv)
            check_rec_chg_parent(path,ACL,root,destination)
        
        destination = safe_path(destination,root,True)
        if exists(destination): raise FileExistsError

        if mv:             sh_move (path,destination)
        elif isdir(path):  copytree(path,destination)
        else:              sh_copy (path,destination)

    except PermissionError:   return "Forbidden",          403
    except FileNotFoundError: return "Not found",          404
    except FileExistsError:   return "Conflict",           409
    except OSError as e:
        if e.errno == 28:     return "Not enough Storage", 507
        else:                 return "Server Error",       500
    except Exception:         return "Server Error",       500
    else:                     return "Created",            201


