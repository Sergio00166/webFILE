from flask import render_template, redirect
from urllib.parse import urlparse, urlunparse
from functions import validate_acl,isornot
from os import sep,makedirs,remove
from os.path import exists,isdir


# Mode 0 = create file, 1 = create dir, 2 = upload
def do_job(ACL,r_path,filename,root,mode=0,file=None):
    try: path = isornot(r_path+sep+filename,root,True)
    except PermissionError: return "FORBIDDEN"
    except: pass
    else:
        if not exists(sep.join(path.split(sep)[:-1])):
            return "Subdirectory does not exist"
        elif exists(path):
            if mode!=2: return 'Already exists'
            else: return '(Some) File(s) already exist'
        else:
            try: validate_acl(r_path,ACL,True)
            except PermissionError:
                return "You dont have permission to do that"
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
            files = request.files.getlist('files')
            if not files or len(files)==1 and files[0].filename=="":
                error="Please select file(s) to upload."
            else:
                for file in files:
                    error_new = do_job(ACL,r_path,file.filename,root,2,file)
                    if not error_new is None: error = error_new  
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


def delfile(request,r_path,ACL,root):
    path = isornot(r_path,root)
    validate_acl(r_path,ACL,True)
    if isdir(path): raise Exception("Not yet implemented")
    else: remove(path)
    # Redirect to the same parent path but without the query
    parsed_url = urlparse(request.url)
    if parsed_url.path != '/':
        parent_path = '/'.join(parsed_url.path.rstrip('/').split('/')[:-1]) + '/'
    else: parent_path = '/'
    return redirect(urlunparse(
        (parsed_url.scheme, parsed_url.netloc, parent_path, '', '', '')
    ))
