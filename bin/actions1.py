#Code by Sergio 1260

from os import access, R_OK, sep, listdir, remove, stat, walk
from subtitles import cache_dir, get_track, random_str, save_subs_cache, get_subs_cache, get_info
from os.path import join, relpath, exists, getsize, isfile, getsize, getmtime, basename
from functions import isornot
from flask import Response
import tarfile


def create_tar_header(file_path, arcname):
    tarinfo = tarfile.TarInfo(name=arcname)
    tarinfo.size = getsize(file_path)
    tarinfo.mtime = getmtime(file_path)
    tarinfo.mode = stat(file_path).st_mode
    tarinfo.type = tarfile.REGTYPE
    tarinfo.uname = ""
    tarinfo.gname = ""
    return tarinfo.tobuf()

def stream_tar_file(file_path, arcname):
    # Create the tar header for the file
    yield create_tar_header(file_path, arcname)   
    # Stream file contents from disk
    with open(file_path, 'rb') as f:
        while True:
            chunk = f.read(262144)
            if not chunk: break
            yield chunk
    # Generate padding for the block
    file_size = getsize(file_path)
    padding_size = (512-(file_size%512))%512
    yield b'\0' * padding_size

def generate_tar(directory_path):
    for root, _, files in walk(directory_path):
        for file in files:
            file_path = join(root, file)
            arcname = relpath(file_path, directory_path)
            yield from stream_tar_file(file_path, arcname)
  
    yield b'\0'*1024 # Add TAR end
    
def send_dir(directory):
    folder = basename(directory)
    return Response(generate_tar(directory),mimetype='application/x-tar',
    headers={'Content-Disposition': 'attachment;filename='+folder+'.tar'})



def sub_cache_handler(arg,root):
    # Set some values
    separator = arg.find("/")
    index = arg[:separator]
    file = arg[separator + 1:]
    file = isornot(file, root)
    # Get the index table of the cache
    dic = get_subs_cache()
    # Generate a map of used values
    available = [x[0] for x in dic.values()]
    # Get map to delete shit
    try:
        todelete = [x for x in listdir(cache_dir) if x not in available and isfile(cache_dir+x)]
        if "index.txt" in todelete: todelete.remove("index.txt")
        [remove(cache_dir+x) for x in todelete]
    except: pass
    # Get filesize as str
    filesize = str(getsize(file))
    # If the file is not in the index table
    if not arg in dic:
        # Extract and convert the subs
        out = get_track(file,index)
        # Refresh index table
        dic = get_subs_cache()
        # If other process did not add to the index table
        # the same subs as this proc has generated
        # then write an new entry and a new cache file
        if not arg in dic:
            # Generate a new one until not used
            cache=random_str()
            while cache in available:
                cache=random_str()
            # Do the rest stuff to save the cache
            dic[arg] = [cache,filesize]
            file = open(cache_dir+cache,"w",newline='')
            file.write(out); file.close()
            del file; save_subs_cache(dic)
    else:
        # Checks if the size of this file is the
        # same as the one is in the index table
        # It works like a shitty checksum
        fix = (filesize == dic[arg][1])
        # If the checksum is not equal or the cache file
        # is missing then we create a new cache file with
        # the name in the index table (dont change index table)
        # Else we simply read the cache file
        if not fix or not exists(cache_dir+dic[arg][0]):
            out = get_track(file,index)
            cache = dic[arg][0]
            dic[arg] = [cache,filesize]
            file = open(cache_dir+cache,"w",newline='')
            file.write(out); file.close()
            del file; save_subs_cache(dic)
        else: out=open(cache_dir+dic[arg][0],"r").read()            
    
    return out
