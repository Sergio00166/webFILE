# Code by Sergio00166

from os.path import pardir, isfile, basename, abspath, relpath, dirname
from flask import render_template, stream_template
from video import get_subtitles, external_subs
from urllib.parse import quote as encurl
from video import get_chapters, get_info
from random import choice
from explorer import *

# Function to compress HTML output without modifying contents
minify = lambda stream: ("".join(map(str.strip, x.split("\n"))) for x in stream)


def get_filepage_data(file_path, root, filetype, ACL, random=False, ngtst=False):
    # Get relative path from the root dir
    path = relpath(file_path, start=root).replace(sep, "/")
    # Get the name of the folder
    folder, name = dirname(file_path), basename(path)

    # Get all folder contents
    out = get_folder_content(folder, root, False, ACL)
    # Get all folder contents that has the same filetype
    lst = [x["path"] for x in out if x["type"] == filetype]

    # Get next one
    try:    nxt = lst[lst.index(path) + 1]
    except: nxt = "#" if ngtst else lst[0]

    # Get previous one
    if lst.index(path) == 0:
        prev = "#" if ngtst else lst[-1]
    else:
        prev = lst[lst.index(path) - 1]

    # All should start with /
    if prev != "#": prev = "/"+prev
    if nxt  != "#": nxt  = "/"+nxt

    if not random: return prev, nxt, name
    else: return prev, nxt, name, "/"+choice(lst)


def get_index_data(folder_path, root, folder_size, sort, ACL):
    # Check if the folder path is the same as the root dir
    is_root = folder_path == root

    # Get all folder contents
    folder_content = get_folder_content(folder_path, root, folder_size, ACL)

    # Get the parent dir from the folder_path
    parent_directory = abspath(join(folder_path, pardir))

    # Check if the parent directory is root
    parent_directory = "" if parent_directory == root \
        else relpath(parent_directory, start=root)+"/"

    # Get relative path from root
    folder_path = relpath(folder_path, start=root)
    if folder_path == ".": folder_path = ""

    # Fix and check some things with the paths
    folder_path = "/" + folder_path.replace(sep, "/")
    parent_directory = parent_directory.replace(sep, "/")

    # Sort the result items
    folder_content = sort_contents(folder_content, sort, root)
    return folder_content, folder_path, parent_directory, is_root


def subtitles(path, mode):
    if (legacy := mode.endswith("legacy")):
        mode = mode[: mode.find("legacy")]

    try: index = int(mode)
    except: raise FileNotFoundError

    if path.endswith("/"): path = path[:-1]
    return get_subtitles(index, path, legacy)


def video(path, root, file_type, ACL):
    prev, nxt, name = get_filepage_data(path, root, file_type, ACL, ngtst=True)
    tracks, chapters = get_info(path), get_chapters(path)

    subs = external_subs(path)
    subs = "/" + relpath(subs, start=root) if subs != path else "#"

    return render_template(
        "video.html", path=path, name=name,
        prev=prev,nxt=nxt, tracks=tracks,
        chapters=chapters, subs_file=subs,
        subs_name = basename(subs)
    )

def audio(path, root, file_type, ACL):
    prev, nxt, name, rnd = get_filepage_data(path, root, file_type, ACL, random=True)
    return render_template("audio.html", path=path, name=name, prev=prev, nxt=nxt, rnd=rnd)


def directory(path, root, folder_size, sort, ACL, useApi):
    # Get the sort value if it is on the list else set default value
    sort = sort if sort in ["np", "nd", "sp", "sd", "dp", "dd"] else "np"

    folder_content, folder_path, parent_directory, is_root =\
    get_index_data(path, root, folder_size, sort, ACL)

    if useApi:
        return [{**item, "path": "/" + encurl(item["path"])} for item in folder_content]
    else:
        humanize_all(folder_content)  # The arg is a reference
        return minify(stream_template(
            "index.html", folder_content=folder_content,folder_path=folder_path,
            parent_directory=parent_directory, is_root=is_root, sort=sort
        ))

 
