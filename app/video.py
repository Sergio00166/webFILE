# Code by Sergio00166


from os import sep, linesep, remove, mkdir
from subprocess import Popen, PIPE, run, DEVNULL
from multiprocessing import Process, Queue
from io import StringIO
import pysubs2
from random import choice
from sys import path
from glob import glob
from os.path import exists
from json import loads as jsload

cache_dir = path[0]
del path # Free memory
cache_dir=cache_dir.split(sep)
cache_dir.pop()
cache_dir="/".join(cache_dir)
cache_dir+="/cache/"


def check_ffmpeg_installed():
    try:
        result = run(['ffmpeg','-version'],stdout=DEVNULL)
        if result.returncode != 0:
            raise ModuleNotFoundError("FFMPEG IS NOT INSTALLED")
    except: raise ModuleNotFoundError("FFMPEG IS NOT INSTALLED")

def get_codec(source, index):
    # Gets the codec name from a file
    cmd = [
        'ffprobe', '-v', 'quiet',
        '-select_streams', f's:{index}',
        '-show_entries', 'stream=codec_name',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        source
    ]
    return Popen(cmd, stdout=PIPE).communicate()[0].decode('UTF8').strip()


def convert(src, ret):
    subs = pysubs2.SSAFile.from_string(src.decode('UTF8'))
    del src # Free memory
    with StringIO() as tmp:
        # Here we convert to webVTT without
        # styles bc it show a some weird stuff
        subs.to_file(tmp, "vtt", apply_styles=False)
        del subs # Free memory 
        out = tmp.getvalue() 
    subs = pysubs2.SSAFile.from_string(out)
    del out # Free memory
    # Remove duplicated webVTT entries
    unique_subs,seen = [],set()
    for line in subs:
        key = (line.text, line.start, line.end)
        if key not in seen:
            seen.add(key)
            unique_subs.append(line)
    del subs.events, seen  # Free memory
    # Pass to the object the values
    subs.events = unique_subs
    del unique_subs # Free memory
    out=subs.to_string("vtt")
    del subs  # Free memory
    ret.put(out) # Return values


def get_chapters(file_path):
    try:
        result = run([
            'ffprobe', '-v', 'quiet', '-print_format',
            'json', '-show_entries', 'chapters', file_path
        ], stdout=PIPE, stderr=PIPE, text=True)
        ffprobe_output = jsload(result.stdout)
        del result # Free memory
        filtered_chapters = [
            {
                'title': chapter['tags'].get('title', 'Untitled'),
                'start_time': int(float(chapter['start_time']))
            }
            for chapter in ffprobe_output['chapters']
        ]
        del ffprobe_output # Free memory
        return filtered_chapters
    except: return ""


def get_info(file_path):
    # This is to get all the subtitles name or language
    result = run([
        'ffprobe', '-v', 'quiet', '-select_streams', 's', 
        '-show_entries', 'stream=index:stream_tags=title:stream_tags=language',
        '-of', 'json', file_path
    ], stdout=PIPE, stderr=PIPE, text=True) 
    ffprobe_output,subtitles_list = jsload(result.stdout),[]
    del result # Free memory
    for stream in ffprobe_output.get('streams', []):
        tags = stream.get('tags', {})
        title = tags.get('title')
        language = tags.get('language')
        subtitles_list.append(title if title else language)
    del ffprobe_output # Free memory
    return subtitles_list


def get_subs_cache():
    # Returns a dict wiht the values from a file
    # Also it checks if it exists both dir and index file
    # If they are missing it creates them again
    file=cache_dir+"index.txt"
    if exists(file):
        file = open(file,"r").read()
        file = file.split("\n\n")
        file.pop()
    else:
        if not exists(cache_dir[:-1]):
            mkdir(cache_dir[:-1])
        open(file,"w").close()
        files = glob(cache_dir+"*", recursive=False)
        for x in files: remove(x)
        del files; file = []    
    dic = {}
    for x in file:
        x=x.split("\n")
        if len(x)==3: dic[x[0]]=[x[1],x[2]]
    return dic


def save_subs_cache(dic):
    # Here we write the dict to a
    # file with custom syntax
    out=""
    for x in dic:
       out+=x+"\n"
       out+=dic[x][0]+"\n"+dic[x][1]
       out+="\n\n"
    open(cache_dir+"index.txt","w").write(out)
    del out # Free memory


def random_str():
    lenght=24 # Generate a random name for the file cache
    characters = [chr(i) for i in range(48, 58)] + [chr(i) for i in range(65, 91)]
    random_string = ''.join(choice(characters) for _ in range(lenght))
    return random_string


def get_track(file,index):
    # Here we extract [and corvert] a
    # subtitle track from a video file
    codec = get_codec(file, index)
    # If the codec is not ssa or ass simply let
    # Fmmpeg to convert it directly
    if not codec in ["ssa", "ass"]: codec="webvtt"
    cmd = [
        'ffmpeg', '-i', file,
        '-map', f'0:s:{index}',
        '-f', codec, '-'
    ]
    process = Popen(cmd, stdout=PIPE, stderr=PIPE)
    source, _ = process.communicate(); del process
    # To convert ass/ssa subtitles
    # Yes ffmpeg can do it but id does it
    # in a weird way. This cleans all
    # incompatible stuff and cleans the output
    if not codec=="webvtt":
        ret = Queue()
        proc = Process(target=convert, args=(source,ret,))
        del source # Free memory
        proc.start(); out = ret.get(); proc.join()
        del proc, ret # Free memory
        return out

    else: return source.decode("UTF-8")
    
