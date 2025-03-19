# Code by Sergio00166

from concurrent.futures import ThreadPoolExecutor
from subprocess import Popen,PIPE,run,DEVNULL
from ssatovtt import convert as convert_ssa
from os.path import getsize,getmtime,exists
from fontTools.ttLib import TTFont
from json import loads as jsload
from send_file import send_file
from functools import cache
from flask import Response
from os import sep


subsmimes = {
    "ssa":"application/x-substation-alpha",
    "ass":"application/x-substation-alpha",
    "webvtt":"text/vtt",
}
fonts_ext = ["ttf", "otf", "woff", "woff2"]


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
 

@cache # Create a cache to dont overload the server
def extract_subtitles(index,file,legacy,sz,mt):
    codec,out = get_track(file,index)
    # Convert or extract the subtitles
    if legacy and codec!="webvtt":
        out = convert_ssa(out)
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



""" Video Fonts Section """


def get_font_name(font_path):
    font = TTFont(font_path)
    name_table = font['name']
    preferred_family = None
    preferred_subfamily = None
    fallback_family = None
    for record in name_table.names:
        try:
            if record.nameID == 16:   preferred_family = record.toStr()
            elif record.nameID == 17: preferred_subfamily = record.toStr()
            elif record.nameID == 1:  fallback_family = record.toStr()
        except: pass 
    if preferred_family and preferred_subfamily:
        return f"{preferred_family} {preferred_subfamily}"
    else: return fallback_family


def extract_font(mkv_file, attachment_id, original_filename, fonts_path):
    output_file = fonts_path + sep + original_filename
    if not exists(output_file):
        run(
            ['mkvextract', 'attachments', mkv_file, f"{attachment_id}:{output_file}"],
            stdout=PIPE, stderr=PIPE
        )
    return get_font_name(output_file), original_filename


def list_fonts(mkv_file, fonts_path):
    mkv_info = jsload(run(['mkvmerge', '-J', mkv_file], stdout=PIPE, stderr=PIPE).stdout.decode())
    all_fonts,futures = {},{}
    
    with ThreadPoolExecutor() as executor:
        for attachment in mkv_info.get('attachments', []):
            filename = attachment.get('file_name')
            ext = filename[::-1].split(".")[0][::-1]
            if ext in fonts_ext:
                attachment_id = attachment['id']
                original_filename = attachment['file_name']
                futures[executor.submit(extract_font, mkv_file, attachment_id, original_filename, fonts_path)] = original_filename
        
        for future in futures:
            realname, original_filename = future.result()
            all_fonts[realname.lower()] = original_filename
    
    return all_fonts


def get_font(mkv_file, font_name, fonts_path):
    font = fonts_path+sep+font_name
    if not exists(font): 
        _ = list_fonts(mkv_file, fonts_path)
    return send_file(font)    

