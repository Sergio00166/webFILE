# Web Server with custom video and audio player #

## For what this is ##
This web server facilitates file sharing via a web browser, allowing users to stream videos, music, and other file types.    
It supports file uploads, creation, and deletion, all managed under a single "write" permission group. Access control is
handled through ACLs (Access Control Lists), enabling administrators to set permissions for each resource.
Users can be granted or denied read-only access, write permissions (upload, create, delete), or complete access restriction to specific resources.       
That support of upload and delete data is in beta, if unsure dont set write permissions for better security.    
The move/copy/rename option is still not available    
***Its usage is not intended for production eviorments***

## To manage the ACLs ##
 In the scripts folder execute the acl_mgr.py,  
 The default user for permissions is DEFAULT (if not logged in).    
 The basic syntax is explained in the README in that folder

## Requirements: ##
 Install all requirements with
 ```pip install -r requirements.txt```    
 Optional for video streaming: ```ffmpeg``` (as system package)


## To run the web server: ##
  - To run via flask internal HTTP server via CLI (in the /scripts folder)
    ```python3 run.py -b IP_addr -p port -d directory [--dirsize]```
  - Or with with multiple workers (in the /scripts folder)
    ```python3 start.py [config_file]```

  - To use a WSGI for deployment -> (for example gunicorn)
    ```gunicorn --env FOLDER=directory [--env SHOWSIZE=True] -b IP_addr app:app```
    
