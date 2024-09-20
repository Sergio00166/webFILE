#Code by Sergio00166

from os.path import join, isdir, relpath, exists, pardir, abspath, getsize, isfile
from functions import *
from os import sep
from re import compile as recompile
from argparse import ArgumentParser
from random import choice


def init():
    from ipaddress import IPv4Address,IPv6Address

    def is_valid_ip(ip):
        try: IPv4Address(ip); return True
        except:
            try: IPv6Address(ip); return True
            except: return False
    
    exit_err = False
    # Parse all CLI arguments
    parser = ArgumentParser(description="Arguments for the webFILE")
    parser.add_argument("-b", "--bind", type=str, required=True, help="Specify IP address to bind", metavar="IP")
    parser.add_argument("-p", "--port", type=str, required=True, help="Specify port number")
    parser.add_argument("-d", "--dir", type=str, required=True, help="Specify directory to share")
    parser.add_argument("--dirsize", action="store_true", help="Show folder size")
    args = parser.parse_args()
    if not is_valid_ip(args.bind):
        print("THE IP IS NOT VALID")
        exit_err = True   
    try: int(args.port)
    except:
        print("THE PORT IS NOT VALID")
        exit_err = True     
    if not (exists(args.dir) and isdir(args.dir)):
        print("THE FOLDER PATH IS NOT VALID")
        exit_err = True   
    if exit_err: exit(1)

    return args.port, args.bind, args.dir, args.dirsize


def filepage_func(path,root,filetype,random=False,no_next=False):
    # Get relative path from the root dir
    path=relpath(isornot(path,root), start=root)
    # Get the name of the folder
    folder=sep.join(path.split(sep)[:-1])
    name=path.split(sep)[-1]
    # Get all folder contents
    out=get_folder_content(root+sep+folder,root,False)
    # Convert the dir sep to UNIX if contains windows sep
    path=path.replace(sep,"/")
    # Get all folder contents that has the same filetype
    lst = [x["path"] for x in out if x["description"] == filetype]
    # Get next one
    try: nxt = lst[lst.index(path)+1]
    except: nxt = lst[0]
    # Get previous one
    if lst.index(path)==0: prev=lst[-1]
    else: prev=lst[lst.index(path)-1]
    # Fix url strings
    nxt = fix_pth_url(nxt)
    prev = fix_pth_url(prev)
    # Set blank if flag
    if no_next: nxt = ""
    # Return random flag
    if random:
        rnd = fix_pth_url(choice(lst))
        return prev,nxt,name,path,rnd
    else: return prev,nxt,name,path


def index_func(folder_path,root,folder_size,sort):
    # Check if the folder_path is valid
    folder_path=isornot(folder_path,root)
    # Check if the folder path is the same as the root dir
    is_root = folder_path==root
    # Get all folder contents
    folder_content = get_folder_content(folder_path,root,folder_size)
    # Get the parent dir from the folder_path
    parent_directory = abspath(join(folder_path, pardir))
    # Check if the parent directory if root
    if parent_directory==root: parent_directory=""
    else: parent_directory= relpath(parent_directory, start=root)
    # Get relative path from root
    folder_path = relpath(folder_path, start=root)
    # Fix and check some things with the paths
    if folder_path==".": folder_path=""
    folder_path="/"+folder_path.replace(sep,"/")
    parent_directory=parent_directory.replace(sep,"/")
    folder_content = sort_contents(folder_content, sort)
    par_root = (parent_directory=="")
    return folder_content,folder_path,parent_directory,is_root,par_root

