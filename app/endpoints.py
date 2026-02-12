# Code by Sergio00166

from flask import redirect, render_template, request, session
from functions import printerr, safe_path, validate_acl
from functions import get_file_type, autoload_webpage
from send_file import send_dir, send_file
from os.path import isfile
from hashlib import sha256
from os import sep
from views import *

file_map = {
    "video": video,
    "audio": audio,
    "photo": photo
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
                query = f"?query" if query else ""
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
        user = request.form.get("username")
        password = request.form.get("password")
        hashed_password = sha256(password.encode()).hexdigest()

        if USERS.get(user) != hashed_password: return "", 401
        session["user"] = user;                return "", 200

    if request.method != "GET":                return "", 405
    return render_template("login.html")


def logout():
    if request.method != "GET": return "", 405
    if "user" not in session:   return "", 401
    session.pop("user");        return "", 200


def error(e, error_file):
    accept = request.headers.get("Accept","")
    isApi = accept.startswith("text/html")

    if isinstance(e, PermissionError):
        if not isApi: return "",            403
        return render_template("403.html"), 403

    elif isinstance(e, FileNotFoundError):
        if not isApi: return "",            404
        return render_template("404.html"), 404

    else:
        printerr(e, error_file)  # Log the error
        if not isApi: return "",            500
        return render_template("500.html"), 500

 