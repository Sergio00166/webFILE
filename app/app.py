#Code by Sergio00166

from init import *


@app.route('/<path:path>', methods=['GET','POST'])
def explorer(path):
    client = getclient(request)
    try:
        # User login/logout stuff
        if "logout" in request.args: return logout()
        if "login" in request.args:  return login(USERS)

        # Paths must not end on slash
        if path.endswith("/"): path = path[:-1]
        
        # Files management stuff for users
        if set(request.args) & set(
            ["add","upfile","updir","mkdir"]):
            return add_page(request.args,dps,path,ACL,root)

        if "delete" in request.args:
            return delfile(path,ACL,root)

        if "mvcp" in request.args:
            return move_copy(path,ACL,root)
    
        return serveFiles_page(path,ACL,root,client,folder_size)
  
    except Exception as e: return error(e,client)



@app.route('/', methods=['GET','POST'])
def index():
    client = getclient(request)
    try:
        # User login/logout stuff
        if "logout" in request.args: return logout()
        if "login"  in request.args: return login(USERS)

        # Files management stuff for users
        if set(request.args) & set(
            ["add","upfile","updir","mkdir"]):
            return add_page(request.args,dps,"",ACL,root)

        # Check if static page is requested
        if "static" in request.args:
            path = request.args["static"]
            return send_file( safe_path(path,sroot),cache=True )

        return serveRoot_page(ACL,root,client,folder_size)

    except Exception as e: return error(e,client)

