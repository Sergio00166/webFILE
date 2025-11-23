# Code by Sergio00166

from video import get_subtitles, external_subs, get_chapters, get_tracks, check_ffmpeg_installed
from flask import render_template, stream_template, redirect, request
from urllib.parse import urlparse, urlunparse, parse_qsl, urlencode
from os.path import pardir, basename, abspath, relpath, dirname
from urllib.parse import quote as encurl
from random import choice
from explorer import *


def redirect_no_query(query):
    parsed_url = urlparse(request.url)
    query_params = parse_qsl(parsed_url.query, keep_blank_values=True)
    filtered_params = [(k, v) for k, v in query_params if k != query]

    new_url = urlunparse((
        "", "",
        parsed_url.path,
        parsed_url.params,
        urlencode(filtered_params).replace("=&","&").removesuffix("="),
        parsed_url.fragment
    ))
    return redirect(new_url)


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
    if next  != "#": next  = basename(next)

    if not random: return prev, next, name
    else: return prev, next, name, basename(choice(files))


def get_index_data(folder_path, root, folder_size, sort, ACL):
    folder_content = get_folder_content(folder_path, root, folder_size, ACL)

    folder_path = relpath(folder_path, start=root).replace(sep, "/")
    folder_path = "/" if folder_path == "." else f"/{folder_path}/"

    folder_content = sort_contents(folder_content, sort, root)
    return folder_content, folder_path


def video(path, root, file_type, ACL):
    check_ffmpeg_installed()

    prev, nxt, name = get_filepage_data(
        path, root, file_type, ACL, no_goto_start=True
    )
    subs = external_subs(path)
    subs = basename(subs) if subs != path else "#"

    return render_template(
        "video.html", path=path, name=name,
        prev=prev,nxt=nxt, subs_file=subs
    )


def audio(path, root, file_type, ACL):
    prev, nxt, name, rnd = get_filepage_data(path, root, file_type, ACL, random=True)
    return render_template("audio.html", path=path, name=name, prev=prev, nxt=nxt, rnd=rnd)


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


def video_info(path):
    check_ffmpeg_installed()

    if "subs" in request.args:
        mode = request.args["subs"];
        if (legacy := mode.endswith("legacy")):
            mode = mode[: mode.find("legacy")]

        if not mode.isnumeric(): raise FileNotFoundError
        return get_subtitles(int(mode), path, legacy)

    if "chapters" in request.args: return get_chapters(path);
    if "tracks"   in request.args: return get_tracks(path);

    return None

 