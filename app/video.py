# Code by Sergio00166

from subprocess import Popen, PIPE, run, DEVNULL
from json import loads as jsload


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


def get_track(file,index,info):
    # Here we extract [and corvert] a
    # subtitle track from a video file
    codec = get_codec(file, index)
    # If the codec is not ssa or ass simply let
    # Fmmpeg to convert it directly
    if not codec in ["ssa", "ass"]: codec="webvtt"
    if not info:
        cmd = [
            'ffmpeg', '-i', file,
            '-map', f'0:s:{index}',
            '-f', codec, '-'
        ]
        proc = Popen(cmd, stdout=PIPE, stderr=PIPE)
        out = proc.communicate()[0].decode("UTF-8")
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


