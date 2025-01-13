# Code by Sergio00166

from functions import get_file_type,getclient,update_rules
from flask import redirect,request,Flask,Request
from actions import *
from secrets import token_hex
from threading import Thread
from flask_session import Session
from os import sep,getenv,urandom
from flask_sqlalchemy import SQLAlchemy
from sys import path
from files import addfile,delfile,move_copy
from send_file import send_file,send_dir
from werkzeug.formparser import FormDataParser


def init():
    # Set the paths of templates and static
    templates=abspath(path[0]+sep+".."+sep+"templates")
    sroot=abspath(path[0]+sep+".."+sep+"static"+sep)
    # Get all the args from the Enviorment
    root = getenv('FOLDER',None)
    if root is None: exit()
    folder_size = getenv('SHOWSIZE',"FALSE")
    folder_size = folder_size.upper()=="TRUE"
    # Create the main app flask
    app = Flask(__name__,static_folder=sroot,template_folder=templates)
    return app,folder_size,root

app,folder_size,root = init()
# Change this to an static value for multi-worker scenarios
app.secret_key = urandom(24).hex()

# Configure SQLite for session storage
app.config['SESSION_TYPE'] = 'sqlalchemy'
app.config['SQLALCHEMY_DATABASE_URI'] = "sqlite:///sessions.db"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SESSION_PERMANENT'] = False
app.config['SESSION_USE_SIGNER'] = True
app.config['PERMANENT_SESSION_LIFETIME'] = 3600

# Initialize database and session
db = SQLAlchemy(app)
app.config['SESSION_SQLALCHEMY'] = db
Session(app)

# Dont fuck off when uploading
class uRequest(Request):
    max_content_length = None
    max_form_memory_size = None
    max_form_parts = None
app.request_class = uRequest

# Define basic stuff
sroot = app.static_folder
USERS,ACL = {},{}
thr = Thread(target=update_rules, args=(USERS,ACL,))
thr.daemon = True;  thr.start()
