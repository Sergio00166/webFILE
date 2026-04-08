#Code by Sergio00166

from init import *
last_acl_check = 0

http_methods = (
    "GET", "PUT", "POST",
    "MKCOL", "DELETE",
    "COPY", "MOVE"
)
method_map = {
    "DELETE": delfile,
    "MOVE":   move,
    "COPY":   copy,
    "MKCOL":  mkdir,
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
@app.route('/', methods=("GET","POST"), defaults={'path': ''})
@app.route("/<path:path>", methods=http_methods)
def explorer(path):
    try:
        if request.method in method_map:
            return method_map[request.method](path, ACL, root, error_file)

        if not request.method in ("GET", "HEAD"): return "", 405
        return path_handler(path, ACL, root, folder_size)

    except Exception as e:
        return error(e, error_file)


@app.route("/srv/static/<path:path>", methods=["GET", "HEAD"])
def static(path):
    try:
        path = safe_path(path, sroot)
        if not isfile(path): raise PermissionError
        return send_file( path, cache=True)

    except Exception as e:
        return error(e, error_file)


@app.route("/srv", defaults={'path': ''}, methods=http_methods)
@app.route("/srv/<path:path>", methods=http_methods)
def internal(path):
    try:
        path = path.removesuffix("/")
        if path == "login":   return login(USERS)
        if path == "logout":  return logout()
        if path == "console": return console(USERS)
        if path == "aml":     return aml_endpoint(USERS, ACL, users_file, acl_file)
        raise PermissionError

    except Exception as e:
        return error(e, error_file)



# Run internal server for testing
if __name__=="__main__":
    app.run(host="127.0.0.1", port=8000, debug=False)

 