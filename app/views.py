# Code by Sergio00166

from urllib.parse import parse_qsl, quote as encurl, urlencode, urlparse, urlunparse
from listing import get_folder_content, sort_contents
from os.path import basename, dirname, relpath
from flask import render_template, request
from renderer import render_folder
from random import choice
from os import sep
from video import *

from re import findall as re_findall

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
    if next != "#": next = basename(next)

    if not random: return prev, next, name
    else: return prev, next, name, basename(choice(files))


def directory(path, root, folder_size, sort, ACL, useApi):
    sort = sort if sort in ["np", "nd", "sp", "sd", "dp", "dd"] else "np"
    contents = get_folder_content(path, root, folder_size, ACL)
    contents = sort_contents(contents, sort, root)

    if useApi:
        return [{**item, "path": "/" + encurl(item["path"])} for item in contents]
    else:
        path_text = relpath(path, start=root).replace(sep, "/")
        path_text = "/" if path_text == "." else f"/{path_text}/"

        return render_template(
            "index.html", content=render_folder(contents),
            folder_path=path_text, sort=sort
        )


def audio(path, root, file_type, ACL):
    prev, nxt, name, rnd = get_filepage_data(path, root, file_type, ACL, random=True)
    return render_template("audio.html", name=name, prev=prev, nxt=nxt, rnd=rnd)

def photo(path, root, file_type, ACL):
    prev, nxt, name = get_filepage_data(path, root, file_type, ACL)
    return render_template("photo.html", name=name, prev=prev, nxt=nxt)


def video(path, root, file_type, ACL):
    check_ffmpeg_installed()
    get_mode = request.args.get("get")

    # Subtitles: SSA (default) and VTT (legacy) modes
    if get_mode in ["subs_ssa", "subs_vtt"]:
        try: idx = int(request.args.get("id"))
        except: raise FileNotFoundError

        legacy = get_mode == "subs_vtt"
        return get_subtitles(int(idx), path, legacy)

    if get_mode == "chapters": return get_chapters(path);
    if get_mode == "tracks":   return get_tracks(path);

    prev, nxt, name = get_filepage_data(
        path, root, file_type, ACL, no_goto_start=True
    )
    subs = external_subs(path)
    subs = basename(subs) if subs != path else "#"

    return render_template(
        "video.html", name=name,
        prev=prev, nxt=nxt, subs_file=subs
    )

 