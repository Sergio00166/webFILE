# Code by Sergio00166

from subprocess import Popen,PIPE,run,DEVNULL
from ssatovtt import convert as convert_ssa
from os.path import getsize,getmtime
from json import loads as jsload
from functools import cache
from flask import Response
from os import sep


subsmimes = {
    "ssa":"application/x-substation-alpha",
    "ass":"application/x-substation-alpha",
    "webvtt":"text/vtt",
}

def check_ffmpeg_installed():
    try:
        result = run(['ffmpeg','-version'],stdout=DEVNULL)
        if result.returncode != 0:
            raise ModuleNotFoundError("FFMPEG IS NOT INSTALLED")
    except: raise ModuleNotFoundError("FFMPEG IS NOT INSTALLED")



@cache # Dont overload the server
def ffmpeg_get_codec(source, index):
    # Gets the codec name from a file
    return run([
        'ffprobe', '-v', 'quiet',
        '-select_streams', f's:{index}',
        '-show_entries', 'stream=codec_name','-of',
        'default=noprint_wrappers=1:nokey=1',source
    ], stdout=PIPE,stderr=PIPE).stdout.decode().strip()


@cache # Dont overload the server
def ffmpeg_extract_chapters(file_path,sz,mt):
    try:
        ffprobe_output = jsload( run([
            'ffprobe', '-v', 'quiet', '-print_format',
            'json', '-show_entries', 'chapters', file_path
        ], stdout=PIPE,stderr=PIPE).stdout.decode() )
        filtered_chapters = [ {
            'title': chapter['tags'].get('title', 'Untitled'),
            'start_time': int(float(chapter['start_time']))
        } for chapter in ffprobe_output['chapters'] ]
        return filtered_chapters
    except: return ""


@cache # Dont overload the serve
def ffmpeg_extract_info(file_path):
    # This is to get all the subtitles name or language
    ffprobe_output = jsload( run([
        'ffprobe', '-v', 'quiet', '-select_streams', 's', 
        '-show_entries', 'stream=index:stream_tags=title:stream_tags=language',
        '-of', 'json', file_path
    ], stdout=PIPE,stderr=PIPE).stdout.decode() )
    subtitles_list = []

    for p,stream in enumerate(
        ffprobe_output.get('streams',[])
    ):
        tags = stream.get('tags', {})
        title = tags.get('title')
        lang = tags.get('language')
        subtitles_list.append(
            f"{title} - [{lang}]" if title
            else f"Track {p} - [{lang}]"
        )
    return subtitles_list


def ffmpeg_get_subs(file,index,legacy,info=False):
    # Here we extract [and corvert] a
    # subtitle track from a video file
    codec = get_codec(file, index)
    # If the codec is not ssa or ass simply let
    # Fmmpeg to convert it directly
    if not codec in ["ssa", "ass"]: codec="webvtt"
    if not info:
        out = run([
            'ffmpeg', '-i', file,
            '-map', f'0:s:{index}',
            '-f', codec, '-'
        ], stdout=PIPE,stderr=PIPE)
        if out.returncode != 0:
            raise NotImplementedError(
                f"Unsupported subtitle codec"
            )
        out = out.stdout.decode()
        if legacy and codec!="webvtt":
            out = convert_ssa(out) 
    else: out=""
    return codec, out


@cache # Dont overload the server
def extract_subtitles(index,file,legacy,info):
    if info: codec,out = ffmpeg_get_subs(index,file,True)
    else: codec,out = ffmpeg_get_subs(index,file,legacy)
    # Get filename and for downloading the subtitles
    codec = "webvtt" if legacy else codec
    subsname = file.split(sep)[-1]+f".track{str(index)}."
    subsname += "vtt" if codec=="webvtt" else codec 
    # Return the subtittle track
    return Response(out,mimetype=subsmimes[codec], headers=\
    {'Content-Disposition': 'attachment;filename='+subsname})



# The functions that will be called.
# sz and mt for invalidating the cache

def get_subtitles(index,file,legacy,info):
    sz,mt = getsize(file),getmtime(file)
    args = (index,file,legacy,info,sz,mt)
    return extract_subtitles(*args)

def get_info(file):
    sz,mt = getsize(file), getmtime(file)
    return ffmpeg_extract_info(file,sz,mt)
    
def get_chapters(file):
    sz,mt = getsize(file), getmtime(file)
    return ffmpeg_extract_chapters(file,sz,mt)

def get_codec(file, index):
    sz,mt = getsize(file), getmtime(file)
    return ffmpeg_get_codec(file,index,sz,mt)

