# Code by Sergio00166

from video import get_tracks, get_chapters, get_subtitles
from video import external_subs, check_ffmpeg_installed
from flask import render_template, request, Response
from os.path import basename, dirname, relpath
from urllib.parse import quote as encurl
from listing import get_folder_content
from functions import autoload_webpage
from random import choice
from msgspec import json
from os import sep


def get_filepage_data(file_path, root, filetype, ACL, random=False, no_goto_start=False):
    path = relpath(file_path, start=root).replace(sep, "/")
    folder, name = dirname(file_path), basename(path)

    content = get_folder_content(folder, root, False, ACL)
    files = [x["name"] for x in content if x["type"] == filetype]
    path_index = files.index(name)

    if len(files) == 1:
        if not random: return "", "", name
        else: return "", "", name, ""
    try:
        next = files[path_index + 1]
    except:
        next = "" if no_goto_start else files[0]

    if path_index == 0:
        prev = "" if no_goto_start else files[-1]
    else:
        prev = files[path_index - 1]

    if not random: return prev, next, name
    else: return prev, next, name, basename(choice(files))


def directory(path, root, folder_size, ACL, useApi):
    if useApi:
        contents = get_folder_content(path, root, folder_size, ACL)
        return Response(json.encode(contents), mimetype="application/json")
    else:
        return render_template("index.html", autoload_webpage=autoload_webpage)


def audio(path, root, file_type, ACL):
    prev, next, name, rand = get_filepage_data(path, root, file_type, ACL, random=True)
    return render_template("audio.html", name=name, prev=prev, next=next, rand=rand)

def photo(path, root, file_type, ACL):
    prev, next, name = get_filepage_data(path, root, file_type, ACL)
    return render_template("photo.html", name=name, prev=prev, next=next)

def markdown(path, root, file_type, ACL):
    name = basename(path)
    return render_template("markdown.html", name=name)


def video(path, root, file_type, ACL):
    check_ffmpeg_installed()
    get_mode = request.args.get("get")

    # Subtitles: SSA (default) and VTT (legacy) modes
    if get_mode in ("subs_ssa", "subs_vtt"):
        try: idx = int(request.args.get("id"))
        except: raise FileNotFoundError

        legacy = get_mode == "subs_vtt"
        return get_subtitles(int(idx), path, legacy)

    if get_mode == "chapters": return get_chapters(path);
    if get_mode == "tracks":   return get_tracks(path);

    prev, next, name = get_filepage_data(
        path, root, file_type, ACL, no_goto_start=True
    )
    subs = external_subs(path)
    subs = basename(subs) if subs != path else ""

    return render_template(
        "video.html", name=name,
        prev=prev, next=next, subs_file=subs
    )

 