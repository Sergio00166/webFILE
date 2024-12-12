# Web Server with custom video and audio player #

THIS BRANCH IS AN EXPERIMENTAL VERSION FOR USER BASED ACLs
WITH ITS OWN MANAGER AND SCRIPTING LANGUAGE FOR MANAGING ITS ACL

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
    
