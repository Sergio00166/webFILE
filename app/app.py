#Code by Sergio00166

from init import *

# Define data
http_methods = [
    "GET","PUT","POST",
    "DELETE","MKCOL",
    "COPY","MOVE"
]
method_map = {
    "DELETE": delfile,
    "MOVE":   move,
    "COPY":   copy,
    "MKCOL":  mkdir,
    "PUT":    handle_upload
}

# Main endpoint for file serve or dir listing
@app.route('/', methods=["GET","POST"], defaults={'path': ''})
@app.route("/<path:path>", methods=http_methods)
def explorer(path):
    useApi = "application/json" in request.headers.get("Accept", "").lower()
    try:
        if "logout" in request.args: return logout(useApi)
        if "login"  in request.args: return login(USERS, useApi)

        if request.method in method_map:
            return method_map[request.method](path,ACL,root,error_file)

        return serveFiles_page(path,ACL,root,folder_size,useApi)

    except Exception as e:
        return error(e,error_file,useApi)


# Using all methods avoiding explorer intercept them
@app.route("/static", defaults={'path': ''}, methods=http_methods)
@app.route("/static/<path:path>", methods=http_methods)
def static_files(path):
    try:
        if request.method not in ["HEAD", "GET"] or not path:
            raise PermissionError
    
        path = safe_path(path,sroot)
        if not isfile(path): raise PermissionError
        return send_file( path, cache=True )

    except Exception as e:
        return error(e,error_file,False)



# Run internal server for testing
if __name__=="__main__":
    app.run(host="127.0.0.1", port=8000, debug=False)


