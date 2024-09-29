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
from os.path import exists, isdir
from time import sleep as delay
from sys import path, argv
from os import sep, kill


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
            try: st=int(st); end=int(end)
            except:
                print("[CFG_FILE]: PORTS MUST BE A NUMBER")
                error_exit = True
            if st>end: st,end = end,st
            ports=[str(x) for x in range(st,end+1)]
        else:
            ports=[]
            for x in port.split(","):
                try: ports.append(str(int(x.strip())))
                except:
                    print("[CFG_FILE]: PORTS MUST BE A NUMBER")
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


def exists_pid(pid):
    if sep==chr(92):
        cmd = f'powershell "Get-Process -Id {pid} |'
        cmd += ' Select-Object -ExpandProperty Id"'
        try: chout(cmd)
        except: return False
        else: return True
    else:
        try: kill(pid, 0)
        except: return False
        else: return True

def respawn_msg(txt):
    print("\033[32mRelaunching Process: ",end="")
    txt = " ".join(txt)
    port = txt[txt.find("-p ")+3:]
    port = port[:port.find(" ")]
    bind = txt[txt.find("-b ")+3:]
    bind = bind[:bind.find(" ")]
    print("\033[34m"+bind+"\033[32m:\033[31m"+port+"\033[0m")    

def main():
    proc = {} # Initialize proc dict
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
    print("\n"+banner, end="")
    print("\n".join(data))
    print("\033[32mServing path: \033[34m"+root+"\033[0m\n")

    # Execute each process
    for ip in listen:
        for port in ports:
            args=[python,PyExec,"-b",ip,"-p",port,"-d",root]
            if folder_size: args.append("--dirsize")
            proc[Popen(args).pid] = args;  delay(0.1)

    try: # wait forever
        while True:
            # Check if one process has died
            for x in proc.copy():
                if not exists_pid(x):
                    respawn_msg(proc[x])
                    proc[Popen(proc[x]).pid] = proc[x]
                    del proc[x] # Clear old one
            delay(2) # Reduce polling rate
    except: exit()


if __name__=="__main__": main()

