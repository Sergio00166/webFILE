# Code by Sergio00166

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


def init():
    # Set the paths of templates and static
    templates=abspath(path[0]+sep+".."+sep+"templates")
    sroot=abspath(path[0]+sep+".."+sep+"static"+sep)
    # Get all the args from the Enviorment
    root = getenv('FOLDER',None)
    if root is None: exit(1)
    root = abspath(root)
    folder_size = getenv('SHOWSIZE',"FALSE")
    folder_size = folder_size.upper()=="TRUE"
    # Create the main app flask
    app = Flask(__name__,static_folder=sroot,template_folder=templates)
    return app,folder_size,root


# Init main application
app,folder_size,root = init()
sroot = app.static_folder

# Change this to an static value for multi-worker scenarios
app.secret_key = urandom(24).hex()

# Configure SQLite for session storage
db_path = path[0]+sep+"extra"+sep+"sessions.db"
app.config['SESSION_TYPE'] = 'sqlalchemy'
app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{db_path}"
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
try: load_userACL(USERS,ACL)
except Exception as e:
    printerr(e,"Cannot open the USER/ACL database files")
    exit(1) # Dont countinue if error

