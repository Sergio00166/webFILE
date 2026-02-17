# Code by Sergio00166

if __name__=="__main__": exit(0)

from os import getenv, makedirs, urandom
from os.path import abspath, isfile, join
from sys import path as pypath

from flask import Flask, request
from flask_session import Session
from redis import ConnectionPool, Redis

from files_mgr import copy, delfile, handle_upload, mkdir, move
from functions import load_userACL, printerr, safe_path, validate_acl
from send_file import send_file
from endpoints import *


# Base paths for templates/static content
parent_path = abspath(join(pypath[0], ".."))
sroot = join(parent_path,"static")

# Load environment configuration
root        = getenv("SERVE_PATH"  ,None)
error_file  = getenv("ERRLOG_FILE" ,None)
users_file  = getenv("USERS_FILE"  ,None)
acl_file    = getenv("ACL_FILE"    ,None)
folder_size = getenv("SHOW_DIRSIZE","FALSE").upper()=="TRUE"
# Redis configuration, also defined in cache.py
redis_port  = getenv("REDIS_PORT"  ,6379)
redis_addr  = getenv("REDIS_ADDR"  ,"127.0.0.1")


if root: root = abspath(root)
else:
    print("YOU MUST SPECIFY THE SERVE_PATH")
    exit(1) # Dont continue

if not all((error_file, users_file, acl_file)):
    data_dir = join(parent_path,"data")
    makedirs(data_dir, exist_ok=True)

error_file  = error_file  or join(data_dir,"error.log")
users_file  = users_file  or join(data_dir,"users.json")
acl_file    = acl_file    or join(data_dir,"acl.json")

# Load and define the USER/ACL database
USERS,ACL = {},{}
try: load_userACL(USERS, ACL, users_file, acl_file)
except Exception as e:
    printerr(e, error_file, "Cannot open the USER/ACL database files")
    exit(1) # Dont continue if error


# Initialize main flask app
app = Flask(__name__, static_folder=None, template_folder=join(parent_path,"templates"))
app.secret_key = getenv("SECRET_KEY",urandom(24).hex())
pool = ConnectionPool(host=redis_addr, port=redis_port, db=0)
redis_client = Redis(connection_pool=pool)

try: redis_client.ping()
except Exception as e:
    printerr(e, error_file,"Unable to conect to REDIS")
    exit(1) # Dont continue if error 

# Configure Redis for session storage
app.config['SESSION_TYPE'] = 'redis'
app.config['SESSION_PERMANENT'] = False
app.config['SESSION_USE_SIGNER'] = True
app.config['SESSION_REDIS'] = redis_client
app.config["PERMANENT_SESSION_LIFETIME"] = 3600

# Init session
Session(app)

 