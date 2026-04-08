# Code by Sergio00166

from files_mgr import copy, delfile, handle_upload, mkdir, move
from flask import redirect, render_template, request, session
from functions import printerr, safe_path, validate_acl, isAdmin
from functions import get_file_type, autoload_webpage
from send_file import send_dir, send_file
from aml_parser import acl_mgm_engine
from os.path import isfile
from hashlib import sha256
from os import sep
from views import *


file_map = {
    "video": video,
    "audio": audio,
    "photo": photo,
    "markdown": markdown
}
def path_handler(path, ACL, root, folder_size):

    if path: validate_acl(path, ACL)
    path = safe_path(path, root)
    get_mode = request.args.get("get", "")

    if isfile(path):
        file_type, mime = get_file_type(path), None
        static = get_mode == "static"

        if not (get_mode == "file" or static):

            if file_type in ("text", "source"):
                mime = "text/plain"

            if file_type == "webpage":
                return send_file(path, mimetype="text/html")

            if request.path.endswith("/"):
                query = request.query_string.decode()
                query = f"?{query}" if query else ""
                return redirect(request.path[:-1] + query)

            if file_type in file_map:
                return file_map[file_type](path, root, file_type, ACL)

        return send_file(path, mimetype=mime, cache=static)

    else:
        if get_mode == "file":
            return send_dir(path, root, ACL)

        if not (json_mode := get_mode == "json"):

            if get_mode != "default" and isfile(f"{path}{sep}{autoload_webpage}"):
                url_sep = "" if request.path.endswith("/") else "/"
                return redirect(f"{request.path}{url_sep}{autoload_webpage}")

            if not request.path.endswith("/"):
                query = request.query_string.decode()
                query = f"?{query}" if query else ""
                return redirect(f"{request.path}/{query}")

        return directory(path, root, folder_size, ACL, json_mode)


def login(USERS):
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")
        hashed_password = sha256(password.encode()).hexdigest()

        if not (user := USERS.get(username)): return "", 401
        if user["hash"] != hashed_password:   return "", 401
        session["user"] = username;           return "", 200

    if request.method != "GET": return "", 405
    return render_template("login.html")


def logout():
    if request.method != "GET": return "", 405
    if "user" not in session:   return "", 401
    session.clear();            return "", 200


def console(USERS):
    if request.method != "GET": return "", 405
    if not isAdmin(USERS): raise PermissionError
    return render_template("console.html")


# Its not efficient but needed to keep it
# atomic, thread-safe and shared across workers
def aml_endpoint(USERS, ACL, users_file, acl_file): 
    if request.method != "POST": return "", 405
    if not isAdmin(USERS): raise PermissionError

    aml_engine = acl_mgm_engine(users_file, acl_file)
    aml_engine.ACL.update(session.get("ACL-scratchpad", ACL))
    aml_engine.USERS.update(session.get("USERS-scratchpad", USERS))

    cmd = request.get_data(as_text=True).split(";")
    result = "".join([aml_engine.run(x) for x in cmd])

    session["USERS-scratchpad"] = aml_engine.USERS
    session["ACL-scratchpad"]   = aml_engine.ACL
    return result


error_map = {
    PermissionError: 403,
    FileNotFoundError: 404,
}
def error(e, error_file):
    accept = request.headers.get("Accept","")
    isBrowser = accept.startswith("text/html")

    code = error_map.get(type(e), 500)
    if code == 500: printerr(e, error_file)

    if not isBrowser: return "", code
    return render_template("error.html", code=code), code


 