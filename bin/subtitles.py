# Code by Sergio1260
# Obtains info and tracks for the video player
# Also fixes weird things with the codecs while
# converting formats like ASS/SSA to webVTT
# Yes WebExplorers sucks

from os import sep, linesep
from actions import isornot
from subprocess import check_output
from flask import Response
from io import StringIO
import pysubs2


def combine_same_time(src):
    subs = pysubs2.SSAFile.from_string(src)
    new_events,grouped_events,oldtxt = [],{},""
    for event in subs:
        key = (event.start, event.end)
        if key not in grouped_events:
            if not oldtxt==event.text:
                grouped_events[key] = event.text
        elif not oldtxt==event.text:
            grouped_events[key] += " "+event.text
        oldtxt=event.text
    for (start, end), text in grouped_events.items():
        new_event = pysubs2.SSAEvent(start=start, end=end, text=text)
        new_events.append(new_event)
    subs.events = new_events
    return subs

def get_codec(source,index):
    cmd=f"ffprobe -v error -select_streams s:{index} -show_entries \
        stream=codec_name -of default=noprint_wrappers=1:nokey=1 "
    cmd += ' "'+source+'"'
    if sep==chr(92): cmd+=" 2>nul"
    else: cmd+=" 2>/dev/null"
    return str(check_output(cmd, shell=True), encoding="UTF8").split(linesep)[0]

def convert(src):
    subs = pysubs2.SSAFile.from_string(src)
    with StringIO() as tmp:
        subs.to_file(tmp,"vtt",apply_styles=False)
        out = tmp.getvalue()
    subs = combine_same_time(out)
    with StringIO() as tmp:
        subs.to_file(tmp,"vtt",apply_styles=False)
        out = tmp.getvalue()
    return out

def extract(source,index):
    codec = get_codec(source,index)
    cmd=f'ffmpeg -i "{source}" -map 0:s:{str(index)} -f {codec} -'
    if sep==chr(92): cmd+=" 2>nul"
    else: cmd+=" 2>/dev/null"
    out = check_output(cmd, shell=True)
    out = str(out, encoding="UTF8")
    return out

def get_info(source):
    cmd="ffprobe -v error -select_streams s -show_entries stream_tags=title -of csv=p=0"
    cmd += ' "'+source+'"'
    if sep==chr(92): cmd+=" 2>nul"
    else: cmd+=" 2>/dev/null"
    try:
        out=str(check_output(cmd, shell=True), encoding="UTF8").split(linesep)
        out=["Track "+str(out.index(x)+1) if x=="" else x for x in out[:-1]]
    except: out=[]
    return out

def get_track(arg,root):
    separator = arg.find("/")
    index = arg[:separator]
    file = arg[separator+1:]
    file = isornot(file,root)
    out = extract(file,index)
    return Response(convert(out),
        mimetype="text/plain",
        headers={"Content-disposition":
                "attachment; filename=subs.vtt"}
        )
