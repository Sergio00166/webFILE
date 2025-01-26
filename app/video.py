# Code by Sergio00166

from subprocess import Popen,PIPE,run,DEVNULL
from multiprocessing import Queue, Process
from os.path import getsize,getmtime
from json import loads as jsload
from functools import cache
from flask import Response
from sys import path
from os import sep

subsmimes = {
    "ssa":"application/x-substation-alpha",
    "ass":"application/x-substation-alpha",
    "webvtt":"text/vtt",
}
path.append(sep.join([path[0],"extra","pysubs2.zip"]))


def check_ffmpeg_installed():
    try:
        result = run(['ffmpeg','-version'],stdout=DEVNULL)
        if result.returncode != 0:
            raise ModuleNotFoundError("FFMPEG IS NOT INSTALLED")
    except: raise ModuleNotFoundError("FFMPEG IS NOT INSTALLED")

def get_codec(source, index):
    # Gets the codec name from a file
    return run([
        'ffprobe', '-v', 'quiet',
        '-select_streams', f's:{index}',
        '-show_entries', 'stream=codec_name','-of',
        'default=noprint_wrappers=1:nokey=1',source
    ], stdout=PIPE,stderr=PIPE).stdout.decode().strip()


def get_chapters(file_path):
    try:
        ffprobe_output = jsload( run([
            'ffprobe', '-v', 'quiet', '-print_format',
            'json', '-show_entries', 'chapters', file_path
        ], stdout=PIPE,stderr=PIPE).stdout.decode() )

        filtered_chapters = [
            {
                'title': chapter['tags'].get('title', 'Untitled'),
                'start_time': int(float(chapter['start_time']))
            }
            for chapter in ffprobe_output['chapters']
        ]
        return filtered_chapters
    except: return ""


def get_info(file_path):
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


def get_track(file,index,info=False):
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
        ], stdout=PIPE,stderr=PIPE).stdout.decode()
    else: out = ""
    return codec, out
 

def convert_ass(source,ret):
    try:
        from gc import collect as free
        from io import StringIO
        import pysubs2
        # Load the raw thing onto an object
        subs = pysubs2.SSAFile.from_string(source)
        del source; free()
        with StringIO() as tmp:
            # Here we convert to webVTT without
            # styles bc it show a some weird stuff
            subs.to_file(tmp, "vtt", apply_styles=False)
            del subs; free()
            out = tmp.getvalue() 
        subs = pysubs2.SSAFile.from_string(out)
        del out; free()
        # Remove duplicated webVTT entries
        unique_subs,seen = [],set()
        for line in subs:
            key = (line.text, line.start, line.end)
            if key not in seen:
                seen.add(key)
                unique_subs.append(line)
        del subs.events,seen; free()
        # Pass to the object the values
        subs.events = unique_subs
        del unique_subs; free()
        ret.put([True,subs.to_string("vtt")])
    except Exception as e: ret.put([False,e])


@cache # Create a cache to dont overload the server
def extract_subtitles(index,file,legacy,sz,mt):
    codec,out = get_track(file,index)
    # Convert or extract the subtitles
    if legacy and codec!="webvtt":
        ret = Queue() # Convert the subtitles on a proc
        proc = Process(target=convert_ass, args=(out,ret,))
        proc.start(); converted = ret.get(); proc.join()
        if not converted[0]: raise converted[1]
        out = converted[1]
    return codec,out
    

def get_subtitles(index,file,legacy,info):
    if info: codec,out = get_track(file,index,True)
    else: # SZ & MT only to invalidade cache
        sz,mt = getsize(file),getmtime(file)
        args = (index,file,legacy,sz,mt)
        codec,out = extract_subtitles(*args)
    # Get filename and for downloading the subtitles
    codec = "webvtt" if legacy else codec
    subsname = file.split(sep)[-1]+f".track{str(index)}."
    subsname += "vtt" if codec=="webvtt" else codec 
    # Return the subtittle track
    return Response(out,mimetype=subsmimes[codec], headers=\
    {'Content-Disposition': 'attachment;filename='+subsname})

