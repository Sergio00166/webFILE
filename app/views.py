# Code by Sergio00166

from urllib.parse import parse_qsl, quote as encurl, urlencode, urlparse, urlunparse
from flask import redirect, render_template, request, stream_template
from listing import get_folder_content, humanize_all, sort_contents
from os.path import basename, dirname, relpath
from random import choice
from os import sep
from video import *


def get_filepage_data(file_path, root, filetype, ACL, random=False, no_goto_start=False):
    path = relpath(file_path, start=root).replace(sep, "/")
    folder, name = dirname(file_path), basename(path)

    content = get_folder_content(folder, root, False, ACL)
    content = sort_contents(content, "np", root) #Alphanumerical
    files = [x["path"] for x in content if x["type"] == filetype]
    try:
        next = files[files.index(path) + 1]
    except:
        next = "#" if no_goto_start else files[0]

    if files.index(path) == 0:
        prev = "#" if no_goto_start else files[-1]
    else:
        prev = files[files.index(path) - 1]

    if prev != "#": prev = basename(prev)
    if next != "#": next  = basename(next)

    if not random: return prev, next, name
    else: return prev, next, name, basename(choice(files))


def get_index_data(folder_path, root, folder_size, sort, ACL):
    folder_content = get_folder_content(folder_path, root, folder_size, ACL)

    folder_path = relpath(folder_path, start=root).replace(sep, "/")
    folder_path = "/" if folder_path == "." else f"/{folder_path}/"

    folder_content = sort_contents(folder_content, sort, root)
    return folder_content, folder_path


def directory(path, root, folder_size, sort, ACL, useApi):
    sort = sort if sort in ["np", "nd", "sp", "sd", "dp", "dd"] else "np"

    folder_content, folder_path =\
    get_index_data(path, root, folder_size, sort, ACL)

    if useApi:
        return [{**item, "path": "/" + encurl(item["path"])} for item in folder_content]
    else:
        humanize_all(folder_content)  # The arg is a reference
        return stream_template(
            "index.html", folder_content=folder_content,
            folder_path=folder_path, sort=sort
        )


def audio(path, root, file_type, ACL):
    prev, nxt, name, rnd = get_filepage_data(path, root, file_type, ACL, random=True)
    return render_template("audio.html", path=path, name=name, prev=prev, nxt=nxt, rnd=rnd)


def video(path, root, file_type, ACL):
    check_ffmpeg_installed()
    get_mode = request.args.get("get")

    # Subtitles: SSA (default) and VTT (legacy) modes
    if get_mode in ["subs_ssa", "subs_vtt"]:
        try: idx = int(request.args.get("id"))
        except: raise FileNotFoundError

        legacy = get_mode == "subs_vtt"
        return get_subtitles(int(idx), path, legacy)

    # Chapters and subtitle track metadata
    if get_mode == "chapters": return get_chapters(path);
    if get_mode == "tracks":   return get_tracks(path);

    # Get explorer page
    prev, nxt, name = get_filepage_data(
        path, root, file_type, ACL, no_goto_start=True
    )
    subs = external_subs(path)
    subs = basename(subs) if subs != path else "#"

    return render_template(
        "video.html", path=path, name=name,
        prev=prev, nxt=nxt, subs_file=subs
    )

 