#Code by Sergio00166

from init import *

method_map = {
    "DELETE": delfile,
    "MOVE":   move,
    "COPY":   copy,
    "MKCOL":  mkdir,
    "PUT":    handle_upload
}

@app.route("/<path:path>", methods=["GET","POST","DELETE","MKCOL","COPY","MOVE","PUT"])
def explorer(path):
    path = path.removesuffix("/")
    useApi = "application/json" in request.headers.get("Accept", "").lower()
    try:
        if "logout" in request.args: return logout(useApi)
        if "login" in request.args:  return login(USERS, useApi)

        if request.method in method_map:
            return method_map[request.method](path,ACL,root,error_file)

        return serveFiles_page(path,ACL,root,folder_size,useApi)

    except Exception as e:
        return error(e,error_file,useApi)


@app.route("/", methods=["GET","POST"])
def index():
    useApi = "application/json" in request.headers.get("Accept", "").lower()
    try:
        if "logout" in request.args: return logout(useApi)
        if "login" in request.args:  return login(USERS, useApi)

        if "static" in request.args:
            path = request.args["static"]
            path = safe_path(path,sroot)

            if not isfile(path): raise FileNotFoundError
            return send_file( path, cache=True )

        return serveRoot_page(ACL,root,folder_size,useApi)

    except Exception as e:
        return error(e,error_file,useApi)


if __name__=="__main__": app.run(host="127.0.0.1", port=8000, debug=False)

 