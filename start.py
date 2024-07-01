# Code by Sergio1260

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
banner = "\n"+("\n".join(banner))+"\n\n"


from subprocess import Popen
from sys import path, argv
from os.path import exists, isdir
from os import sep
from time import sleep as delay


def init():
    if len(argv)==1:
        file=path[0]+sep+"bin"+sep+"config.cfg"
    else: file=argv[1]
    try: file = open(file,"r")
    except: print("ERROR: config file not valid or not exists"); exit(1)
    dic={}
    for x in file:
        x=x.rstrip().lstrip()
        if not len(x)==0 and not x.startswith("#"):
            key=x[:x.find(":")]; value=x[x.find(":")+1:]
            value=value.strip(); dic[key.strip()]=value
    if not "port" in dic: dic["port"]="80"
    if not "listen" in dic: dic["listen"]="172.0.0.1"
    if not "show.folder.size" in dic: folder_size="false"
    if not "use.subtitle.cache" in dic: subtitle_cache="false"

    if not "folder" in dic:
        print("[CFG_FILE]: A FOLDER PATH IS NEEDED"); exit(1)
    root=dic["folder"]
    if not (exists(root) and isdir(root)):
        print("[CFG_FILE]: THE SPECIFIED FOLDER PATH IS NOT VALID"); exit(1)
    port=dic["port"]; listen=dic["listen"]

    subtitle_cache=dic["use.subtitle.cache"].upper()
    if subtitle_cache=="TRUE": subtitle_cache=True
    elif subtitle_cache=="FALSE": subtitle_cache=False
    else: print("[CFG_FILE]: INVALID VALUE"); exit(1) 

    folder_size=dic["show.folder.size"].upper()
    if folder_size=="TRUE": folder_size=True
    elif folder_size=="FALSE": folder_size=False
    else: print("[CFG_FILE]: INVALID VALUE"); exit(1)   

    if "-" in port:
        st,end = port.split("-")
        st=int(st); end=int(end)
        ports=[str(x) for x in range(st,end+1)]
    else: ports=[x.strip() for x in port.split(",")]
    listen=[x.strip() for x in listen.split(",")]
    return ports, listen, root, folder_size, subtitle_cache

def main():
    # Print banner
    print(banner, end="")
    # Parse and get values
    ports,listen,root,folder_size,subtitle_cache = init()
    data = ["\033[32mListening on: \033[34m"+ip+\
            "\033[32m:\033[31m"+str(port)+"\033[0m"\
            for ip in listen for port in ports]
    # Print info
    print("\n".join(data))
    print("\033[32mServing path: \033[34m"+root+"\033[0m\n")
    # Execute each process
    PyExec=path[0]+sep+"bin"+sep+"main.py"
    if sep==chr(92): python="python"
    else: python="python3"
    for ip in listen:
        for port in ports:
            args=[python,PyExec,"-b",ip,"-p",port,"-d",root]
            if folder_size: args.append("--dirsize")
            if subtitle_cache: args.append("--subtitle_cache")
            args.append("--no_banner")
            Popen(args); delay(0.1)
    try: # wait forever
        while True: delay(1)
    except: exit()


if __name__=="__main__": main()
