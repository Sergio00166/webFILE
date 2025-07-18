#Code by Sergio00166

from init import *


@app.route("/<path:path>", methods=["GET","POST","DELETE","MKCOL","COPY","MOVE","PUT"])
def explorer(path):
    useApi = "application/json" in request.headers.get("Accept", "").lower()
    try:
        # User login/logout stuff
        if "logout" in request.args: return logout(useApi)
        if "login"  in request.args: return login(USERS, useApi)

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

        if request.method.lower() == "put":
            return handle_upload(path,ACL,root)
        
        # Send/stream files or directory listing
        return serveFiles_page(path,ACL,root,folder_size,useApi)
  
    except Exception as e: return error(e,error_file,useApi)



@app.route("/", methods=["GET","POST"])
def index():
    useApi = "application/json" in request.headers.get("Accept", "").lower()
    try:
        # User login/logout stuff
        if "logout" in request.args: return logout(useApi)
        if "login"  in request.args: return login(USERS, useApi)

        # Check if static page is requested
        if "static" in request.args:
            path = request.args["static"]
            path = safe_path(path,sroot)
            if not isfile(path): raise FileNotFoundError
            return send_file( path, cache=True )

        return serveRoot_page(ACL,root,folder_size,useApi)

    except Exception as e: return error(e,error_file,useApi)


if __name__=="__main__": app.run(host="127.0.0.1", port=8000, debug=False)


