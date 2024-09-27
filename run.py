#!/usr/bin/python3
#Code by Sergio00166

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
banner = "\n"+("\n".join(banner))+"\n"

from ipaddress import IPv4Address,IPv6Address
from logging import getLogger,WARNING,INFO
from argparse import ArgumentParser
from os.path import exists,isdir
from time import sleep as delay
from threading import Thread
from os import environ,sep
from sys import modules
from sys import path


def is_valid_ip(ip):
    try: IPv4Address(ip); return True
    except:
        try: IPv6Address(ip); return True
        except: return False

def init():
    # Parse all CLI arguments
    parser = ArgumentParser(description="Arguments for the webFILE")
    parser.add_argument("-b", "--bind", type=str, required=True, help="Specify IP address to bind", metavar="IP")
    parser.add_argument("-p", "--port", type=str, required=True, help="Specify port number")
    parser.add_argument("-d", "--dir", type=str, required=True, help="Specify directory to share")
    parser.add_argument("--dirsize", action="store_true", help="Show folder size")
    args,exit_err = parser.parse_args(),False
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

if __name__ == "__main__":
    print(banner) # Print the main banner
    # Get the values from the initor (args from cli)
    port, listen, root, folder_size = init()
    environ['FOLDER'] = root
    environ['SHOWSIZE'] = str(folder_size).upper()
    path[0] += sep+"app" # Set path to app dir
    from app import *  # Import main flask app
    # Disable every shit that flask prints
    log = getLogger('werkzeug'); log.setLevel(WARNING)
    # Hide the banner that flask prints
    modules['flask.cli'].show_server_banner = lambda *x: print(end="")
    # Change logging to default after app is running
    Thread(target=lambda: (delay(0.1), log.setLevel(INFO))).start()
    # Run the main app with the custom args
    app.run(host=listen, port=int(port), debug=False)
