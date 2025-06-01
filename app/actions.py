# Code by Sergio00166

from video import get_subtitles, get_chapters, get_info, check_ffmpeg_installed
from flask import render_template, stream_template, redirect, request
from files_mgr import upfile, updir, mkdir, delfile, move, copy
from os.path import join, relpath, pardir, abspath, isfile
from urllib.parse import quote as encurl
from send_file import send_file, send_dir
from flask_session import Session
from hashlib import sha256
from random import choice
from functions import *

autoload_webpage = "index" + webpage_file_ext


def serveFiles_page(path, ACL, root, client, folder_size):
    validate_acl(path, ACL)
    path = safe_path(path, root)
    file_type = get_file_type(path)
    encache = "cache" in request.args

    # Check if the path is not a dir
    if not file_type in ["directory", "disk"]:
        
        # Serve page (for plugin-like stuff)
        if file_type == "webpage" and client == "normal":
            return send_file(path, mimetype="text/html")

        # Those are the sub-endpoints
        if "raw" in request.args: 
            return send_file(path, cache=encache)

        if "subs" in request.args and file_type == "video":
            check_ffmpeg_installed()
            return subtitles(path, request.args["subs"])

        # For main pages redirect without /$
        if request.path.endswith("/") and client != "json":
            return redirect(request.path[:-1])

        # Serve the files depending of filetype
        if file_type == "video" and client == "normal":
            check_ffmpeg_installed()
            return video(path, root, file_type, ACL)

        elif file_type == "audio" and client == "normal":
            return audio(path, root, file_type, ACL)

        else:  # Send the file and set mime for text
            mime = None if is_binary(path) else "text/css"\
                  if path.endswith(".css") else "text/plain"
            return send_file(path, mimetype=mime, cache=encache)

    else:
        # Sub-endpoint to get the dir as tar
        if "tar" in request.args:
            return send_dir(path, root, ACL)

        # Autoload index.web if available (plugins-like)
        if (
            isfile(path + sep + autoload_webpage)
            and not "noauto" in request.args
            and client == "normal"
        ):
            url_sep = "" if request.path.endswith("/") else "/"
            return redirect(request.path + url_sep + autoload_webpage)

        # Redirect to have /$ (it means dir)
        if not request.path.endswith("/") and client != "json":
            query = request.query_string.decode()
            query = "?" + query if query else ""
            return redirect(request.path + "/" + query)

        # Return the directory explorer
        sort = request.args["sort"] if "sort" in request.args else ""
        return directory(path, root, folder_size, sort, client, ACL)



def serveRoot_page(ACL, root, client, folder_size):
    path = safe_path("/", root)  # Check if we can access it
    sort = request.args["sort"] if "sort" in request.args else ""
    if "tar" in request.args:
        return send_dir(path, root, ACL, "index")
    return directory(path, root, folder_size, sort, client, ACL)


def login(USERS):
    if request.method == "POST":
        user = request.form.get("username")
        password = request.form.get("password")
        hashed_password = sha256(password.encode()).hexdigest()
        if USERS.get(user) == hashed_password:
            session["user"] = user
            return redirect_no_query()
        else:
            return render_template("login.html", error="Invalid username or password.")
    else:
        return render_template("login.html")


def logout():
    try:
        session.pop("user")
    except:
        pass
    return redirect_no_query()


def error(e, client, error_file):
    if isinstance(e, PermissionError):
        if client == "json":
            return "[]", 403
        return render_template("403.html"), 403

    elif isinstance(e, FileNotFoundError):
        if client == "json":
            return "[]", 404
        return render_template("404.html"), 404

    else:
        printerr(e, error_file)  # Log the error
        if client == "json":
            return "[]", 500
        return render_template("500.html"), 500


def get_filepage_data(file_path, root, filetype, ACL, random=False, ngtst=False):
    # Get relative path from the root dir
    path = relpath(file_path, start=root).replace(sep, "/")

    # Get the name of the folder
    folder = sep.join(file_path.split(sep)[:-1])
    name = path.split("/")[-1]

    # Get all folder contents
    out = get_folder_content(folder, root, False, ACL)

    # Get all folder contents that has the same filetype
    lst = [x["path"] for x in out if x["type"] == filetype]

    # Get next one
    try:
        nxt = lst[lst.index(path) + 1]
    except:
        nxt = "#" if ngtst else lst[0]

    # Get previous one
    if lst.index(path) == 0:
        prev = "#" if ngtst else lst[-1]
    else:
        prev = lst[lst.index(path) - 1]

    # All should start with /
    if prev != "#":
        prev = "/" + prev
    if nxt != "#":
        nxt = "/" + nxt

    # Return random flag
    if random:
        rnd = "/" + choice(lst)
        return prev, nxt, name, rnd
    else:
        return prev, nxt, name


def get_index_data(folder_path, root, folder_size, sort, ACL):
    # Check if the folder path is the same as the root dir
    is_root = folder_path == root

    # Get all folder contents
    folder_content = get_folder_content(folder_path, root, folder_size, ACL)

    # Get the parent dir from the folder_path
    parent_directory = abspath(join(folder_path, pardir))

    # Check if the parent directory if root
    if parent_directory == root:
        parent_directory = ""
    else:
        parent_directory = relpath(parent_directory, start=root) + "/"

    # Get relative path from root
    folder_path = relpath(folder_path, start=root)

    # Fix and check some things with the paths
    if folder_path == ".":
        folder_path = ""
    folder_path = "/" + folder_path.replace(sep, "/")
    parent_directory = parent_directory.replace(sep, "/")
    folder_content = sort_contents(folder_content, sort, root)

    return folder_content, folder_path, parent_directory, is_root


def subtitles(path, mode):
    if mode.endswith("legacy"):
        legacy = True
        mode = mode[: mode.find("legacy")]
    else:
        legacy = False

    if path.endswith("/"):
        path = path[:-1]
    try:
        index = int(mode)
    except:
        raise FileNotFoundError

    return get_subtitles(index, path, legacy)


def video(path, root, file_type, ACL):
    prev, nxt, name = get_filepage_data(path, root, file_type, ACL, ngtst=True)
    tracks, chapters = get_info(path), get_chapters(path)

    subs_file = ".".join(path.split(".")[:-1]+["mks"])
    subs_name = subs_file.split("/")[-1]
    if not isfile(subs_file): subs_file = None
    else: subs_file = "/"+relpath(subs_file, start=root)

    return render_template(
        "video.html", path=path, name=name,
        prev=prev,nxt=nxt, tracks=tracks,
        chapters=chapters, subs_file=subs_file,
        subs_name = subs_name
    )


def audio(path, root, file_type, ACL):
    prev, nxt, name, rnd = get_filepage_data(path, root, file_type, ACL, random=True)
    return render_template("audio.html", path=path, name=name, prev=prev, nxt=nxt, rnd=rnd)


def humanize_all(data):
    for item in data:
        if "capacity" in item:
            item["used"] = round(item["size"] / item["capacity"] * 100)
            item["capacity"] = readable_size(item["capacity"])
        if "mtime" in item:
            item["mtime"] = readable_date(item["mtime"])
        item["size"] = readable_size(item["size"])


def directory(path, root, folder_size, sort, client, ACL):
    # Get the sort value if it is on the list else set default value
    sort = sort if sort in ["np", "nd", "sp", "sd", "dp", "dd"] else "np"

    folder_content, folder_path, parent_directory, is_root =\
    get_index_data(path, root, folder_size, sort, ACL)

    if client == "json":
        return [{**item, "path": "/" + encurl(item["path"])} for item in folder_content]
    else:
        file = "index_cli.html" if client == "legacy" else "index.html"
        humanize_all(folder_content)  # The arg is a reference
        return minify(stream_template(
            file, folder_content=folder_content,folder_path=folder_path,
            parent_directory=parent_directory, is_root=is_root, sort=sort
        ))
