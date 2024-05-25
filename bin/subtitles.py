# Code by Sergio1260
# Obtains info and extracts tracks from a video file
# It is used for the video player subtitles
# Also fixes weird things with the codecs when
# converting formats like ASS/SSA to webVTT

from os import sep, linesep
from actions import isornot
from subprocess import Popen, PIPE
from multiprocessing import Process, Queue
from flask import Response
from io import StringIO
import pysubs2

def combine_same_time(src):
    subs = pysubs2.SSAFile.from_string(src)
    grouped_events,oldtxt = {},""
    
    for event in subs:
        key = (event.start, event.end)
        if key not in grouped_events:
            if oldtxt != event.text:
                grouped_events[key] = event.text
        elif oldtxt != event.text:
            grouped_events[key] += " " + event.text
        oldtxt = event.text
    
    del subs.events  # Free memory
    subs.events = [
        pysubs2.SSAEvent(start=start, end=end, text=text)
        for (start, end), text in grouped_events.items()
    ]
    del grouped_events, oldtxt # Free memory
    return subs


def get_codec(source, index):
    cmd = [
        'ffprobe', '-v', 'error',
        '-select_streams', f's:{index}',
        '-show_entries', 'stream=codec_name',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        source
    ]
    return Popen(cmd, stdout=PIPE).communicate()[0].decode('UTF8').strip()


def convert(src, ret):
    subs = pysubs2.SSAFile.from_string(src)
    with StringIO() as tmp:
        subs.to_file(tmp, "vtt", apply_styles=False)
        del subs # Free memory 
        out = tmp.getvalue()
    
    subs = combine_same_time(out)
    del out # Free memory 
    with StringIO() as tmp:
        subs.to_file(tmp, "vtt", apply_styles=False)
        del subs  # Free memory
        out = tmp.getvalue()

    if not ret==None:
        ret.put(out)
    else: return out


def get_info(source):
    cmd = [
        'ffprobe', '-v', 'error',
        '-select_streams', 's',
        '-show_entries', 'stream_tags=title',
        '-of', 'csv=p=0',
        source
    ]
    try:
        output = Popen(cmd, stdout=PIPE).communicate()[0].decode('UTF8').split(linesep)
        return ["Track " + str(index + 1) if not title else title for index, title in enumerate(output) if title]
    except Exception: return []


def get_track(arg, root, async_subs):
    separator = arg.find("/")
    index = arg[:separator]
    file = arg[separator + 1:]
    file = isornot(file, root)

    codec = get_codec(file, index)
    cmd = [
        'ffmpeg', '-i', file,
        '-map', f'0:s:{index}',
        '-f', codec, '-'
    ]
    process = Popen(cmd, stdout=PIPE, stderr=PIPE)
    stdout, _ = process.communicate()
    del  # Free memory
    source = stdout.decode('UTF8')
    del stdout # Free memory

    if async_subs:
        ret = Queue()
        proc = Process(target=convert, args=(source, ret))
        del source # Free memory
        proc.start(); out = ret.get(); proc.join()
        del proc, ret # Free memory

    else:
        out = convert(source, None)
        del source # Free memory
        
    return Response(out, mimetype="text/plain",
    headers={"Content-disposition": "attachment; filename=subs.vtt"})

