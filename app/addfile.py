from flask import render_template, redirect
from urllib.parse import urlparse, urlunparse
from functions import validate_acl,isornot
from os import sep,makedirs
from os.path import exists


# Mode 0 = create file, 1 = create dir, 2 = upload
def do_job(ACL,r_path,filename,root,mode=0,file=None):
    try: path = isornot(r_path+sep+filename,root,True)
    except PermissionError:
        return "Unable to create outside the server parent path"
    except: pass
    else:
        if not exists(sep.join(path.split(sep)[:-1])):
            return "The subdirectory does not exist"
        elif exists(path): return "It already exists"
        else:
            validate_acl(r_path,ACL,True)
            try:
                if mode==0: open(path,"w").close()
                if mode==1: makedirs(path)
                if mode==2: file.save(path)
            except: return "Internal server error"
    return None


def addfile(request,r_path,ACL,root):
    error = None
    if request.method == "POST":
        action = request.form.get("action")

        if action == "mkfile":
            filename = request.form.get("filename", "").strip()
            if not filename: error = "Filename cannot be empty."
            else: error = do_job(ACL,r_path,filename,root,0)
    
        elif action == "mkdir":
            foldername = request.form.get("foldername", "").strip()
            if not foldername: error = "The folder name cannot be empty."
            else: error = do_job(ACL,r_path,foldername,root,1)
        
        elif action == "upload":
            file = request.files.get("file")
            if not file or file.filename == "":
                error = "Please select a file to upload."
            else: error = do_job(ACL,r_path,file.filename,root,2,file)
                
        if error:
            return render_template(
                "create_add.html",
                error=error, action=action,
                filename=request.form.get("filename", ""),
            )
        # Redirect to the same path but without the query
        parsed_url = urlparse(request.url)
        return redirect(urlunparse(
            (parsed_url.scheme,parsed_url.netloc,parsed_url.path,'','','')
        ))
    return render_template("create_add.html", error=error)

