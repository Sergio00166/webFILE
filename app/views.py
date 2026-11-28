# Code by Sergio00166

from video import get_tracks, get_chapters, get_subtitles
from video import external_subs, check_ffmpeg_installed
from flask import render_template, request, Response
from urllib.parse import quote as encurl
from listing import get_folder_content
from functions import autoload_webpage
from os.path import basename, dirname
from random import choice
from msgspec import json
from os import sep

json_enc = json.Encoder()

def get_filepage_data(
    file_path, ACL, root, user,
    filetype, random=False,
    no_goto_start=False
):
    idx = file_path.rfind(sep)
    folder, name = file_path[:idx], file_path[idx + 1:]

    content = get_folder_content(folder, ACL, root, user, False)
    files = [x["name"] for x in content if x["type"] == filetype]
    path_index = files.index(name)

    if len(files) == 1:
        if not random: return "", "", name
        else: return "", "", name, ""

    next_fallback = "" if no_goto_start else files[0]
    prev_fallback = "" if no_goto_start else files[-1]
    has_next = path_index + 1 < len(files)

    next = files[path_index + 1] if has_next   else next_fallback
    prev = files[path_index - 1] if path_index else prev_fallback

    if not random: return prev, next, name
    else: return prev, next, name, basename(choice(files))


def directory(path, ACL, root, user, folder_size, useApi):
    if useApi:
        contents = get_folder_content(path, ACL, root, user, folder_size)
        return Response(json_enc.encode(contents), mimetype="application/json")
    else:
        return render_template("index.html", autoload_webpage=autoload_webpage)


def audio(path, ACL, root, user, file_type):
    prev, next, name, rand = get_filepage_data(path, ACL, root, user, file_type, random=True)
    return render_template("audio.html", name=name, prev=prev, next=next, rand=rand)

def photo(path, ACL, root, user, file_type):
    prev, next, name = get_filepage_data(path, ACL, root, user, file_type)
    return render_template("photo.html", name=name, prev=prev, next=next)


def video(path, ACL, root, user, file_type):
    check_ffmpeg_installed()
    get_mode = request.args.get("get")

    # Subtitles: SSA (default) and VTT (legacy) modes
    if get_mode in ("subs_ssa", "subs_vtt"):
        try: idx = int(request.args.get("id"))
        except: raise FileNotFoundError

        legacy = get_mode == "subs_vtt"
        return get_subtitles(int(idx), path, legacy)

    # Just to get some needed data/info
    if get_mode == "info":
        subs = external_subs(path)
        prev, next, _ = get_filepage_data(
            path, ACL, root, user, file_type,
            no_goto_start=True
        )
        data = {
            "next":      next if next else None,
            "prev":      prev if prev else None,
            "chapters":  get_chapters(path),
            "subtitles": {
                "tracks":   get_tracks(path),
                "external": basename(subs) if subs != path else None,
            }
        }
        return json_enc.encode(data)
    return render_template("video.html")

 