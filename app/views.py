# Code by Sergio00166

from video import get_tracks, get_chapters, get_subtitles
from video import external_subs, check_ffmpeg_installed
from listing import get_folder_content, sort_contents
from flask import render_template, request, Response
from os.path import basename, dirname, relpath
from urllib.parse import quote as encurl
from renderer import render_folder
from random import choice
from msgspec import json
from os import sep


def get_filepage_data(file_path, root, filetype, ACL, random=False, no_goto_start=False):
    path = relpath(file_path, start=root).replace(sep, "/")
    folder, name = dirname(file_path), basename(path)

    content = get_folder_content(folder, root, False, ACL)
    content = sort_contents(content, "np", root) #Alphanumerical

    files = [x["path"] for x in content if x["type"] == filetype]
    path_index = files.index(f"/{encurl(path)}")

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

    if prev != "": prev = basename(prev)
    if next != "": next = basename(next)

    if not random: return prev, next, name
    else: return prev, next, name, basename(choice(files))


def directory(path, root, folder_size, sort, ACL, useApi):
    sort = sort if sort in ("np", "nd", "sp", "sd", "dp", "dd") else "np"
    contents = get_folder_content(path, root, folder_size, ACL)
    contents = sort_contents(contents, sort, root)

    if useApi:
        return Response(
            json.encode(contents),
            mimetype="application/json"
        )
    else:
        path_text = relpath(path, start=root).replace(sep, "/")
        path_text = "/" if path_text == "." else f"/{path_text}/"

        return render_template(
            "index.html", content=render_folder(contents),
            folder_path=path_text, sort=sort
        )


def audio(path, root, file_type, ACL):
    prev, next, name, rand = get_filepage_data(path, root, file_type, ACL, random=True)
    return render_template("audio.html", name=name, prev=prev, next=next, rand=rand)

def photo(path, root, file_type, ACL):
    prev, next, name = get_filepage_data(path, root, file_type, ACL)
    return render_template("photo.html", name=name, prev=prev, next=next)


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

 