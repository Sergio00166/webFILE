# Code by Sergio00166

from os.path import exists, isfile, basename
from subprocess import Popen,PIPE,run,DEVNULL
from ssatovtt import convert as convert_ssa
from shutil import which as find_proc
from sys import path as pypath
from cache import setup_cache
from flask import Response
from os import stat, sep
import json

cache = setup_cache(1)
cache_TTL = 60*60 # 1h
is_ffmpeg_available = False
ISO_codes = json.load(open(pypath[0] + sep + "iso_639.json"))


def check_ffmpeg_installed():
    global is_ffmpeg_available
    if is_ffmpeg_available: return
    if find_proc("ffmpeg"): is_ffmpeg_available = True
    else: raise ModuleNotFoundError("FFMPEG is not installed")

def external_subs(file):
    sname = ".".join(file.split(".")[:-1]+["mks"])
    cond = exists(sname) and isfile(sname)
    return sname if cond else file


@cache.cached("inode","size","mtime",TTL=cache_TTL)
def ffmpeg_get_chapters(file_path, inode, size, mtime):
    ffprobe_output = json.loads( run([
        "ffprobe", "-v", "quiet", "-show_entries",
        "chapters",  "-of", "json", file_path
    ], stdout=PIPE, stderr=DEVNULL).stdout.decode() )
    try:
        return json.dumps([ {
            "title": chapter["tags"].get("title", "Untitled"),
            "start_time": int(float(chapter["start_time"]))
        } for chapter in ffprobe_output["chapters"] ])

    except: return ""


@cache.cached("inode","size","mtime",TTL=cache_TTL)
def ffmpeg_get_tracks(file_path, inode, size, mtime):
    # This is to get all the subtitles name or language
    ffprobe_output = json.loads( run([
        "ffprobe", "-v", "quiet",
        "-select_streams", "s", "-show_entries",
        "stream=index:stream_tags=title:stream_tags=language",
        "-of", "json", file_path
    ], stdout=PIPE, stderr=DEVNULL).stdout.decode() )

    subtitles_list = []
    streams = ffprobe_output.get("streams",[])

    for p, stream in enumerate(streams):
        tags = stream.get("tags", {})
        title = tags.get("title")
 
        lang = ISO_codes.get(
            tags.get("language")
        )
        subtitles_list.append(
            f"{lang} - {title}"
            if lang and title else 
            lang or title or f"Track{p}"
        )
    return json.dumps(subtitles_list)


@cache.cached("inode","size","mtime",TTL=cache_TTL)
def ffmpeg_get_subs(file, index, legacy, inode, size, mtime):
    if legacy:
        ass2vtt = get_codec(file,index)=="ass"
        codec = "ass" if ass2vtt else "webvtt"
    else: ass2vtt, codec = False, "ass"

    out = run([
        "ffmpeg", "-i", file, "-map",
        f"0:s:{index}", "-f", codec, "-"
    ], stdout=PIPE, stderr=DEVNULL)

    if out.returncode != 0:
        raise NotImplementedError("Unsupported subtitle codec")

    out = out.stdout.decode()
    return convert_ssa(out) if ass2vtt else out


# sz & mt are just to invalidate cache

def get_tracks(file):
    file = external_subs(file)
    st = stat(file)
    inode = getattr(st, "st_ino", None) or 0
    return ffmpeg_get_tracks(file, inode, st.st_size, st.st_mtime)

def get_chapters(file):
    st = stat(file)
    inode = getattr(st, "st_ino", None) or 0
    return ffmpeg_get_chapters(file, inode, st.st_size, st.st_mtime)


def get_codec(source,index):
    return "ass" if run([
        "ffprobe", "-v", "quiet",
        "-select_streams", f"s:{index}",
        "-show_entries", "stream=codec_name","-of",
        "default=noprint_wrappers=1:nokey=1",source
    ], stdout=PIPE, stderr=DEVNULL
    ).stdout.decode().strip() in ["ssa","ass"] else "webvtt"


def get_subtitles(index,file,legacy):
    # Set invalidator and call it
    file = external_subs(file)
    st = stat(file)
    inode = getattr(st, "st_ino", None) or 0

    out = ffmpeg_get_subs(
        file, index, legacy,
        inode, st.st_size, st.st_mtime
    )
    subsname = basename(file)+f".track{str(index)}."
    subsname += "vtt" if legacy else "ssa"

    mime = "text/vtt" if legacy else "application/x-substation-alpha"
    headers = {"Content-Disposition": "attachment;filename=" + subsname}

    return Response(out, mimetype=mime, headers=headers)

 