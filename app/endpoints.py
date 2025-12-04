# Code by Sergio00166

from flask import redirect, render_template, request, session
from functions import printerr, safe_path, validate_acl
from fs_utils import get_file_type, autoload_webpage
from send_file import send_dir, send_file
from functions import printerr
from os.path import isfile
from hashlib import sha256
from os import sep
from views import *


def path_handler(path, ACL, root, folder_size):
    if not request.method in ["GET", "HEAD"]:
        return "Method not allowed", 405

    # Allow root listing
    if path: validate_acl(path, ACL)
    path = safe_path(path, root)
    file_type = get_file_type(path)
    get_mode = request.args.get("get","")

    if not file_type in ["directory", "disk"]:

        if get_mode != "file":

            if file_type == "webpage":
                return send_file(path, mimetype="text/html")

            if request.path.endswith("/"):
                return redirect(request.path[:-1])

            if file_type == "video":
                return video(path, root, file_type, ACL)

            if file_type == "audio":
                return audio(path, root, file_type, ACL)

        encache = get_mode == "cached"
        mime = None if encache or file_type not in ["text", "source"] else "text/plain"
        return send_file(path, mimetype=mime, cache=encache)

    else:
        if get_mode == "file":
            return send_dir(path, root, ACL)

        if get_mode != "json":

            if isfile(path + sep + autoload_webpage) and get_mode != "default":
                url_sep = "" if request.path.endswith("/") else "/"
                return redirect(request.path + url_sep + autoload_webpage)

            if not request.path.endswith("/"):
                query = request.query_string.decode()
                query = "?" + query if query else ""
                return redirect(request.path + "/" + query)

        sort = request.args["sort"] if "sort" in request.args else ""
        return directory(path, root, folder_size, sort, ACL, get_mode == "json")



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
    isApi = request.headers.get("Accept","") == "*/*"

    if isinstance(e, PermissionError):
        if isApi: return "Forbidden",       403
        return render_template("403.html"), 403

    elif isinstance(e, FileNotFoundError):
        if isApi: return "Not Found",       404
        return render_template("404.html"), 404

    else:
        printerr(e, error_file)  # Log the error
        if isApi: return "Server Error",    500
        return render_template("500.html"), 500

 