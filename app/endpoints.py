# Code by Sergio00166

from functions import safe_path, validate_acl, printerr
from flask import redirect, session, request
from video import check_ffmpeg_installed
from send_file import send_file, send_dir
from hashlib import sha256
from os.path import isfile
from actions import *

autoload_webpage = "index" + webpage_file_ext


def serveFiles_page(path, ACL, root, folder_size, useApi):
    if not request.method in ["GET", "HEAD"]:
        return "Method not allowed", 405

    validate_acl(path, ACL)
    path = safe_path(path, root)
    file_type = get_file_type(path)
    encache = "cache" in request.args

    if not file_type in ["directory", "disk"]:

        if file_type == "webpage" and not useApi:
            return send_file(path, mimetype="text/html")

        if "raw" in request.args:
            return send_file(path)

        if "subs" in request.args and file_type == "video":
            check_ffmpeg_installed()
            return subtitles(path, request.args["subs"])

        # For main pages redirect without /$
        if request.path.endswith("/") and not useApi:
            return redirect(request.path[:-1])

        if file_type == "video" and not useApi:
            check_ffmpeg_installed()
            return video(path, root, file_type, ACL)

        elif file_type == "audio" and not useApi:
            return audio(path, root, file_type, ACL)

        else:
            mime = None if file_type not in ["text","source"] else\
            "text/css" if path.endswith(".css") else "text/plain"
            return send_file(path, mimetype=mime, cache=encache)

    else:
        if "tar" in request.args:
            return send_dir(path, root, ACL)

        if (
            isfile(join(path, autoload_webpage))
            and not ("noauto" in request.args or useApi)
        ):
            url_sep = "" if request.path.endswith("/") else "/"
            return redirect(request.path + url_sep + autoload_webpage)

        # Redirect to have /$ (it means dir)
        if not request.path.endswith("/") and not useApi:
            query = request.query_string.decode()
            query = "?" + query if query else ""
            return redirect(request.path + "/" + query)

        sort = request.args["sort"] if "sort" in request.args else ""
        return directory(path, root, folder_size, sort, ACL, useApi)


def serveRoot_page(ACL, root, folder_size, useApi):
    if not request.method in ["GET", "HEAD"]:
        return "Method not allowed", 405

    path = safe_path("", root)
    sort = request.args["sort"] if "sort" in request.args else ""

    if "tar" in request.args:
        return send_dir(path, root, ACL, "index")

    return directory(path, root, folder_size, sort, ACL, useApi)


def login(USERS, useApi):
    if request.method == "POST":
        user = request.form.get("username")
        password = request.form.get("password")
        hashed_password = sha256(password.encode()).hexdigest()

        if USERS.get(user) == hashed_password:
            session["user"] = user
            if useApi:
                return "Logged in", 200
            else:
                return redirect_no_query("login")
        elif useApi:
            return "Invalid username or password.", 401
        else:
            return render_template("login.html", error="Invalid username or password.")

    elif request.method == "GET":
        return render_template("login.html")
    else:
        return "Method not allowed", 405


def logout(useApi):
    if not request.method == "GET":
        return "Method not allowed", 405

    try: session.pop("user")
    except:
        if useApi: return "Not logged in", 401
        else: pass

    if useApi:
        return "Logged out", 200
    else:
        return redirect_no_query("logout")


def error(e, error_file, useApi):
    if isinstance(e, PermissionError):
        if useApi: return "[]", 403
        return render_template("403.html"), 403

    elif isinstance(e, FileNotFoundError):
        if useApi: return "[]", 404
        return render_template("404.html"), 404

    else:
        printerr(e, error_file)  # Log the error
        if useApi: return "[]", 500
        return render_template("500.html"), 500

 