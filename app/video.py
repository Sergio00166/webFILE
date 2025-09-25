# Code by Sergio00166

from os.path import getsize,getmtime,exists,isfile,basename
from subprocess import Popen,PIPE,run,DEVNULL
from ssatovtt import convert as convert_ssa
from shutil import which as find_proc
from json import loads as jsload
from cache import setup_cache
from flask import Response

cache = setup_cache()
is_ffmpeg_available = False

def check_ffmpeg_installed():
    global is_ffmpeg_available
    if is_ffmpeg_available: return
    if find_proc("ffmpeg"): is_ffmpeg_available = True
    else: raise ModuleNotFoundError("FFMPEG is not installed")

def external_subs(file):
    sname = ".".join(file.split(".")[:-1]+["mks"])
    cond = exists(sname) and isfile(sname)
    return sname if cond else file


@cache.cached("sz","mt")
def ffmpeg_extract_chapters(file_path,sz,mt):
    ffprobe_output = jsload( run([
        "ffprobe", "-v", "quiet", "-show_entries",
        "chapters",  "-of", "json", file_path
    ], stdout=PIPE,stderr=DEVNULL).stdout.decode() )
    try:
        return [ {
            "title": chapter["tags"].get("title", "Untitled"),
            "start_time": int(float(chapter["start_time"]))
        } for chapter in ffprobe_output["chapters"] ]

    except: return ""


@cache.cached("sz","mt")
def ffmpeg_extract_info(file_path,sz,mt):
    # This is to get all the subtitles name or language
    ffprobe_output = jsload( run([
        "ffprobe", "-v", "quiet", "-select_streams",
        "s", "-show_entries",
        "stream=index:stream_tags=title:stream_tags=language",
        "-of", "json", file_path
    ], stdout=PIPE,stderr=DEVNULL).stdout.decode() )

    subtitles_list = []
    streams = ffprobe_output.get("streams",[])

    for p,stream in enumerate(streams):
        tags = stream.get("tags", {})
        title = tags.get("title")
        lang = tags.get("language")
        subtitles_list.append(
            f"{title} - [{lang}]" if title
            else f"Track {p} - [{lang}]"
        )
    return subtitles_list


@cache.cached("sz","mt")
def ffmpeg_get_subs(file,index,legacy,sz,mt):
    if legacy:
        ass2vtt = get_codec(file,index)=="ass"
        codec = "ass" if ass2vtt else "webvtt"
    else: ass2vtt,codec = False,"ass"

    out = run( [
        "ffmpeg", "-i", file, "-map",
        f"0:s:{index}", "-f", codec, "-"
    ], stdout=PIPE,stderr=DEVNULL )

    if out.returncode != 0:
        raise NotImplementedError("Unsupported subtitle codec")

    out = out.stdout.decode()
    return convert_ssa(out) if ass2vtt else out



# sz & mt are just to invalidate cache

def extract_subtitles(index,file,legacy):
    file = external_subs(file)
    sz,mt = getsize(file),getmtime(file)
    args = (file,index,legacy,sz,mt)
    return ffmpeg_get_subs(*args)

def get_info(file):
    file = external_subs(file)
    sz,mt = getsize(file), getmtime(file)
    return ffmpeg_extract_info(file,sz,mt)

def get_chapters(file):
    sz,mt = getsize(file), getmtime(file)
    return ffmpeg_extract_chapters(file,sz,mt)


def get_codec(source,index):
    return "ass" if run([
        "ffprobe", "-v", "quiet",
        "-select_streams", f"s:{index}",
        "-show_entries", "stream=codec_name","-of",
        "default=noprint_wrappers=1:nokey=1",source
    ], stdout=PIPE,stderr=DEVNULL).stdout.decode().strip() \
    in ["ssa","ass"] else "webvtt"


def get_subtitles(index,file,legacy):
    out = extract_subtitles(index,file,legacy)
    # Get filename and for downloading the subtitles
    subsname = basename(file)+f".track{str(index)}."
    subsname += "vtt" if legacy else "ssa"
    mime = "text/vtt" if legacy else "application/x-substation-alpha"
    headers = {"Content-Disposition": "attachment;filename="+subsname}
    # Return the subtittle track with the right mime
    return Response(out, mimetype=mime, headers=headers)

 