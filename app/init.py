# Code by Sergio00166

if __name__=="__main__": exit(0)

from functions import load_userACL,safe_path
from override import CustomFormDataParser
from flask import redirect,request,Flask
from send_file import send_file,send_dir
from flask_sqlalchemy import SQLAlchemy
from os import sep,getenv,urandom
from secrets import token_hex
from os.path import abspath
from actions import *
from sys import path

# Set the paths of templates and static
parent_path = abspath(path[0]+sep+"..")
templates = parent_path+sep+"templates"
sroot = parent_path+sep+"static"

# Get all the args from the Enviorment
root        = getenv('SERVE_PATH'  ,None)
error_file  = getenv('ERRLOG_FILE' ,parent_path+"error.log")
users_file  = getenv('USERS_FILE'  ,parent_path+"users.json")
acl_file    = getenv('ACL_FILE'    ,parent_path+"acl.json")
sessions_db = getenv('SESSIONS_DB' ,parent_path+"sessions.db")
folder_size = getenv('SHOW_DIRSIZE',"FALSE").upper()=="TRUE"

if root is None: exit(1)
root = abspath(root)
app = Flask(__name__,static_folder=None,template_folder=templates)
app.secret_key = getenv('SECRET_KEY',urandom(24).hex())

# Configure SQLite for session storage
app.config['SESSION_TYPE'] = 'sqlalchemy'
app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{sessions_db}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SESSION_PERMANENT'] = False
app.config['SESSION_USE_SIGNER'] = True
app.config['PERMANENT_SESSION_LIFETIME'] = 3600

# Initialize database and session
db = SQLAlchemy(app)
app.config['SESSION_SQLALCHEMY'] = db
Session(app)

# Modify default behaviour
app.request_class.\
form_data_parser_class =\
CustomFormDataParser

# Get current parser object
dps = app.request_class.form_data_parser_class

# Load and define the USER/ACL database
USERS,ACL = {},{}
try: load_userACL(USERS,ACL,users_file,acl_file)
except Exception as e:
    printerr(e,error_file,"Cannot open the USER/ACL database files")
    exit(1) # Dont countinue if error

