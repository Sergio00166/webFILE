# Code by Sergio1260

from subprocess import Popen
from sys import path, argv
from os.path import exists, isdir
from os import sep
from threading import Thread
from time import sleep as delay

def worker(ip,port,folder_size,root):
    PyExec=path[0]+sep+"bin"+sep+"main.py"
    if sep==chr(92): python="python"
    else: python="python3"
    args=[python,PyExec,"-b",ip,"-p",port,"-d",root]
    if folder_size: args.append("--dirsize")
    process = Popen(args)

def init():
    if len(argv)==1:
        file=path[0]+sep+"bin"+sep+"config.cfg"
    else: file=argv[1]
    try: file = open(file,"r")
    except: print("ERROR: config file not valid or not exists"); exit()
    dic={}
    for x in file:
        x=x.rstrip().lstrip()
        if not len(x)==0 and not x.startswith("#"):
            key=x[:x.find(":")]; value=x[x.find(":")+1:]
            value=value.strip(); dic[key.strip()]=value
    if not "port" in dic: dic["port"]="80"
    if not "listen" in dic: dic["listen"]="172.0.0.1"
    if not "show.folder.size" in dic: folder_size="false"
    else: folder_size=dic["show.folder.size"].lower()
    if not "folder" in dic:
        print("[CFG_FILE]: A FOLDER PATH IS NEEDED"); exit()
    root=dic["folder"]
    if not (exists(root) and isdir(root)):
        print("[CFG_FILE]: THE SPECIFIED FOLDER PATH IS NOT VALID"); exit()
    port=dic["port"]; listen=dic["listen"]
    if "-" in port:
        st,end = port.split("-")
        st=int(st); end=int(end)
        ports=[str(x) for x in range(st,end+1)]
    else: ports=[x.strip() for x in port.split(",")]
    listen=[x.strip() for x in listen.split(",")]
    return ports, listen, root, folder_size

def main():
    threads=[]
    ports, listen, root, folder_size = init()
    for ip in listen:
        for port in ports:
            threads.append(Thread(target=worker,
                args=(ip,port,folder_size,root,)))
    for x in threads: x.start(); delay(0.1)
    try: # wait
        while True: delay(1)
    except: exit()


if __name__=="__main__": main()
