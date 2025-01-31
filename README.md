# Web Server with custom video and audio player #

## For what this is ##
This web server facilitates file sharing via a web browser, allowing users to stream videos, music, and other file types.    
It supports file uploads, creation, and deletion, all managed under a single "write" permission group. Access control is
handled through ACLs (Access Control Lists), enabling administrators to set permissions for each resource.
Users can be granted or denied read-only access, write permissions (upload, create, delete), or complete access restriction to specific resources.       

## To manage the ACLs ##
 In the scripts folder execute the acl_mgr.py,  
 The default user for permissions is DEFAULT (if not logged in).    
 The basic syntax is explained in the README in that folder

## Requirements: ##
 Install all requirements with
 ```pip install -r requirements.txt```    
 Optional for the video player: ```ffmpeg``` (as system package)

## Extra: ##
The app/extra directory serves as the storage location for several key 
files used by the acl_mgr.py script and the application, including:
   - ACL and User Database   (JSON).
   - File extension Database (JSON).
   - Local Storage Database.
   - Server error log file.
   - A compressed library (PySubs2).

## To run the web server: ##
   **To use multi-worker change in app/init.py the app.secret_key to a fixed one to share sessions across workers**    
   **If using a reverse proxy ensure that POST buffering is disabled, in NGINX is proxy_request_buffering off;**     
   
  - To run via flask internal HTTP server via CLI (in the /scripts folder)    
    ```python3 run.py -b IP_addr -p port -d directory [--dirsize]```

  - To use a WSGI for deployment -> (for example gunicorn)    
    ```gunicorn --env FOLDER=directory [--env SHOWSIZE=True] -b IP_addr app:app```
    
