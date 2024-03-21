# Code by Sergio1260

from subprocess import Popen
from sys import path, argv
from os.path import exists, isdir
from os import sep

def init():
    if len(argv)==1: file=path[0]+sep+"bin"+sep+"config.cfg"
    else: file=argv[1]
    try: file = open(file,"r")
    except: print("ERROR: config file not valid or not exists"); exit()
    dic={}
    for x in file:
        x=x.rstrip().lstrip()
        if not len(x)==0 and not x.startswith("#"):
            key=x[:x.find(":")]
            value=x[x.find(":")+1:]
            value=value.rstrip().lstrip()
            key=key.rstrip().lstrip()
            dic[key]=value
    if not "port" in dic: dic["port"]="80"
    if not "listen" in dic: dic["listen"]="172.0.0.1"
    if not "show.folder.size" in dic: folder_size="false"
    else: folder_size=dic["show.folder.size"].lower()
    if not "folder" in dic:
        print("[CFG_FILE]: A FOLDER PATH IS NEEDED"); exit()
    root=dic["folder"]
    if not (exists(root) and isdir(root)):
        print("[CFG_FILE]: THE SPECIFIED FOLDER PATH IS NOT VALID"); exit()
        
    return dic["port"], dic["listen"], root, folder_size

def main():
    PyExec=path[0]+sep+"bin"+sep+"main.py"
    port, listen, root, folder_size = init()
    if sep==chr(92): python="python"
    else: python="python3"
    args=[python,PyExec,"-b",listen,"-p",port,"-d",root]
    if folder_size: args.append("--dirsize")
    process = Popen(args)
    try: process.wait()
    except: pass

if __name__=="__main__": main()
