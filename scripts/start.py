#!/usr/bin/env python3
# Code by Sergio00166

banner = [
"                          █████     ███████████ █████ █████       ██████████   ",
"                         ░░███     ░░███░░░░░░█░░███ ░░███       ░░███░░░░░█   ",
" █████ ███ █████  ██████  ░███████  ░███   █ ░  ░███  ░███        ░███  █ ░    ",
"░░███ ░███░░███  ███░░███ ░███░░███ ░███████    ░███  ░███        ░██████      ",
" ░███ ░███ ░███ ░███████  ░███ ░███ ░███░░░█    ░███  ░███        ░███░░█      ",
" ░░███████████  ░███░░░   ░███ ░███ ░███  ░     ░███  ░███      █ ░███ ░   █   ",
"  ░░████░████   ░░██████  ████████  █████       █████ ███████████ ██████████   ",
"   ░░░░ ░░░░     ░░░░░░  ░░░░░░░░  ░░░░░       ░░░░░ ░░░░░░░░░░░ ░░░░░░░░░░    ",
" lightweight web server to share files and play multimedia over the network    "]
banner = ("\n".join(banner))+"\n\n"

from subprocess import Popen, check_output as chout
from ipaddress import IPv4Address,IPv6Address
from os.path import exists,isdir
from sys import path,argv,stderr
from time import sleep as delay
from threading import Thread
from os import sep


def is_valid_ip(ip):
    try: IPv4Address(ip); return True
    except:
        try: IPv6Address(ip); return True
        except: return False

def init():
    error_exit=False
    if len(argv)==1:
        file=path[0]+sep+"config.cfg"
    else: file=argv[1]
    try: file = open(file,"r")
    except: print("[ERROR]: CANT OPEN CONFIG FILE"); exit(1)
    dic={}
    for x in file:
        x=x.rstrip().lstrip()
        if not len(x)==0 and not x.startswith("#"):
            key=x[:x.find(":")]; value=x[x.find(":")+1:]
            value=value.strip(); dic[key.strip()]=value 

    if not "folder" in dic:
        print("[CFG_FILE]: A FOLDER PATH IS NEEDED")
        error_exit = True
    else: 
        root=dic["folder"]
        if not (exists(root) and isdir(root)):
            print("[CFG_FILE]: THE FOLDER PATH IS NOT VALID")
            error_exit = True

    if "port" in dic:
        port=dic["port"]
        if "-" in port:
            st,end = port.split("-")
            try:
                st,end = int(st),int(end)
                if     1>=st : raise ValueError
                if 65536<=st : raise ValueError
                if     1>=end: raise ValueError
                if 65536<=end: raise ValueError
            except:
                print("[CFG_FILE]: THE PORT IS NOT VALID")
                error_exit = True
            if st>end: st,end = end,st
            ports=[str(x) for x in range(st,end+1)]
        else:
            ports=[]
            for x in port.split(","):
                try:
                    x = int(x.strip())
                    if     1>=x: raise ValueError
                    if 65536<=x: raise ValueError
                    ports.append(str(x))
                except:
                    print("[CFG_FILE]: THE PORT IS NOT VALID")
                    error_exit = True
    else: ports=["80"]

    if "listen" in dic:
        listen,buffer = dic["listen"],[]
        for x in listen.split(","):
            x=x.strip()
            if x=="localhost":
                buffer.append("127.0.0.1")
            elif x=="localhost6":
                buffer.append("::1")
            elif is_valid_ip(x):
                buffer.append(x)
            else:
                print("[CFG_FILE]: THE IP IS NOT VALID")
                error_exit = True
        listen=buffer; del buffer
    else: listen=["127.0.0.1"]

    if "show.folder.size" in dic:
        folder_size=dic["show.folder.size"].upper()
        if folder_size=="TRUE": folder_size=True
        elif folder_size=="FALSE": folder_size=False
        else:
            print("[CFG_FILE]: BAD VALUE IN show.folder.size")
            error_exit = True
    else: folder_size="false"

    if error_exit: exit(1)
    return ports, listen, root, folder_size


def respawn_msg(txt):
    msg = "Relaunching Process: "
    txt = " ".join(txt)
    port = txt[txt.find("-p ")+3:]
    port = port[:port.find(" ")]
    bind = txt[txt.find("-b ")+3:]
    bind = bind[:bind.find(" ")]
    msg += bind+":"+port
    print(msg,file=stderr)

def wait4child(cmd):
    while True:
        Popen(cmd).wait()
        respawn_msg(cmd)

def main():
    # Define the path of the child script
    PyExec = path[0]+sep+"run.py"
    # Detect OS and add proper executable
    if sep==chr(92): python="python"
    else: python="python3"
    # Parse and get values from the file config
    ports,listen,root,folder_size = init()
    # Set some data for the banner and info
    data = ["\033[32mListening on: \033[34m"+ip+\
            "\033[32m:\033[31m"+port+"\033[0m"\
            for ip in listen for port in ports]
    # Print and create all the banner
    print("\n"+banner+"\n".join(data))
    print("\033[32mServing path: \033[34m"+root+"\033[0m\n")
    # Create a Thread to keep executing the child processes
    for ip in listen:
        for port in ports:
            cmd=[python,PyExec,"-b",ip,"-p",port,"-d",root]
            if folder_size: cmd.append("--dirsize")
            thr = Thread(target=wait4child, args=(cmd,))
            thr.daemon = True # Set it as a daemon
            thr.start() # Start the daemon thread

    try: # Wait until Ctrl+C
        while True: delay(1)
    except KeyboardInterrupt: exit(1)


if __name__=="__main__": main()

