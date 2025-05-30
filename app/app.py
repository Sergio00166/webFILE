#Code by Sergio00166

from os.path import isfile
from init import *


@app.route('/<path:path>', methods=['GET','POST','DELETE','MKCOL','COPY','MOVE'])
def explorer(path):
    client = getclient(request)
    try:
        # User login/logout stuff
        if "logout" in request.args:  return logout()
        if "login"  in request.args:  return login(USERS)

        # Paths must not end on slash
        if path.endswith("/"): path = path[:-1]
        
        # File management stuff for users
        if request.method.lower() == "delete":
            return delfile(path,ACL,root)
        
        if request.method.lower() == "move":
            return move(path,ACL,root)
        
        if request.method.lower() == "copy":
            return copy(path,ACL,root)

        if request.method.lower() == "mkcol":
            return mkdir(path,ACL,root)

        if "upfile" in request.args:
            return upfile(dps,path,ACL,root)
        
        if "updir" in request.args:
            return updir(dps,path,ACL,root)

        # Send/stream files or directory listing
        return serveFiles_page(path,ACL,root,client,folder_size)
  
    except Exception as e: return error(e,client,error_file)



@app.route('/', methods=['GET','POST'])
def index():
    client = getclient(request)
    try:
        # User login/logout stuff
        if "logout" in request.args: return logout()
        if "login"  in request.args: return login(USERS)

        # Files management stuff for users
        if "upfile" in request.args:
            return upfile(dps,"",ACL,root)
        
        if "updir" in request.args:
            return updir(dps,"",ACL,root)

        # Check if static page is requested
        if "static" in request.args:
            path = request.args["static"]
            path = safe_path(path,sroot),cache=True
            if not isfile(path): return "Not Acceptable", 406
            return send_file( path )

        return serveRoot_page(ACL,root,client,folder_size)

    except Exception as e: return error(e,client,error_file)


if __name__=="__main__": app.run(host="127.0.0.1", port=8000, debug=False)
