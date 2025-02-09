# Web Server with custom video and audio player #

## For what this is ##
This web server facilitates file sharing via a web browser, allowing users to stream videos, music, and other file types.    
It supports file uploads, creation, and deletion, all managed under a single "write" permission group. Access control is
handled through ACLs (Access Control Lists), enabling administrators to set permissions for each resource.
Users can be granted or denied read-only access, write permissions (upload, create, delete), or complete access restriction to specific resources.    

## Multimedia (video) ##
 - SSA/ASS subtitles support by using JASSUB on the client    
 - Convert SSA in a safe way to webVTT, to do it hold the settings button
 - All video/audio codecs supported by the browser (this server does not use transcoding)
 - Ability to change audio track (enable experimental web platform features)
 - Recommended to use mkv for videos, firefox wont play it, I will work in a fix to address that issue

## Requirements: ##
 Install all requirements with
 ```pip install -r requirements.txt```    
 Optional for the video player: ```ffmpeg``` (as system package)

## Config ##
The following environment variables are used to configure the server:

  - SERVE_PATH (required): Specifies the directory that will be served.
  - ERRLOG_FILE: Defines the file where server error logs will be stored.
  - ACL_FILE: Specifies the file that contains the Access Control List (ACL) rules.
  - USERS_FILE: Determines the file where user account data is stored.
  - SESSIONS_DB: Defines the file used for storing session-related data.
  - SHOW_DIRSIZE (optional, default: False): If set to True, the server will display the total size of directories.

## To run the web server: ##
   **To use multi-worker change in app/init.py the app.secret_key to a fixed one to share sessions across workers**    
   **If using a reverse proxy ensure that POST buffering is disabled, in NGINX is proxy_request_buffering off;**     
   
  - To run via flask internal HTTP server via CLI (will run in localhost and port 8000)    
    ```python3 app.py```

  - To use a WSGI for deployment -> (for example gunicorn)    
    ```gunicorn -b IP_addr app:app```

------------------------------------------------------------------------------------------------------------------

# Command Syntax Documentation for aclmgr.py

## ALLOW
**Syntax:**
```
ALLOW 'username' TO READ|DOALL ON 'resource'|ALL;
```
Assigns permissions for a user to a specific resource or all resources.

---

## REJECT
**Syntax:**
```
REJECT 'username' ON 'resource'|ALL;
```
Denies permissions for a user on a specific resource or all resources.

---

## DROP
**Syntax:**
```
DROP 'username' FROM 'resource'|ALL;
```
Removes a user from the access control list for a specific resource or all resources.

---

## GET-ACL
**Syntax:**
```
GET-ACL [FOR 'resource'];
```
Retrieves the access control list for a specific resource if specified, else shows all.

---

## ADD-USER
**Syntax:**
```
ADD-USER 'username' PWD 'password';
```
Adds a new user with the specified password.

---

## DEL-USER
**Syntax:**
```
DEL-USER 'username';
```
Deletes a specified user.

---

## GET-USERS
**Syntax:**
```
GET-USERS;
```
Lists all registered users.

---

## COMMIT
**Syntax:**
```
COMMIT;
```
Commits changes made to the system.

---

## FLUSH
**Syntax:**
```
FLUSH ACL|USERS|ALL;
```
Clears the users/ACL database or both.

---

## SOURCE
**Syntax:**
```
SOURCE 'script_path';
```
Executes a script from the specified path.    
I recommend to use the extension .aqs (Acl Query Script)

---

## GET-ENTRIES
**Syntax:**
```
GET-ENTRIES;
```
Retrieves all entries from the access control system.

---

## DEL-ENTRY
**Syntax:**
```
DEL-ENTRY 'resource';
```
Deletes an ACL entry.

---

## ADD-DF-USR
**Syntax:**
```
ADD-DF-USR;
```
Adds the default user for the system.

---

## EXIT
**Syntax:**
```
EXIT;
```
Terminates the application.

---

## CLEAR
**Syntax:**
```
CLEAR;
```
Clears the terminal display.
