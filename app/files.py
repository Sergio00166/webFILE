#Code by Sergio00166

from flask import render_template, redirect
from urllib.parse import urlparse, urlunparse
from functions import validate_acl,isornot
from os import sep,makedirs,remove,walk
from os.path import exists,isdir,dirname,relpath
from shutil import rmtree


def check_recursive(path,ACL,root,write=False):
    for fulldir,d,f in walk(path):
        for item in d+f:
            item = fulldir+sep+item
            item = relpath(item,start=root)
            item = item.replace(sep,"/")
            validate_acl(item,ACL,write)


def do_job(ACL,r_path,filename,root,file=None,dupmkd=False):
    try: path = isornot(r_path+sep+filename,root,True)
    except PermissionError: return "FORBIDDEN"
    except: pass
    else:
        if file is None and not exists(sep.join(path.split(sep)[:-1])):
            return "Subdirectory does not exist"
        elif exists(path):
            if file is None: return 'Already exists'
            else: return '(Some) File(s) already exist'
        else:
            try:
                chkpth = r_path+"/"+filename
                validate_acl(r_path,ACL,True)
                validate_acl(chkpth,ACL,True)
            except PermissionError:
                return "Permission denied for (some) item(s)"
            try:
                if file is None: makedirs(path)
                else:
                    makedirs(dirname(path),exist_ok=True) 
                    file.save(path)
            except: return "Internal server error"
    return None


def addfile(request,path,ACL,root):
    error = None
    _ = isornot(path,root)
    validate_acl(path,ACL,True)

    if request.method == "POST":
        action = request.form.get("action")

        if action == "mkdir":
            foldername = request.form.get("foldername", "").strip()
            if not foldername: error = "The folder name cannot be empty."
            else: error = do_job(ACL,path,foldername,root)
        
        elif action in ["upFile","upDir"]:
            updir = action=="upDir"
            files = request.files.getlist('files')
            if not files or len(files)==1 and files[0].filename=="":
                if updir: error="Please select a folder to upload."
                else: error="Please select file(s) to upload."
            else:
                for file in files:
                    error_new = do_job(ACL,path,file.filename,root,file)
                    if not error_new is None: error = error_new

        else: error = "That mehtod does not exist"
        if error:
            return render_template(
                "upload.html", error=error, action=action,
                filename=request.form.get("filename", ""),
            )
        # Redirect to the same path but without the query
        parsed_url = urlparse(request.url)
        return redirect(urlunparse(
            (parsed_url.scheme,parsed_url.netloc,parsed_url.path,'','','')
        ))
    return render_template("upload.html", error=error)


def delfile(request,path,ACL,root):
    validate_acl(path,ACL,True)
    path = isornot(path,root)
    if isdir(path):
        try:
            check_recursive(path,ACL,root,True)
            rmtree(path)
        except: return "Unable to delete dir",403
    else:
        try: remove(path)
        except: return "Unable to delete file",403

    return "File deleted",200

