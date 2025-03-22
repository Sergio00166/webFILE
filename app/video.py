# Code by Sergio00166

from subprocess import Popen,PIPE,run,DEVNULL
from ssatovtt import convert as convert_ssa
from os.path import getsize,getmtime
from json import loads as jsload
from cache import SelectiveCache
from flask import Response
from os import sep,getenv


cache_limit = getenv('MAX_CACHE',None)
if cache_limit and not cache_limit.isdigit():
    print("MAX_CACHE MUST BE AN INT VALUE")
    exit(1) # Dont continue
cache_limit = int(cache_limit) if cache_limit else 256
cache = SelectiveCache(max_memory=cache_limit*1024*1024)

subsmimes = {
    "ssa":"application/x-substation-alpha",
    "ass":"application/x-substation-alpha",
    "webvtt":"text/vtt",
}
ssa = ["ssa", "ass"]


def check_ffmpeg_installed():
    try:
        result = run(['ffmpeg','-version'],stdout=DEVNULL)
        if result.returncode != 0:
            raise ModuleNotFoundError("FFMPEG IS NOT INSTALLED")
    except: raise ModuleNotFoundError("FFMPEG IS NOT INSTALLED")


@cache.cached("sz","mt")
def ffmpeg_get_codec(source,index,sz,mt):
    codec = run([
        'ffprobe', '-v', 'quiet',
        '-select_streams', f's:{index}',
        '-show_entries', 'stream=codec_name','-of',
        'default=noprint_wrappers=1:nokey=1',source
    ], stdout=PIPE,stderr=PIPE).stdout.decode().strip()

    if codec in ssa: return codec
    else: return "webvtt"


@cache.cached("sz","mt")
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


@cache.cached("sz","mt")
def ffmpeg_extract_info(file_path,sz,mt):
    # This is to get all the subtitles name or language
    ffprobe_output = jsload( run([
        'ffprobe', '-v', 'quiet', '-select_streams',
        's', '-show_entries',
        'stream=index:stream_tags=title:stream_tags=language',
        '-of', 'json', file_path
    ], stdout=PIPE,stderr=PIPE).stdout.decode() )

    subtitles_list = []
    streams = ffprobe_output.get('streams',[])

    for p,stream in enumerate(streams):
        tags = stream.get('tags', {})
        title = tags.get('title')
        lang = tags.get('language')
        subtitles_list.append(
            f"{title} - [{lang}]" if title
            else f"Track {p} - [{lang}]"
        )
    return subtitles_list


@cache.cached("sz","mt")
def ffmpeg_get_subs(file,index,codec,legacy,sz,mt):
    out = run( [
        'ffmpeg', '-i', file, '-map',
        f'0:s:{index}', '-f', codec, '-'
    ], stdout=PIPE,stderr=PIPE )

    if out.returncode != 0:
        raise NotImplementedError(
            f"Unsupported subtitle codec"
        )
    out = out.stdout.decode()
    if legacy and codec!="webvtt":
        return convert_ssa(out)
    return out



# sz & mt are just to invalidate cache

def extract_subtitles(index,file,codec,legacy):
    sz,mt = getsize(file),getmtime(file)
    args = (file,index,codec,legacy,sz,mt)
    return ffmpeg_get_subs(*args)

def get_info(file):
    sz,mt = getsize(file), getmtime(file)
    return ffmpeg_extract_info(file,sz,mt)

def get_chapters(file):
    sz,mt = getsize(file), getmtime(file)
    return ffmpeg_extract_chapters(file,sz,mt)

def get_codec(file, index):
    sz,mt = getsize(file), getmtime(file)
    return ffmpeg_get_codec(file,index,sz,mt)



def get_subtitles(index,file,legacy,info):
    codec = get_codec(file, index)
    # Extract subtitles if not info flag set
    out = "" if info else extract_subtitles(index,file,codec,legacy)
    # Get filename and for downloading the subtitles
    codec = "webvtt" if legacy else codec
    subsname = file.split(sep)[-1]+f".track{str(index)}."
    subsname += "vtt" if codec=="webvtt" else codec
    # Return the subtittle track with the right mime
    return Response(out,mimetype=subsmimes[codec], headers=\
    {'Content-Disposition': 'attachment;filename='+subsname})

