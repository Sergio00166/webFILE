# Code by Sergio00166

if __name__=="__main__": exit(0)

from endpoints import serveFiles_page, serveRoot_page, login, logout, error
from functions import printerr, load_userACL, safe_path, validate_acl
from files_mgr import handle_upload, mkdir, delfile, move, copy
from os.path import abspath, isfile, join
from os import getenv, urandom, makedirs
from flask_sqlalchemy import SQLAlchemy
from flask_session import Session
from flask import Flask, request
from send_file import send_file
from sys import path as pypath
from secrets import token_hex


# Set the paths of templates and static
parent_path = abspath(join(pypath[0],".."))
sroot = join(parent_path,"static")

# Get all the args from the Enviorment
root        = getenv("SERVE_PATH"  ,None)
error_file  = getenv("ERRLOG_FILE" ,None)
users_file  = getenv("USERS_FILE"  ,None)
acl_file    = getenv("ACL_FILE"    ,None)
sessions_db = getenv("SESSIONS_DB" ,None)
folder_size = getenv("SHOW_DIRSIZE","FALSE").upper()=="TRUE"
# MAX_CACHE is inside video.py


if root: root = abspath(root)
else:
    print("YOU MUST SPECIFY THE SERVE_PATH")
    exit(1) # Dont continue

if not all((error_file, users_file, acl_file, sessions_db)):
    data_dir = join(parent_path,"data")
    makedirs(data_dir, exist_ok=True)

error_file  = error_file  or join(data_dir,"error.log")
users_file  = users_file  or join(data_dir,"users.json")
acl_file    = acl_file    or join(data_dir,"acl.json")
sessions_db = sessions_db or join(data_dir,"sessions.db")

# Load and define the USER/ACL database
USERS,ACL = {},{}
try: load_userACL(USERS,ACL,users_file,acl_file)
except Exception as e:
    printerr(e,error_file,"Cannot open the USER/ACL database files")
    exit(1) # Dont countinue if error


# Initialize main flask app
app = Flask(__name__,static_folder=None,template_folder=join(parent_path,"templates"))
app.secret_key = getenv("SECRET_KEY",urandom(24).hex())

# Configure SQLite for session storage
app.config["SESSION_TYPE"] = "sqlalchemy"
app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{sessions_db}"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SESSION_PERMANENT"] = False
app.config["SESSION_USE_SIGNER"] = True
app.config["PERMANENT_SESSION_LIFETIME"] = 3600

# Initialize database and session
db = SQLAlchemy(app)
app.config["SESSION_SQLALCHEMY"] = db
Session(app)


