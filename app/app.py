#Code by Sergio00166

from init import *
last_acl_check = 0

method_map = {
    "MOVE":   move,
    "COPY":   copy,
    "MKCOL":  mkdir,
    "DELETE": delfile,
    "PUT":    handle_upload
}

@app.before_request
def check4acl_change():
    global last_acl_check
    # Check only each 2 seconds
    if (now := time()) - last_acl_check < 2: return
    last_acl_check = now

    mtimes = [getmtime(users_file), getmtime(acl_file)]
    if mtimes > datafiles_mtime:
        try:
            load_userACL(USERS, ACL, users_file, acl_file)
            datafiles_mtime[:] = mtimes
        except: pass


# Main endpoint for file serve or dir listing
explorer_methods = list(method_map.keys()) + ["GET"]
@app.route('/', defaults={'path': ''}, methods=["GET"])
@app.route("/<path:path>", methods=explorer_methods)
def explorer(path):
    try:
        if request.method in method_map:
            return method_map[request.method](path, ACL, root, error_file)

        return path_handler(path, ACL, root, folder_size)

    except Exception as e:
        return error(e, error_file)


# It must use all methods as it path overlaps with the main one
srv_methods = list(method_map.keys()) + ["GET", "POST"]
@app.route("/srv", defaults={'path': ''}, methods=srv_methods)
@app.route("/srv/<path:path>",            methods=srv_methods)
def internal(path):
    try:
        match path.removesuffix("/"):
            case "logout":  return logout()
            case "login":   return login(USERS)
            case "console": return aml_endpoint(USERS, ACL, users_file, acl_file)
            case _:         raise  PermissionError

    except Exception as e:
        return error(e, error_file)


# Serve all static files
@app.route("/srv/static/<path:path>", methods=["GET"])
def static(path):
    try:
        path = safe_path(path, sroot)
        if not isfile(path): raise PermissionError

        encoding = request.headers.get("Accept-Encoding", "").lower()
        if "br" in encoding and isfile(path + ".br"): path = path + ".br"

        response_headers = {"Cache-Control": "public, max-age=36000"}
        return send_file(path, headers=response_headers)

    except Exception as e:
        return error(e, error_file)


# Run internal server for testing
if __name__=="__main__":
    app.run(host="127.0.0.1", port=8000, debug=False)

 