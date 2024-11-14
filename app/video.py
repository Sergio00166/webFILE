# Code by Sergio00166

from subprocess import Popen, PIPE, run, DEVNULL
from os import sep, linesep, remove, mkdir
from json import loads as jsload
from os.path import exists
from random import choice
from glob import glob
from sys import path

pdir = sep.join(path[0].split(sep)[:-1])
pdir += sep+"cache"+sep
cache_dir = pdir+"subtitles"+sep
database = pdir+"subtitles.db"


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


def get_chapters(file_path):
    try:
        result = run([
            'ffprobe', '-v', 'quiet', '-print_format',
            'json', '-show_entries', 'chapters', file_path
        ], stdout=PIPE, stderr=PIPE, text=True)
        ffprobe_output = jsload(result.stdout)
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
    result = run([
        'ffprobe', '-v', 'quiet', '-select_streams', 's', 
        '-show_entries', 'stream=index:stream_tags=title:stream_tags=language',
        '-of', 'json', file_path
    ], stdout=PIPE, stderr=PIPE, text=True) 
    ffprobe_output,subtitles_list = jsload(result.stdout),[]
    for p,stream in enumerate( ffprobe_output.get('streams',[]) ):
        tags = stream.get('tags', {})
        title = tags.get('title')
        lang = tags.get('language')
        subtitles_list.append(
            f"{title} - [{lang}]" if title
            else f"Track {p} - [{lang}]"
        )
    return subtitles_list


def get_subs_cache():
    # Returns a dict wiht the values from a file
    # Also it checks if it exists both dir and index file
    # If they are missing it creates them again
    file = database
    if not exists(pdir): mkdir(pdir)
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
        file = []    
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
    open(database,"w").write(out)


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
    proc = Popen(cmd, stdout=PIPE, stderr=PIPE)
    return proc.communicate()[0].decode("UTF-8")

